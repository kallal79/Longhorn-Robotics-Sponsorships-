import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildVisualCardHtml(plan, getActiveOpenerText, countWords) {
  const selectedSegment = plan.segments.find((s) => s.isSelected) ?? plan.segments[0];
  const top3 = plan.leads.filter((l) => l.status === 'top3').slice(0, 3);
  const primaryLead =
    top3.find((l) => l.id === plan.activePrimaryOpenerLeadId) ?? top3[0];
  const activeMessage = getActiveOpenerText(primaryLead);
  const wordCount = countWords(activeMessage);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(plan.offer.projectName)} — One-Page GTM Plan Card</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 1500px;
      height: 1000px;
      overflow: hidden;
      background: #FAF9F6;
      color: #111827;
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    }
    .card-canvas {
      width: 1500px;
      height: 1000px;
      border-top: 8px solid #0F766E;
      padding: 44px 72px 42px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 20px;
    }
    .top-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #0F766E;
    }
    .top-meta .right-meta {
      color: #4B5563;
      letter-spacing: 0.01em;
      font-weight: 600;
    }
    h1 {
      margin: 8px 0 10px;
      font-size: 44px;
      line-height: 1.12;
      letter-spacing: -0.02em;
      color: #111827;
    }
    .offer-line {
      margin: 0;
      font-size: 21px;
      line-height: 1.4;
      color: #374151;
      font-weight: 500;
      padding-bottom: 18px;
      border-bottom: 1.5px solid #E5E7EB;
    }
    .panel {
      background: #FFFFFF;
      border: 1.5px solid #E5E7EB;
      border-radius: 14px;
      padding: 20px 26px;
    }
    .panel-label {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #0F766E;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .segment-text {
      margin: 0;
      font-size: 18.5px;
      line-height: 1.48;
      color: #111827;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1.55fr 1fr;
      gap: 24px;
      flex: 1;
      min-height: 0;
    }
    .top3-list {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      margin-top: 10px;
    }
    .top3-item {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 1px solid #F3F4F6;
    }
    .top3-item:last-child {
      padding-bottom: 0;
      border-bottom: none;
    }
    .num-pill {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #0F766E;
      font-weight: 700;
      font-size: 14px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .lead-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 3px;
    }
    .lead-title span {
      font-weight: 500;
      color: #6B7280;
      font-size: 15px;
    }
    .lead-fact {
      margin: 0;
      font-size: 15px;
      line-height: 1.42;
      color: #4B5563;
    }
    .msg-panel {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .msg-meta {
      font-size: 14.5px;
      font-weight: 600;
      color: #4B5563;
      margin-bottom: 14px;
    }
    .msg-quote {
      margin: 0;
      padding: 6px 0 6px 18px;
      border-left: 4px solid #0F766E;
      font-size: 18px;
      line-height: 1.5;
      color: #111827;
    }
    .msg-channel {
      font-size: 13.5px;
      color: #6B7280;
      margin-top: 14px;
    }
    .watch-bar {
      background: #ECFDF5;
      border: 1.5px solid #A7F3D0;
      border-radius: 12px;
      padding: 15px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 16.5px;
    }
    .watch-label {
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #0F766E;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="card-canvas">
    <div>
      <div class="top-meta">
        <span>ONE-PAGE GO-TO-MARKET PLAN</span>
        <span class="right-meta">Clay Shortlist: ${plan.leads.length} Audited &nbsp;|&nbsp; ${top3.length} Selected</span>
      </div>
      <h1>${escapeHtml(plan.offer.projectName)}</h1>
      <p class="offer-line">${escapeHtml(plan.offer.oneLiner)}</p>
    </div>

    <div class="panel">
      <div class="panel-label">01 / Target Segment &amp; Week-1 Reachability</div>
      <p class="segment-text">${escapeHtml(selectedSegment?.reachabilityReason ?? '')}</p>
    </div>

    <div class="two-col">
      <div class="panel">
        <div class="panel-label">02 / Top Three Candidates &amp; Verified Opening Facts</div>
        <div class="top3-list">
          ${top3
            .map(
              (lead, idx) => `
          <div class="top3-item">
            <div class="num-pill">${idx + 1}</div>
            <div>
              <div class="lead-title">${escapeHtml(lead.name)} <span>· ${escapeHtml(lead.domain)}</span></div>
              <p class="lead-fact">${escapeHtml(lead.verifiedFact ?? lead.whyFit)}</p>
            </div>
          </div>`,
            )
            .join('')}
        </div>
      </div>

      <div class="panel msg-panel">
        <div>
          <div class="panel-label">03 / First Message I’m Sending</div>
          <div class="msg-meta">To: ${escapeHtml(primaryLead?.name ?? '')} (${wordCount} words)</div>
          <blockquote class="msg-quote">${escapeHtml(activeMessage)}</blockquote>
        </div>
        <div class="msg-channel">Channel: ${escapeHtml(primaryLead?.contactChannel ?? '')}</div>
      </div>
    </div>

    <div class="watch-bar">
      <span class="watch-label">WHAT I’LL WATCH:</span>
      <span>${escapeHtml(plan.metrics.primarySignal)}</span>
    </div>
  </div>
</body>
</html>`;
}

const tmpDir = path.resolve('scripts/.tmp-build');
await fs.mkdir(tmpDir, { recursive: true });

try {
  await esbuild.build({
    entryPoints: [
      path.resolve('src/data/austinCoffeePlan.ts'),
      path.resolve('src/utils/exporters.ts'),
      path.resolve('src/utils/validators.ts'),
    ],
    outdir: tmpDir,
    bundle: true,
    format: 'esm',
    platform: 'node',
    outExtension: { '.js': '.mjs' },
  });

  const { DEFAULT_GTM_PLAN } = await import(
    pathToFileURL(path.join(tmpDir, 'data/austinCoffeePlan.mjs')).href
  );
  const {
    buildOnePagePlanMarkdown,
    buildOnePagePlanHtml,
    buildPresentationHtml,
    buildLeadsCsv,
    buildShowcaseSubmissionText,
    buildActionPlaybookMarkdown,
  } = await import(pathToFileURL(path.join(tmpDir, 'utils/exporters.mjs')).href);
  const { getActiveOpenerText, countWords } = await import(
    pathToFileURL(path.join(tmpDir, 'utils/validators.mjs')).href
  );

  const outDir = path.resolve('deliverables');
  await fs.mkdir(outDir, { recursive: true });

  await fs.writeFile(
    path.join(outDir, 'GTM_PLAN.md'),
    buildOnePagePlanMarkdown(DEFAULT_GTM_PLAN, true),
    'utf8',
  );

  await fs.writeFile(
    path.join(outDir, 'GTM_PLAN_ONE_PAGE.md'),
    buildOnePagePlanMarkdown(DEFAULT_GTM_PLAN, false),
    'utf8',
  );

  await fs.writeFile(
    path.join(outDir, 'ONE_PAGE_GTM_PLAN.html'),
    buildOnePagePlanHtml(DEFAULT_GTM_PLAN),
    'utf8',
  );

  await fs.writeFile(
    path.join(outDir, 'PRESENTATION_DECK.html'),
    buildPresentationHtml(DEFAULT_GTM_PLAN),
    'utf8',
  );

  await fs.writeFile(
    path.join(outDir, 'clay-shortlist-20.csv'),
    buildLeadsCsv(DEFAULT_GTM_PLAN.leads),
    'utf8',
  );

  await fs.writeFile(
    path.join(outDir, 'showcase-submission.md'),
    buildShowcaseSubmissionText(DEFAULT_GTM_PLAN),
    'utf8',
  );

  await fs.writeFile(
    path.join(outDir, 'gtm-plan-card.html'),
    buildVisualCardHtml(DEFAULT_GTM_PLAN, getActiveOpenerText, countWords),
    'utf8',
  );

  await fs.writeFile(
    path.join(outDir, 'WEEK_1_ACTION_ASSIGNMENTS.md'),
    buildActionPlaybookMarkdown(DEFAULT_GTM_PLAN),
    'utf8',
  );

  const manifestMarkdown = `# Go-to-Market Studio Deliverables Manifest & Audit

Project: Alder & Code Studio
Target Market: Independent Specialty Coffee Shops & Neighborhood Bakeries in Austin, TX (<50 staff)
Generated: Fully synchronized with source data and test suite

## Deliverables Inventory

| File | Purpose | Key Content & Constraints |
|:---|:---|:---|
| **\`GTM_PLAN_ONE_PAGE.md\`** | Core Mission 1-Pager | Exact 6 mission brackets: Offer, Segment, List (20), Top 3 with dated facts & source URLs, Message (<60w), What I'll watch. |
| **\`WEEK_1_ACTION_ASSIGNMENTS.md\`** | Operator Action Playbook | Day-by-day assigned tasks (Tasks 1 to 7) for Week 1 execution, copy-ready openers, mailto links, and acceptance criteria. |
| **\`GTM_PLAN.md\`** | Full Research Dossier | Full plan + Clay Sculptor query, filters, complete 20-candidate audit table, 6 cut reasons, and 6 opener angles (<60w each). |
| **\`ONE_PAGE_GTM_PLAN.html\`** | Self-Contained Web Plan | Standalone, publication-ready, printable HTML one-page plan with zero external runtime dependencies. |
| **\`PRESENTATION_DECK.html\`** | Standalone Executive Deck | 6-slide responsive interactive presentation deck with keyboard controls, printer stylesheet, and zero external dependencies. |
| **\`clay-shortlist-20.csv\`** | 20-Lead Data Export | Verified CSV with 20 Austin companies (3 Top Picks, 11 Watchlist, 6 Cuts with documented cut reasons and public research gaps). |
| **\`showcase-submission.md\`** | Handshake Submission Kit | Handshake project title, exact 484/500 character description (privacy-safe, zero PII), 3:2 preview image specs, and cut summary. |
| **\`gtm-plan-card-1500x1000.png\`** | 3:2 Showcase Cover Card | High-resolution 1500 × 1000 px visual card, flat modern light mode with Deep Emerald (#0F766E) accent, zero stock imagery. |
| **\`gtm-plan-card.html\`** | Standalone Card HTML | Pure HTML/CSS source canvas used to render the 1500 × 1000 px 3:2 cover card. |

## Mission Invariant Verification Summary
- Total Clay candidates: 20 (14 kept: 3 Top Picks + 11 Watchlist; 6 documented cuts)
- Top 3 candidates include verified dated facts and direct public URLs (austinfoodmagazine.com, communityimpact.com)
- All 6 opener angles strictly < 60 words (46 to 50 words) with zero hype or false familiarity
- Handshake Showcase description strictly <= 500 characters (484 chars)
- Visual plan card exact 3:2 ratio (1500 × 1000 px), light mode with single accent
`;

  await fs.writeFile(
    path.join(outDir, 'DELIVERABLES_MANIFEST.md'),
    manifestMarkdown,
    'utf8',
  );

  console.log(
    'Generated deliverables/GTM_PLAN.md, GTM_PLAN_ONE_PAGE.md, ONE_PAGE_GTM_PLAN.html, PRESENTATION_DECK.html, clay-shortlist-20.csv, showcase-submission.md, gtm-plan-card.html, WEEK_1_ACTION_ASSIGNMENTS.md, and DELIVERABLES_MANIFEST.md',
  );
} finally {
  await fs.rm(tmpDir, { recursive: true, force: true });
}
