import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import esbuild from 'esbuild';

async function loadTsModules() {
  const outDir = path.resolve('tests/.tmp-bundle');
  await fs.mkdir(outDir, { recursive: true });
  await esbuild.build({
    entryPoints: [
      path.resolve('src/data/austinCoffeePlan.ts'),
      path.resolve('src/utils/validators.ts'),
      path.resolve('src/utils/exporters.ts'),
    ],
    outdir: outDir,
    bundle: true,
    format: 'esm',
    platform: 'node',
    outExtension: { '.js': '.mjs' },
  });

  const planMod = await import(pathToFileURL(path.join(outDir, 'data/austinCoffeePlan.mjs')).href);
  const valMod = await import(pathToFileURL(path.join(outDir, 'utils/validators.mjs')).href);
  const expMod = await import(pathToFileURL(path.join(outDir, 'utils/exporters.mjs')).href);
  return { ...planMod, ...valMod, ...expMod, outDir };
}

test('Austin Coffee & Bakery GTM plan passes all mission data invariants', async () => {
  const {
    DEFAULT_GTM_PLAN,
    countWords,
    isOpenerUnderLimit,
    getActiveOpenerText,
    analyzeOfferOneLiner,
    detectPotentialPii,
    runMissionReadinessAudit,
    buildOnePagePlanMarkdown,
    parseClayCsvToLeads,
    MAX_OPENER_WORDS,
    MAX_SHOWCASE_CHARS,
    outDir,
  } = await loadTsModules();

  try {
    // 1. Exact 20 candidates with unique ids and domains
    assert.equal(DEFAULT_GTM_PLAN.leads.length, 20);
    const ids = new Set(DEFAULT_GTM_PLAN.leads.map((l) => l.id));
    assert.equal(ids.size, 20);

    // 2. Exactly 3 Top-3 candidates, each with verified dated fact + direct https URL
    const top3 = DEFAULT_GTM_PLAN.leads.filter((l) => l.status === 'top3');
    assert.equal(top3.length, 3);
    for (const lead of top3) {
      assert.ok(lead.verifiedFact && lead.verifiedFact.length > 30, `${lead.name} missing fact`);
      assert.ok(lead.factDate && lead.factDate.length > 4, `${lead.name} missing date`);
      assert.ok(
        lead.factSourceUrl && lead.factSourceUrl.startsWith('https://'),
        `${lead.name} missing https source URL`,
      );
      assert.ok(lead.openers, `${lead.name} missing openers`);

      const wordsA = countWords(lead.openers.angleAFactFirst);
      const wordsB = countWords(lead.openers.angleBValueFirst);
      const wordsFinal = countWords(getActiveOpenerText(lead));
      assert.ok(
        isOpenerUnderLimit(lead.openers.angleAFactFirst),
        `${lead.name} Angle A has ${wordsA} words (must be < ${MAX_OPENER_WORDS})`,
      );
      assert.ok(
        isOpenerUnderLimit(lead.openers.angleBValueFirst),
        `${lead.name} Angle B has ${wordsB} words (must be < ${MAX_OPENER_WORDS})`,
      );
      assert.ok(
        wordsFinal > 0 && wordsFinal < MAX_OPENER_WORDS,
        `${lead.name} final message has ${wordsFinal} words`,
      );
    }

    // 3. Cut leads must document cutReason, and all 20 document public unknowns
    const cutLeads = DEFAULT_GTM_PLAN.leads.filter((l) => l.status === 'cut');
    assert.ok(cutLeads.length >= 4);
    for (const lead of cutLeads) {
      assert.ok(lead.cutReason && lead.cutReason.trim().length > 10);
    }
    for (const lead of DEFAULT_GTM_PLAN.leads) {
      assert.ok(lead.unknownInfo && lead.unknownInfo.trim().length > 10);
    }

    // 4. Offer specificity diagnostic scores 100%
    const offerDiag = analyzeOfferOneLiner(DEFAULT_GTM_PLAN.offer.oneLiner);
    assert.equal(offerDiag.score, 100);
    assert.equal(offerDiag.tips.length, 0);

    const vagueDiag = analyzeOfferOneLiner('Web design services');
    assert.ok(vagueDiag.score < 100);
    assert.ok(vagueDiag.tips.length >= 2);

    // 5. Showcase description strictly <= 500 chars and free of personal PII
    const descLen = DEFAULT_GTM_PLAN.showcase.description.trim().length;
    assert.ok(descLen > 100 && descLen <= MAX_SHOWCASE_CHARS, `Got length ${descLen}`);
    assert.equal(detectPotentialPii(DEFAULT_GTM_PLAN.showcase.description).length, 0);

    // 6. Full readiness audit passes 8/8 checks
    const audit = runMissionReadinessAudit(DEFAULT_GTM_PLAN);
    assert.equal(audit.length, 8);
    for (const item of audit) {
      assert.equal(item.passed, true, `Audit check failed: ${item.label} (${item.detail})`);
    }

    // 7. Markdown generator includes exact template headings
    const md = buildOnePagePlanMarkdown(DEFAULT_GTM_PLAN, true);
    assert.match(md, /GTM PLAN: Alder & Code Studio/);
    assert.match(md, /\*\*The offer:\*\*/);
    assert.match(md, /\*\*The segment:\*\*/);
    assert.match(md, /\*\*The list:\*\* 20 candidates/);
    assert.match(md, /\*\*Top three, with the fact I’d open with:\*\*/);
    assert.match(md, /\*\*What I’ll watch:\*\*/);

    // 8. Clay CSV parser handles quoted fields and promotes first 3
    const parsed = parseClayCsvToLeads(
      'Company Name,Domain,Location,Employees,Industry\n"Cafe One, Inc.",cafeone.com,"Austin, TX",1-10,Restaurants\nRoast Two,https://roasttwo.com/about,Austin TX,11-50,Retail',
    );
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].name, 'Cafe One, Inc.');
    assert.equal(parsed[0].domain, 'cafeone.com');
    assert.equal(parsed[1].domain, 'roasttwo.com');
    assert.equal(parsed[0].status, 'top3');
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
});

