import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import esbuild from 'esbuild';

async function loadModules() {
  const outDir = path.resolve('tests/.tmp-edge');
  await fs.mkdir(outDir, { recursive: true });
  await esbuild.build({
    entryPoints: [
      path.resolve('src/data/austinCoffeePlan.ts'),
      path.resolve('src/data/presets.ts'),
      path.resolve('src/utils/validators.ts'),
      path.resolve('src/utils/exporters.ts'),
      path.resolve('src/utils/zip.ts'),
    ],
    outdir: outDir,
    bundle: true,
    format: 'esm',
    platform: 'node',
    outExtension: { '.js': '.mjs' },
  });

  const planMod = await import(pathToFileURL(path.join(outDir, 'data/austinCoffeePlan.mjs')).href);
  const presetsMod = await import(pathToFileURL(path.join(outDir, 'data/presets.mjs')).href);
  const valMod = await import(pathToFileURL(path.join(outDir, 'utils/validators.mjs')).href);
  const expMod = await import(pathToFileURL(path.join(outDir, 'utils/exporters.mjs')).href);
  const zipMod = await import(pathToFileURL(path.join(outDir, 'utils/zip.mjs')).href);
  return { ...planMod, ...presetsMod, ...valMod, ...expMod, ...zipMod, outDir };
}

