import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://127.0.0.1:4173/';
const USER_DATA_DIR = path.resolve('tests/.chrome-qa-profile');
const SHOTS_DIR =
  'C:\\Users\\USER\\.gemini\\antigravity\\brain\\2a84afaa-7f6d-439b-ae06-5799038d9456\\scratch\\qa-shots';

await fs.mkdir(USER_DATA_DIR, { recursive: true });
await fs.mkdir(SHOTS_DIR, { recursive: true });

const chrome = spawn(
  CHROME_PATH,
  [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9225',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--window-size=1440,960',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function waitForDevTools(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9225/json/list');
      const pages = await res.json();
      const page = pages.find((p) => p.type === 'page') ?? pages[0];
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Wait for Chrome CDP socket
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Timed out waiting for Chrome DevTools endpoint on 9225');
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.consoleErrors = [];
    this.pageErrors = [];
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        this.consoleErrors.push(JSON.stringify(msg.params.args));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(msg.params?.exceptionDetails?.text ?? 'Unknown exception');
      }
    });
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async screenshot(filename) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(path.join(SHOTS_DIR, filename), Buffer.from(data, 'base64'));
  }

  close() {
    this.ws.close();
  }
}

async function setInputValue(cdp, selector, value) {
  await cdp.eval(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error('Missing selector: ' + ${JSON.stringify(selector)});
    const proto =
      el.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : el.tagName === 'SELECT'
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
}

try {
  const wsUrl = await waitForDevTools();
  const cdp = new CdpClient(wsUrl);
  await cdp.ready();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 960,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await cdp.send('Page.navigate', { url: APP_URL });
  await new Promise((r) => setTimeout(r, 1500));

  // Clear localStorage & reset cleanly first
  await cdp.eval(`localStorage.clear()`);
  await cdp.send('Page.reload');
  await new Promise((r) => setTimeout(r, 1200));

  // 1. One-Page Plan tab & Rockman/Sugarwolf switch
  const tab1Data = await cdp.eval(`(() => {
    const pill = document.querySelector('[data-testid="readiness-pill"]')?.textContent?.trim();
    const h2 = document.querySelector('.one-page-sheet h2')?.textContent?.trim();
    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    const hasHtmlBtn = document.body.innerText.includes('Download 1-Page HTML');
    return { pill, h2, overflow, hasHtmlBtn };
  })()`);
  assert.match(tab1Data.pill, /8\/8\s*Mission Checks/);
  assert.equal(tab1Data.overflow, false);
  assert.equal(tab1Data.hasHtmlBtn, true);

  await cdp.eval(`Array.from(document.querySelectorAll('.one-page-row button')).find(b => b.textContent.includes('Rockman'))?.click()`);
  const switchedToRockman = await cdp.eval(
    `document.querySelector('.one-page-sheet blockquote')?.textContent || ''`,
  );
  assert.match(switchedToRockman, /Rockman|West Gate/);
  await cdp.eval(`Array.from(document.querySelectorAll('.one-page-row button')).find(b => b.textContent.includes('Sugarwolf'))?.click()`);
  const funnelTileCount = await cdp.eval(`document.querySelectorAll('.funnel-strip .funnel-tile').length`);
  assert.equal(funnelTileCount, 5, 'Expected 5 funnel tiles on One-Page Plan tab');
  const hasTab1Zip = await cdp.eval(`Boolean(document.querySelector('[data-testid="tab1-zip-btn"]'))`);
  assert.equal(hasTab1Zip, true, 'Expected Tab 1 ZIP bundle button');
  await cdp.screenshot('01-one-page-plan.png');

  // 1b. Executive Deck Presentation Modal & ZIP bundle button check
  const hasZipBtn = await cdp.eval(`Boolean(document.querySelector('[data-testid="header-zip-btn"]'))`);
  assert.equal(hasZipBtn, true, 'Expected ZIP bundle button in header');

  await cdp.eval(`document.querySelector('[data-testid="header-present-btn"]')?.click()`);
  await new Promise((r) => setTimeout(r, 200));
  const slideText1 = await cdp.eval(`document.querySelector('.presentation-panel')?.textContent || ''`);
  assert.match(slideText1, /Slide 1 of 6/);
  assert.match(slideText1, /Executive Overview/);
  await cdp.eval(`Array.from(document.querySelectorAll('.presentation-footer button')).find(b => b.textContent.includes('Next'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  const slideText2 = await cdp.eval(`document.querySelector('.presentation-panel')?.textContent || ''`);
  assert.match(slideText2, /Slide 2 of 6/);
  await cdp.screenshot('09-presentation-modal.png');
  await cdp.eval(`document.querySelector('button[aria-label="Exit presentation mode"]')?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(await cdp.eval(`document.querySelector('.presentation-backdrop') === null`), true);

  // Deliverables Hub Modal check
  await cdp.eval(`Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('Deliverables Hub'))?.click()`);
  await new Promise((r) => setTimeout(r, 200));
  const deliverablesModalText = await cdp.eval(`document.querySelector('[role="dialog"]')?.textContent || ''`);
  assert.match(deliverablesModalText, /Export & Submission Hub|All 9 Deliverables/);
  assert.match(deliverablesModalText, /Download ZIP Bundle/);
  await cdp.screenshot('09b-deliverables-hub.png');
  await cdp.eval(`document.querySelector('button[aria-label="Close Deliverables Hub"]')?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(await cdp.eval(`document.querySelector('[role="dialog"]') === null`), true);

  // Verify clicking Clay funnel tile jumps to Tab 3, then return to Tab 1
  await cdp.eval(`Array.from(document.querySelectorAll('.funnel-strip .funnel-tile')).find(t => t.textContent.includes('Phase II'))?.click()`);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(await cdp.eval(`document.querySelectorAll('table.leads-table tbody tr').length`), 20);
  await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('1. One-Page'))?.click()`);
  await new Promise((r) => setTimeout(r, 250));

  // Verify clicking Playbook funnel tile jumps to Tab 6, then return to Tab 1
  await cdp.eval(`Array.from(document.querySelectorAll('.funnel-strip .funnel-tile')).find(t => t.textContent.includes('Playbook'))?.click()`);
  await new Promise((r) => setTimeout(r, 250));
  const hasPlaybook = await cdp.eval(`Boolean(document.querySelector('[data-testid="playbook-progress-badge"]'))`);
  assert.equal(hasPlaybook, true, 'Expected Playbook section in Tab 6');
  await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('1. One-Page'))?.click()`);
  await new Promise((r) => setTimeout(r, 200));

  // 2. Offer & Segments interactive test
  await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('2. Offer'))?.click()`);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(await cdp.eval(`document.body.innerText.includes('Specificity: 100%')`), true);
  assert.equal(await cdp.eval(`/Offer Pressure-Test Criteria/i.test(document.body.innerText)`), true);
  assert.equal(await cdp.eval(`Boolean(Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Copy One-Liner')))`), true);
  await setInputValue(cdp, '#combined-oneliner-input', 'Web design services');
  await new Promise((r) => setTimeout(r, 150));
  const loweredPill = await cdp.eval(
    `document.querySelector('[data-testid="readiness-pill"]')?.textContent?.trim()`,
  );
  assert.match(loweredPill, /7\/8\s*Mission Checks/);
  await cdp.eval(`Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('Reset'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('2. Offer'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  await cdp.screenshot('02-offer-segments.png');
  const matrixData = await cdp.eval(`(() => {
    const heading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Week-1 Segment & Channel Comparison Matrix'));
    heading?.scrollIntoView({ behavior: 'instant', block: 'center' });
    const rows = document.querySelectorAll('table tbody tr').length;
    return { hasHeading: Boolean(heading), rows };
  })()`);
  assert.equal(matrixData.hasHeading, true, 'Expected Week-1 Segment & Channel Comparison Matrix');
  assert.equal(matrixData.rows, 3, 'Expected 3 segment rows in comparison matrix');
  await new Promise((r) => setTimeout(r, 150));
  await cdp.screenshot('02b-segment-matrix.png');

  // 3. Clay 20 Leads interactive filter + search + chip add/remove
  await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('3. Clay'))?.click()`);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(await cdp.eval(`document.querySelectorAll('table.leads-table tbody tr').length`), 20);
  const marketPoolCheck = await cdp.eval(`(() => ({
    hasMarketPool: document.body.innerText.includes('Market Pool:'),
    hasDirectEmail: document.body.innerText.includes('5 Direct Email Inbox'),
    hasTightness: document.body.innerText.includes('Filter Tightness: 100%')
  }))()`);
  assert.equal(marketPoolCheck.hasMarketPool, true, 'Expected Market Pool summary bar');
  assert.equal(marketPoolCheck.hasDirectEmail, true, 'Expected 5 Direct Email Inbox pill');
  assert.equal(marketPoolCheck.hasTightness, true, 'Expected live Filter Tightness: 100%');

  // 3a. Inspect Lead Detail Modal check
  const inspectBtn = await cdp.eval(`Boolean(document.querySelector('[data-testid^="inspect-lead-"]'))`);
  assert.equal(inspectBtn, true, 'Expected Inspect lead buttons in Clay table');
  await cdp.eval(`document.querySelector('[data-testid^="inspect-lead-"]')?.click()`);
  await new Promise((r) => setTimeout(r, 200));
  const leadModalText = await cdp.eval(`document.querySelector('[role="dialog"]')?.textContent || ''`);
  assert.match(leadModalText, /Sugarwolf|Rank #1/);
  assert.match(leadModalText, /Triage Status/);
  assert.match(leadModalText, /Angle A/);
  await cdp.screenshot('10-lead-detail-modal.png');
  await cdp.eval(`document.querySelector('button[aria-label="Close prospect profile"]')?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(await cdp.eval(`document.querySelector('[role="dialog"]') === null`), true);
  await cdp.eval(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cut (6)'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(await cdp.eval(`document.querySelectorAll('table.leads-table tbody tr').length`), 6);

  await cdp.eval(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('All (20)'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  await setInputValue(cdp, 'input[type="search"]', 'Desnudo');
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(await cdp.eval(`document.querySelectorAll('table.leads-table tbody tr').length`), 1);
  await setInputValue(cdp, 'input[type="search"]', 'NonExistentQueryXYZ');
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(await cdp.eval(`document.body.innerText.includes('Clear Search & Filters')`), true);
  await cdp.eval(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Clear Search & Filters'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(await cdp.eval(`document.querySelectorAll('table.leads-table tbody tr').length`), 20);
  assert.equal(await cdp.eval(`Boolean(Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Copy JSON')))`), true);

  // 3b. Direct Email quick-filter toggle & Column sorting check
  await cdp.eval(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Direct Email (5)'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(await cdp.eval(`document.querySelectorAll('table.leads-table tbody tr').length`), 5);
  await cdp.eval(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Direct Email (5)'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(await cdp.eval(`document.querySelectorAll('table.leads-table tbody tr').length`), 20);

  // Column sort toggle by rank
  await cdp.eval(`Array.from(document.querySelectorAll('table.leads-table th')).find(th => th.textContent.includes('#'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  const firstRankDesc = await cdp.eval(`document.querySelector('table.leads-table tbody tr td.mono')?.textContent?.trim()`);
  assert.equal(firstRankDesc, '20');
  await cdp.eval(`Array.from(document.querySelectorAll('table.leads-table th')).find(th => th.textContent.includes('#'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  const firstRankAsc = await cdp.eval(`document.querySelector('table.leads-table tbody tr td.mono')?.textContent?.trim()`);
  assert.equal(firstRankAsc, '1');

  const tableFitsDesktop = await cdp.eval(`(() => {
    const wrap = document.querySelector('.table-wrap');
    return wrap ? wrap.scrollWidth <= wrap.clientWidth + 2 : false;
  })()`);
  assert.equal(tableFitsDesktop, true, 'Clay table overflows horizontally inside .table-wrap');
  await cdp.screenshot('03-clay-20-leads.png');

  // 4. Top-3 Outreach interactive test
  await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('4. Top-3'))?.click()`);
  await new Promise((r) => setTimeout(r, 200));
  const outreachInfo = await cdp.eval(`({
    cards: document.querySelectorAll('main section.card').length,
    tooLongCount: (document.body.innerText.match(/Too Long/g) || []).length,
    hasDraftEmail: document.body.innerText.includes('Draft Email'),
    overflow: document.documentElement.scrollWidth > window.innerWidth
  })`);
  assert.equal(outreachInfo.cards, 3);
  assert.equal(outreachInfo.tooLongCount, 0);
  assert.equal(outreachInfo.hasDraftEmail, true);
  assert.equal(outreachInfo.overflow, false);

  // 4a-1. 3-Touch Sequence Cadence & Gmail Web Launcher check
  const hasGmailWeb = await cdp.eval(`Boolean(Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Gmail Web')))`);
  assert.equal(hasGmailWeb, true, 'Expected Gmail Web button in Outreach candidate');
  await cdp.eval(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Touch 2 · Day 3 Bump'))?.click()`);
  await new Promise((r) => setTimeout(r, 100));
  const bumpMsgText = await cdp.eval(`document.body.innerText.includes('Touch 2 · Day 3 Quick Bump')`);
  assert.equal(bumpMsgText, true, 'Expected Touch 2 bump message box');
  await cdp.eval(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Touch 1 · Verified Opener'))?.click()`);
  await new Promise((r) => setTimeout(r, 100));

  // 4a. Subject Line variants & Live Phone Preview
  const subjectBtnCount = await cdp.eval(`document.querySelectorAll('.subject-btn').length`);
  assert.equal(subjectBtnCount, 9, 'Expected 9 tested subject line buttons across 3 candidates');
  await cdp.eval(`Array.from(document.querySelectorAll('.subject-btn'))[1]?.click()`);
  await new Promise((r) => setTimeout(r, 100));
  await cdp.eval(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Phone Preview'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  const hasPhonePreview = await cdp.eval(`Boolean(document.querySelector('.mobile-preview-frame'))`);
  assert.equal(hasPhonePreview, true, 'Expected mobile email preview frame');
  const phoneHeaderText = await cdp.eval(`document.querySelector('.mobile-preview-header')?.textContent || ''`);
  assert.match(phoneHeaderText, /hello@alder-code\.studio/);
  assert.equal(phoneHeaderText.includes('.studio.studio'), false, 'Expected no duplicate .studio.studio');
  await cdp.eval(`document.querySelector('.mobile-preview-frame')?.scrollIntoView({ behavior: 'instant', block: 'center' })`);
  await new Promise((r) => setTimeout(r, 100));
  await cdp.screenshot('04b-mobile-email-preview.png');
  await cdp.eval(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Hide Phone'))?.click()`);
  await new Promise((r) => setTimeout(r, 100));
  await cdp.eval(`window.scrollTo({ top: 0, behavior: 'instant' })`);
  await new Promise((r) => setTimeout(r, 100));

  await cdp.screenshot('04-top3-outreach.png');

  // 4b. Log Sent (+1) integration check
  const initialLogBtnText = await cdp.eval(`document.querySelector('[data-testid^="log-sent-"]')?.textContent?.trim() || ''`);
  assert.match(initialLogBtnText, /Log Sent \(0\)/);
  await cdp.eval(`document.querySelector('[data-testid^="log-sent-"]')?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  const updatedLogBtnText = await cdp.eval(`document.querySelector('[data-testid^="log-sent-"]')?.textContent?.trim() || ''`);
  assert.match(updatedLogBtnText, /Log Sent \(1\)/);

  // 4c. Prospect 2-Min Intake Prototype modal check
  await cdp.eval(`Array.from(document.querySelectorAll('main section.card button')).find(b => b.textContent.includes('Preview 2-Min Prototype'))?.click()`);
  await new Promise((r) => setTimeout(r, 200));
  const modalTitle = await cdp.eval(`document.querySelector('[role="dialog"]')?.textContent || ''`);
  assert.match(modalTitle, /Sugarwolf Bakery & Coffee Bar — Automated Intake Demo/);
  await setInputValue(cdp, '#proto-guests', '60');
  await new Promise((r) => setTimeout(r, 150));
  const updatedModalText = await cdp.eval(`document.querySelector('[role="dialog"]')?.textContent || ''`);
  assert.match(updatedModalText, /60 guests/);
  await cdp.screenshot('08-prototype-modal.png');
  await cdp.eval(`document.querySelector('button[aria-label="Close prototype"]')?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(await cdp.eval(`document.querySelector('[role="dialog"]') === null`), true);

  // 4d. Switch preset to Robotics Sponsorships and verify non-hospitality modal labels, then switch back
  await setInputValue(cdp, 'select[aria-label="Switch side hustle preset"]', 'robotics-sponsors');
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(await cdp.eval(`document.body.innerText.includes('Longhorn Robotics Sponsorships')`), true);
  await cdp.eval(`Array.from(document.querySelectorAll('main section.card button')).find(b => b.textContent.includes('Preview 2-Min Prototype'))?.click()`);
  await new Promise((r) => setTimeout(r, 200));
  const roboModalText = await cdp.eval(`document.querySelector('[role="dialog"]')?.textContent || ''`);
  assert.match(roboModalText, /Target Schedule \/ Lead Time/);
  assert.match(roboModalText, /Custom Scope \/ Requirements Notes/);
  await cdp.eval(`document.querySelector('button[aria-label="Close prototype"]')?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  await setInputValue(cdp, 'select[aria-label="Switch side hustle preset"]', 'austin-web-ai');
  await new Promise((r) => setTimeout(r, 200));

  // 5. 3:2 Card & Showcase interactive test
  await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('5. 3:2 Card'))?.click()`);
  await new Promise((r) => setTimeout(r, 300));
  const showcaseInfo = await cdp.eval(`(() => {
    const canvas = document.querySelector('canvas');
    const charBadge = document.querySelector('[data-testid="showcase-char-count"]')?.textContent?.trim();
    const ctx = canvas?.getContext('2d');
    const pixel = ctx?.getImageData(100, 120, 1, 1)?.data;
    return {
      width: canvas?.width,
      height: canvas?.height,
      charBadge,
      hasPaintedCanvas: Boolean(pixel && (pixel[0] !== 0 || pixel[1] !== 0 || pixel[2] !== 0)),
      dataUrlLen: canvas?.toDataURL('image/png')?.length ?? 0,
      overflow: document.documentElement.scrollWidth > window.innerWidth
    };
  })()`);
  assert.equal(showcaseInfo.width, 1500);
  assert.equal(showcaseInfo.height, 1000);
  assert.equal(showcaseInfo.hasPaintedCanvas, true);
  assert.ok(showcaseInfo.dataUrlLen > 10000);
  assert.match(showcaseInfo.charBadge, /484 \/ 500/);
  assert.equal(showcaseInfo.overflow, false);
  const hasCopyCanvas = await cdp.eval(`Boolean(document.querySelector('[data-testid="copy-canvas-btn"]'))`);
  assert.equal(hasCopyCanvas, true, 'Expected Copy Canvas button in Tab 5');
  await cdp.eval(`document.querySelector('[data-testid="copy-canvas-btn"]')?.click()`);
  await new Promise((r) => setTimeout(r, 100));
  await cdp.screenshot('05-showcase-card.png');

  // 5b. Accent swatch switcher test -> Royal Cobalt (#1D4ED8) then Reset back to Deep Emerald (#0F766E)
  await cdp.eval(`Array.from(document.querySelectorAll('.accent-swatch')).find(b => b.textContent.includes('Royal Cobalt'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  const cobaltHex = await cdp.eval(`getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toUpperCase()`);
  assert.equal(cobaltHex, '#1D4ED8');
  await cdp.eval(`Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('Reset'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  const restoredHex = await cdp.eval(`getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toUpperCase()`);
  assert.equal(restoredHex, '#0F766E');

  // 5c. Preset switcher test -> mugs-coffee-shops & robotics-sponsors -> verify non-coffee mockup & funnel -> Reset back to austin-web-ai
  await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('1. One-Page'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  await setInputValue(cdp, 'select[aria-label="Switch side hustle preset"]', 'mugs-coffee-shops');
  await new Promise((r) => setTimeout(r, 200));
  const templateWarning = await cdp.eval(`document.body.innerText.includes('Starter Template Active')`);
  assert.equal(templateWarning, true, 'Expected Starter Template Active banner for mugs-coffee-shops');

  await setInputValue(cdp, 'select[aria-label="Switch side hustle preset"]', 'robotics-sponsors');
  await new Promise((r) => setTimeout(r, 200));
  await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('4. Top-3'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  await cdp.eval(`Array.from(document.querySelectorAll('main section.card button')).find(b => b.textContent.includes('Preview 2-Min Prototype'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  const roboticsProtoText = await cdp.eval(`document.querySelector('[role="dialog"]')?.textContent || ''`);
  assert.match(roboticsProtoText, /units/);
  await cdp.eval(`document.querySelector('button[aria-label="Close prototype"]')?.click()`);
  await new Promise((r) => setTimeout(r, 100));
  await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('6. Tracker'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  const hasFunnelTargetBanner = await cdp.eval(`document.body.innerText.includes('Projected Week-1 Funnel Target:')`);
  assert.equal(hasFunnelTargetBanner, true, 'Expected dynamic Projected Week-1 Funnel Target on non-intake preset');

  await cdp.eval(`Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('Reset'))?.click()`);
  await new Promise((r) => setTimeout(r, 200));
  const restoredPillAfterPreset = await cdp.eval(`document.querySelector('[data-testid="readiness-pill"]')?.textContent?.trim()`);
  assert.match(restoredPillAfterPreset, /8\/8\s*Mission Checks/);
  const restoredPresetVal = await cdp.eval(`document.querySelector('select[aria-label="Switch side hustle preset"]')?.value`);
  assert.equal(restoredPresetVal, 'austin-web-ai');

  // 6. Tracker & Audit interactive test (increment Sent & toggle Replied + Audit Booked, then Reset)
  await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('6. Tracker'))?.click()`);
  await new Promise((r) => setTimeout(r, 200));
  await setInputValue(cdp, 'input[aria-label="Messages sent to Sugarwolf Bakery & Coffee Bar"]', '2');
  await cdp.eval(`document.querySelector('input[aria-label="Replied status for Sugarwolf Bakery & Coffee Bar"]')?.click()`);
  await cdp.eval(`document.querySelector('input[aria-label="Audit booked status for Sugarwolf Bakery & Coffee Bar"]')?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  const liveKpiUpdated = await cdp.eval(`(() => {
    const values = Array.from(document.querySelectorAll('.stat-value')).map(el => el.textContent.trim());
    return values;
  })()`);
  assert.deepEqual(liveKpiUpdated, ['2 / 10', '5.0', '1 / 2']);
  await cdp.eval(`Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('Reset'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));
  await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('6. Tracker'))?.click()`);
  await new Promise((r) => setTimeout(r, 150));

  // 6b. Operator Playbook checklist test
  const initialPlaybookBadge = await cdp.eval(`document.querySelector('[data-testid="playbook-progress-badge"]')?.textContent?.trim()`);
  assert.match(initialPlaybookBadge, /0 \/ 7 Completed/);
  await cdp.eval(`document.querySelector('input#playbook-task-clay')?.click()`);
  await new Promise((r) => setTimeout(r, 100));
  const updatedPlaybookBadge = await cdp.eval(`document.querySelector('[data-testid="playbook-progress-badge"]')?.textContent?.trim()`);
  assert.match(updatedPlaybookBadge, /1 \/ 7 Completed/);
  await cdp.eval(`document.querySelector('input#playbook-task-clay')?.click()`);
  await new Promise((r) => setTimeout(r, 100));

  // 6c. Check All Done & Reset Playbook buttons test
  await cdp.eval(`document.querySelector('[data-testid="playbook-check-all-btn"]')?.click()`);
  await new Promise((r) => setTimeout(r, 100));
  const allDoneBadge = await cdp.eval(`document.querySelector('[data-testid="playbook-progress-badge"]')?.textContent?.trim()`);
  assert.match(allDoneBadge, /7 \/ 7 Completed \(100%\)/);

  await cdp.eval(`document.querySelector('[data-testid="playbook-reset-btn"]')?.click()`);
  await new Promise((r) => setTimeout(r, 100));
  const resetBadge = await cdp.eval(`document.querySelector('[data-testid="playbook-progress-badge"]')?.textContent?.trim()`);
  assert.match(resetBadge, /0 \/ 7 Completed \(0%\)/);

  await cdp.screenshot('06-tracker-audit.png');
  await cdp.eval(`Array.from(document.querySelectorAll('section.card')).find(c => c.textContent.includes('Assigned Operator Playbook'))?.scrollIntoView({ behavior: 'instant' })`);
  await new Promise((r) => setTimeout(r, 150));
  const playbookSectionText = await cdp.eval(`Array.from(document.querySelectorAll('section.card')).find(c => c.textContent.includes('Assigned Operator Playbook'))?.textContent || ''`);
  assert.equal(playbookSectionText.includes('))'), false, 'Expected no double closing parentheses in Playbook');

  // 6d. Conversion Funnel & Activity CSV Export checks
  const hasExportActivityBtn = await cdp.eval(`Boolean(Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Export Activity CSV')))`);
  assert.equal(hasExportActivityBtn, true, 'Expected Export Activity CSV button');
  const hasConversionFunnel = await cdp.eval(`document.body.innerText.includes('Outreach Conversion Funnel & Revenue Projections')`);
  assert.equal(hasConversionFunnel, true, 'Expected Outreach Conversion Funnel section');
  const hasPipelineEconomics = await cdp.eval(`/Commercial Pipeline Value/i.test(document.body.innerText)`);
  assert.equal(hasPipelineEconomics, true, 'Expected Commercial Pipeline Value summary');

  await cdp.screenshot('06b-playbook-checklist.png');

  // 7. Tablet (768x1024) & Mobile (390x844) responsiveness checks across all 6 tabs
  const allTabsForViewportCheck = [
    '2. Offer',
    '3. Clay',
    '4. Top-3',
    '5. 3:2 Card',
    '6. Tracker',
    '1. One-Page',
  ];
  for (const vp of [
    { name: 'tablet', width: 768, height: 1024, dpr: 1, mobile: false },
    { name: 'mobile', width: 390, height: 844, dpr: 2, mobile: false },
  ]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.dpr,
      mobile: vp.mobile,
      screenWidth: vp.width,
      screenHeight: vp.height,
    });
    for (const tabLabel of allTabsForViewportCheck) {
      await cdp.eval(`Array.from(document.querySelectorAll('[role="tab"]')).find(t => t.textContent.includes('${tabLabel}'))?.click()`);
      await new Promise((r) => setTimeout(r, 150));
      const overflowCheck = await cdp.eval(`(() => {
        const iw = window.innerWidth;
        const sw = document.documentElement.scrollWidth;
        const offenders = sw > iw
          ? Array.from(document.querySelectorAll('*'))
              .map(el => ({ tag: el.tagName, cls: String(el.className || ''), r: Math.round(el.getBoundingClientRect().right), w: Math.round(el.getBoundingClientRect().width) }))
              .filter(x => x.w > 0 && x.r > iw + 1)
              .slice(0, 8)
          : [];
        return { scrollWidth: sw, innerWidth: iw, hasOverflow: sw > iw, offenders };
      })()`);
      assert.equal(
        overflowCheck.innerWidth,
        vp.width,
        `${vp.name} expected innerWidth ${vp.width} on tab ${tabLabel}, got ${overflowCheck.innerWidth}`
      );
      assert.equal(
        overflowCheck.hasOverflow,
        false,
        `${vp.name} viewport horizontal overflow on tab ${tabLabel}: ${overflowCheck.scrollWidth} > ${overflowCheck.innerWidth} (${JSON.stringify(overflowCheck.offenders)})`
      );
    }
  }
  await cdp.screenshot('07-mobile-one-page.png');

  // 7b. Verify Executive Presentation Modal also fits cleanly on 390px mobile without overflow
  await cdp.eval(`document.querySelector('[data-testid="header-present-btn"]')?.click()`);
  await new Promise((r) => setTimeout(r, 180));
  const mobileModalOverflow = await cdp.eval(`document.documentElement.scrollWidth > window.innerWidth`);
  assert.equal(mobileModalOverflow, false, 'Mobile presentation modal caused horizontal overflow');
  await cdp.eval(`document.querySelector('button[aria-label="Exit presentation mode"]')?.click()`);
  await new Promise((r) => setTimeout(r, 120));

  assert.equal(cdp.consoleErrors.length, 0, `Console errors: ${cdp.consoleErrors.join('; ')}`);
  assert.equal(cdp.pageErrors.length, 0, `Page errors: ${cdp.pageErrors.join('; ')}`);

  console.log(
    'LIVE_QA_PASSED',
    JSON.stringify({
      tab1Data,
      tableFitsDesktop,
      outreachInfo,
      showcaseInfo,
      liveKpiUpdated,
      consoleErrors: cdp.consoleErrors.length,
      pageErrors: cdp.pageErrors.length,
    }),
  );

  cdp.close();
} finally {
  try {
    chrome.kill('SIGKILL');
  } catch {}
  await new Promise((r) => setTimeout(r, 800));
  try {
    await fs.rm(USER_DATA_DIR, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch {
    // Windows file locks on CrashpadMetrics-active.pma are transient; ignore on cleanup
  }
}