test('Validators, tone diagnostics, PII guard, CSV round-trip, and HTML export work cleanly', async () => {
  const {
    DEFAULT_GTM_PLAN,
    PLAN_PRESETS,
    countWords,
    isOpenerUnderLimit,
    analyzeOpenerQuality,
    detectPotentialPii,
    createDefaultOpenersForLead,
    isValidGtmPlanState,
    toSafeHttpUrl,
    formatStudioEmail,
    generateCadenceTouches,
    runMissionReadinessAudit,
    buildShowcaseSubmissionText,
    buildLeadsCsv,
    buildTrackerActivityCsv,
    parseClayCsvToLeads,
    buildOnePagePlanMarkdown,
    buildOnePagePlanHtml,
    buildPresentationHtml,
    buildActionPlaybookMarkdown,
    createZipUint8Array,
    computeCrc32,
    outDir,
  } = await loadModules();

  try {
    // 1. Word count limits
    const sixtyWords = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
    assert.equal(countWords(sixtyWords), 60);
    assert.equal(isOpenerUnderLimit(sixtyWords), false);

    const fiftyNineWords = Array.from({ length: 59 }, (_, i) => `word${i}`).join(' ');
    assert.equal(isOpenerUnderLimit(fiftyNineWords), true);

    // 2. Tone & personalization diagnostics
    const hypeDiag = analyzeOpenerQuality(
      'Sugarwolf will get a guaranteed 10x skyrocket boost!!',
      DEFAULT_GTM_PLAN.leads[0],
    );
    assert.equal(hypeDiag.hasHypeLanguage, true);
    assert.ok(hypeDiag.warnings.length >= 1);

    const fakeDiag = analyzeOpenerQuality(
      'Following up per our call for Sugarwolf today.',
      DEFAULT_GTM_PLAN.leads[0],
    );
    assert.equal(fakeDiag.hasFalseFamiliarity, true);

    // All 6 default openers pass tone checks cleanly
    for (const lead of DEFAULT_GTM_PLAN.leads.filter((l) => l.status === 'top3')) {
      const diagA = analyzeOpenerQuality(lead.openers.angleAFactFirst, lead);
      const diagB = analyzeOpenerQuality(lead.openers.angleBValueFirst, lead);
      assert.deepEqual(diagA.warnings, [], `${lead.name} Angle A warnings: ${diagA.warnings}`);
      assert.deepEqual(diagB.warnings, [], `${lead.name} Angle B warnings: ${diagB.warnings}`);
    }

    // 3. PII detector catches phone numbers & personal webmails
    assert.ok(detectPotentialPii('Call me at 512-555-0199').length > 0);
    assert.ok(detectPotentialPii('Email john.doe@gmail.com').length > 0);
    assert.ok(detectPotentialPii('Email founder@proton.me').length > 0);
    assert.ok(detectPotentialPii('Email user@outlook.com').length > 0);
    assert.equal(detectPotentialPii('Reach out via hello@sugarwolfbakery.com').length, 0);

    // 4. Readiness audit catches >500 showcase description and bad Top 3 count
    const brokenPlan = structuredClone(DEFAULT_GTM_PLAN);
    brokenPlan.showcase.description = 'x'.repeat(505);
    brokenPlan.leads[0].status = 'watchlist';
    const audit = runMissionReadinessAudit(brokenPlan);
    assert.equal(audit.find((a) => a.id === 'showcase-description')?.passed, false);
    assert.equal(audit.find((a) => a.id === 'top3-verified-facts')?.passed, false);

    // 5. Showcase submission kit
    const kit = buildShowcaseSubmissionText(DEFAULT_GTM_PLAN);
    assert.match(kit, /Handshake Showcase Submission Kit/);
    assert.match(kit, /\/ 500 characters/);
    assert.match(kit, /Try Hard Coffee Roasters/);

    // 6. CSV export + BOM round-trip parse
    const csv = buildLeadsCsv(DEFAULT_GTM_PLAN.leads);
    const lines = csv.split(/\r?\n/);
    assert.equal(lines.length, 21); // header + 20 leads
    const roundTripped = parseClayCsvToLeads('\uFEFF' + csv);
    assert.equal(roundTripped.length, 20);
    assert.equal(roundTripped[0].name, 'Sugarwolf Bakery & Coffee Bar');
    assert.equal(roundTripped[0].domain, 'sugarwolfbakery.com');

    // 7. HTML export escapes unsafe HTML while keeping full one-page structure
    const xssPlan = structuredClone(DEFAULT_GTM_PLAN);
    xssPlan.offer.projectName = 'Test <script>alert(1)</script> Studio';
    const html = buildOnePagePlanHtml(xssPlan);
    assert.equal(html.includes('<script>alert(1)</script>'), false);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /The offer/);
    assert.match(html, /What I’ll watch/);

    // 8. Side-hustle presets structure & opener limits
    assert.equal(PLAN_PRESETS.length, 4);
    assert.deepEqual(
      PLAN_PRESETS.filter((p) => p.isWebVerified).map((p) => p.id),
      ['austin-web-ai'],
    );
    for (const preset of PLAN_PRESETS) {
      const state = preset.buildState();
      assert.equal(state.leads.length, 20, `${preset.id} must include 20 leads`);
      const uniqueIds = new Set(state.leads.map((l) => l.id));
      assert.equal(uniqueIds.size, 20, `${preset.id} must have 20 unique lead IDs`);
      const top3 = state.leads.filter((l) => l.status === 'top3');
      assert.equal(top3.length, 3, `${preset.id} must have 3 Top Picks`);
      for (const lead of top3) {
        assert.ok(lead.openers, `${preset.id}:${lead.name} missing openers`);
        assert.ok(
          isOpenerUnderLimit(lead.openers.angleAFactFirst),
          `${preset.id}:${lead.name} Angle A must be < 60 words`,
        );
        assert.ok(
          isOpenerUnderLimit(lead.openers.angleBValueFirst),
          `${preset.id}:${lead.name} Angle B must be < 60 words`,
        );
      }
      if (preset.id === 'austin-web-ai') {
        const presetAudit = runMissionReadinessAudit(state);
        assert.equal(presetAudit.every((item) => item.passed), true);
      }
    }

    // 9. Operator action playbook generation
    const playbook = buildActionPlaybookMarkdown(DEFAULT_GTM_PLAN);
    assert.match(playbook, /GTM Action Assignments & Execution Playbook/);
    assert.match(playbook, /Task 1: Setup & Clay Lead Mining/);
    assert.match(playbook, /Task 3: Outreach #1 — Sugarwolf Bakery & Coffee Bar/);
    assert.match(playbook, /Task 4: Outreach #2 — Rockman Coffee \+ Bakeshop/);
    assert.match(playbook, /Task 5: Outreach #3 — Desnudo Coffee/);
    assert.match(playbook, /Task 7: Log Metrics & Submit Handshake Showcase/);
    assert.match(playbook, /hello@sugarwolfbakery\.com/);
    assert.match(playbook, /hello@rockmanatx\.com/);
    assert.match(playbook, /484 \/ 500 chars/);

    // 10. Clean HTML formatting & Top-3 source link verification
    const defaultHtml = buildOnePagePlanHtml(DEFAULT_GTM_PLAN);
    assert.match(defaultHtml, /austinfoodmagazine\.com/);
    assert.match(defaultHtml, /communityimpact\.com/);
    assert.equal(defaultHtml.includes('undefined'), false);
    assert.equal(defaultHtml.includes('NaN'), false);

    // 11. Pure TypeScript PKZip archive generator
    const testFiles = [
      { filename: 'README.txt', content: 'Alder & Code Studio GTM Deliverables' },
      { filename: 'data.csv', content: 'name,rank\nSugarwolf,1\n' },
    ];
    const zipBytes = createZipUint8Array(testFiles);
    assert.ok(zipBytes instanceof Uint8Array);
    assert.ok(zipBytes.length > 100);

    // Verify PKZip Local File Header Signature: 0x04034b50 (little endian: 0x50, 0x4B, 0x03, 0x04)
    assert.equal(zipBytes[0], 0x50);
    assert.equal(zipBytes[1], 0x4b);
    assert.equal(zipBytes[2], 0x03);
    assert.equal(zipBytes[3], 0x04);

    // Verify filenames exist in binary stream
    const zipString = Buffer.from(zipBytes).toString('binary');
    assert.ok(zipString.includes('README.txt'));
    assert.ok(zipString.includes('data.csv'));
    assert.ok(zipString.includes('Alder & Code Studio'));

    // Verify End of Central Directory Signature: 0x06054b50
    const eocdSig = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
    assert.ok(zipString.includes(eocdSig.toString('binary')));

    // Verify standard CRC-32
    const asciiBytes = new TextEncoder().encode('123456789');
    assert.equal(computeCrc32(asciiBytes), 0xcbf43926);

    // 12. Standalone HTML presentation deck exporter & XSS safety
    const presHtml = buildPresentationHtml(DEFAULT_GTM_PLAN);
    assert.match(presHtml, /Executive Presentation Deck/);
    assert.match(presHtml, /Slide 1 of 6/);
    assert.match(presHtml, /sugarwolfbakery\.com/);
    assert.match(presHtml, /communityimpact\.com/);
    assert.equal(presHtml.includes('undefined'), false);
    assert.equal(presHtml.includes('NaN'), false);

    const xssPresPlan = structuredClone(DEFAULT_GTM_PLAN);
    xssPresPlan.offer.projectName = 'Hack <img src=x onerror=alert(1)> Deck';
    const xssDeck = buildPresentationHtml(xssPresPlan);
    assert.equal(xssDeck.includes('<img src=x onerror=alert(1)>'), false);
    assert.match(xssDeck, /&lt;img src=x onerror=alert\(1\)&gt;/);

    // 13. Parenthesized US phone formats and additional webmail domains in PII guard
    const parenPhoneWarnings = detectPotentialPii('Call me at (512) 555-0199 before noon.');
    assert.ok(parenPhoneWarnings.some((w) => w.toLowerCase().includes('phone')));
    const msnWarnings = detectPotentialPii('Reach me at test@msn.com anytime.');
    assert.ok(msnWarnings.some((w) => w.toLowerCase().includes('email')));

    // 14. CSV round-trip preserves lead statuses & fit/cut reasons
    const exportedCsv = buildLeadsCsv(DEFAULT_GTM_PLAN.leads);
    const roundTripLeads = parseClayCsvToLeads(exportedCsv);
    const rtTop3 = roundTripLeads.filter((l) => l.status === 'top3');
    const rtCuts = roundTripLeads.filter((l) => l.status === 'cut');
    assert.equal(roundTripLeads.length, DEFAULT_GTM_PLAN.leads.length);
    assert.equal(rtTop3.length, 3);
    assert.equal(rtCuts.length, 6);
    const origCutByName = new Map(
      DEFAULT_GTM_PLAN.leads.filter((l) => l.status === 'cut').map((l) => [l.name, l]),
    );
    for (const rtCut of rtCuts) {
      const orig = origCutByName.get(rtCut.name);
      assert.ok(orig, `Expected original cut lead for ${rtCut.name}`);
      assert.ok(orig.cutReason && orig.cutReason.length > 5, `Expected non-empty cutReason for ${rtCut.name}`);
      assert.equal(rtCut.cutReason, orig.cutReason);
    }

    // 15. Presentation HTML handles 0 top3 leads cleanly without undefined or NaN
    const noTop3Plan = structuredClone(DEFAULT_GTM_PLAN);
    noTop3Plan.leads = noTop3Plan.leads.map((l) => ({ ...l, status: 'watchlist' }));
    const fallbackDeck = buildPresentationHtml(noTop3Plan);
    assert.match(fallbackDeck, /Executive Presentation Deck/);
    assert.equal(fallbackDeck.includes('undefined'), false);
    assert.equal(fallbackDeck.includes('NaN'), false);

    // 16. All presets export cleanly across Markdown, HTML one-pager, CSV, and Presentation HTML
    for (const preset of PLAN_PRESETS) {
      const presetPlan = preset.buildState();
      const mdOut = buildOnePagePlanMarkdown(presetPlan, true);
      const htmlOut = buildOnePagePlanHtml(presetPlan);
      const deckOut = buildPresentationHtml(presetPlan);
      const csvOut = buildLeadsCsv(presetPlan.leads);
      const escapedProjectName = presetPlan.offer.projectName.replace(/&/g, '&amp;');
      assert.ok(mdOut.includes(presetPlan.offer.projectName), `Missing projectName in MD for ${preset.id}`);
      assert.ok(htmlOut.includes(escapedProjectName), `Missing escaped projectName in HTML for ${preset.id}`);
      assert.ok(deckOut.includes('Slide 6') && deckOut.includes(escapedProjectName), `Missing Slide 6 / projectName in deck for ${preset.id}`);
      assert.equal(deckOut.includes('undefined'), false, `Unexpected undefined in deck for ${preset.id}`);
      assert.equal(deckOut.includes('NaN'), false, `Unexpected NaN in deck for ${preset.id}`);
      assert.ok(parseClayCsvToLeads(csvOut).length === presetPlan.leads.length, `CSV count mismatch for ${preset.id}`);
    }

    // 17. Dynamic opener synthesis adapts to any preset/lead with zero hardcoded Austin coffee copy
    const roboticsPlan = PLAN_PRESETS.find((p) => p.id === 'robotics-sponsors')?.buildState();
    assert.ok(roboticsPlan);
    const sampleRoboLead = roboticsPlan.leads[0];
    const generatedOpeners = createDefaultOpenersForLead(
      {
        name: sampleRoboLead.name,
        domain: sampleRoboLead.domain,
        neighborhood: sampleRoboLead.neighborhood,
        category: sampleRoboLead.category,
        verifiedFact: sampleRoboLead.verifiedFact,
      },
      roboticsPlan.offer,
    );
    const diagA = analyzeOpenerQuality(generatedOpeners.angleAFactFirst, sampleRoboLead);
    const diagB = analyzeOpenerQuality(generatedOpeners.angleBValueFirst, sampleRoboLead);
    assert.equal(diagA.underWordLimit, true);
    assert.equal(diagB.underWordLimit, true);
    assert.equal(diagA.hasHypeLanguage, false);
    assert.equal(diagB.hasHypeLanguage, false);
    assert.equal(diagA.hasFalseFamiliarity, false);
    assert.equal(diagB.hasFalseFamiliarity, false);
    assert.equal(diagA.mentionsCandidateOrDomain, true);
    assert.equal(diagB.mentionsCandidateOrDomain, true);
    assert.equal(/austin|cafes/i.test(generatedOpeners.angleAFactFirst), false);
    assert.equal(/austin|cafes/i.test(generatedOpeners.angleBValueFirst), false);

    // 18. Schema guard validates complete plans and rejects partial/malformed payloads
    for (const preset of PLAN_PRESETS) {
      assert.equal(isValidGtmPlanState(preset.buildState()), true, `Expected valid schema for ${preset.id}`);
    }
    assert.equal(isValidGtmPlanState(null), false);
    assert.equal(isValidGtmPlanState({ offer: DEFAULT_GTM_PLAN.offer, leads: [] }), false);
    const missingClaySpec = structuredClone(DEFAULT_GTM_PLAN);
    delete missingClaySpec.claySpec;
    assert.equal(isValidGtmPlanState(missingClaySpec), false);
    const emptySegments = structuredClone(DEFAULT_GTM_PLAN);
    emptySegments.segments = [];
    assert.equal(isValidGtmPlanState(emptySegments), false);

    // 19. Every preset defines 3 compared segments with strictly 1 Week-1 selection
    for (const preset of PLAN_PRESETS) {
      const presetPlan = preset.buildState();
      assert.equal(presetPlan.segments.length, 3, `Expected 3 segments in ${preset.id}`);
      const selectedCount = presetPlan.segments.filter((s) => s.isSelected).length;
      assert.equal(selectedCount, 1, `Expected 1 selected segment in ${preset.id}`);
    }

    // 20. Safe HTTP URL sanitizer blocks unsafe schemes and preserves valid domains
    assert.equal(toSafeHttpUrl('javascript:alert(1)', 'sugarwolfbakery.com'), 'https://sugarwolfbakery.com');
    assert.equal(toSafeHttpUrl('data:text/html,xss', 'rockmanatx.com'), 'https://rockmanatx.com');
    assert.equal(toSafeHttpUrl('desnudocoffee.com/pages/events'), 'https://desnudocoffee.com/pages/events');
    assert.equal(toSafeHttpUrl('https://austinfoodmagazine.com/post'), 'https://austinfoodmagazine.com/post');

    // 21. CSV parser honors preset location/category defaults and sanitizes malicious URLs
    const customCsvLeads = parseClayCsvToLeads(
      'Company Name,Domain,Source URL\nAcme Robotics Lab,acmerobo.io,javascript:alert(1)',
      { neighborhood: 'Central Texas', category: 'Robotics Engineering' },
    );
    assert.equal(customCsvLeads.length, 1);
    assert.equal(customCsvLeads[0].neighborhood, 'Central Texas');
    assert.equal(customCsvLeads[0].category, 'Robotics Engineering');
    assert.equal(customCsvLeads[0].factSourceUrl, 'https://acmerobo.io');

    // 22. Dynamic markdown counts and task numbering adapt cleanly when lead/top3 counts differ
    const twoTopPlan = structuredClone(DEFAULT_GTM_PLAN);
    twoTopPlan.leads[2].status = 'watchlist';
    twoTopPlan.leads.push({
      ...structuredClone(DEFAULT_GTM_PLAN.leads[3]),
      id: 'extra-21',
      rank: 21,
      name: 'Extra Roaster 21',
    });
    const dynamicMd = buildOnePagePlanMarkdown(twoTopPlan, true);
    assert.match(dynamicMd, /## All 21 Clay Candidates & Narrowing Pass/);
    const dynamicPlaybook = buildActionPlaybookMarkdown(twoTopPlan);
    assert.match(dynamicPlaybook, /### Task 5: Deploy 2-Minute Prototype on Reply/);
    assert.match(dynamicPlaybook, /### Task 6: Log Metrics & Submit Handshake Showcase/);

    // 23. Studio sender email formatting avoids duplicate "-studio.studio"
    assert.equal(formatStudioEmail('Alder & Code Studio'), 'hello@alder-code.studio');
    assert.equal(formatStudioEmail('Kiln & Pour Ceramics'), 'hello@kiln-pour-ceramics.studio');
    assert.equal(formatStudioEmail('Studio'), 'hello@studio.studio');

    // 24. 3-Touch outreach sequence generation produces concise bumps and closeouts under 35 words
    const sugarTouches = generateCadenceTouches(DEFAULT_GTM_PLAN.leads[0], 'Alder & Code');
    assert.ok(sugarTouches.touch1Opener.length > 0);
    assert.match(sugarTouches.touch2Bump, /Sugarwolf/i);
    assert.match(sugarTouches.touch2Bump, /catering pre-order/i);
    assert.ok(sugarTouches.touch2Bump.split(/\s+/).filter(Boolean).length <= 35);
    assert.match(sugarTouches.touch3Closeout, /closing the loop/i);
    assert.ok(sugarTouches.touch3Closeout.split(/\s+/).filter(Boolean).length <= 35);

    const desnudoTouches = generateCadenceTouches(DEFAULT_GTM_PLAN.leads[2], 'Alder & Code');
    assert.match(desnudoTouches.touch2Bump, /Desnudo/i);
    assert.match(desnudoTouches.touch2Bump, /mobile beverage bar intake/i);
    assert.ok(desnudoTouches.touch2Bump.split(/\s+/).filter(Boolean).length <= 35);

    // 25. Tracker Activity CSV export produces structured tabular data for all 20 prospects
    const activityCsv = buildTrackerActivityCsv(DEFAULT_GTM_PLAN.leads);
    assert.match(
      activityCsv,
      /Rank,Company Name,Domain,Status,Contact Channel,Messages Sent,Replied,Audit Booked,Notes/,
    );
    const activityRows = activityCsv.trim().split('\n');
    assert.equal(activityRows.length, 21); // 1 header + 20 leads
    assert.match(activityRows[1], /1,Sugarwolf Bakery & Coffee Bar/);
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
});
