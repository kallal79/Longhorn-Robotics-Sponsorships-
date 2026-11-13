import { GtmPlanState, LeadCandidate } from '../types/gtm';
import { countWords, getActiveOpenerText, toSafeHttpUrl } from './validators';

function escapeHtml(text: string | undefined): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeCsvCell(value: string | number | undefined): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildLeadsCsv(leads: LeadCandidate[]): string {
  const headers = [
    'Rank',
    'Company Name',
    'Domain',
    'Website URL',
    'Neighborhood',
    'Category',
    'Estimated Employees',
    'Contact Channel',
    'Status',
    'Fit or Cut Reason',
    'Publicly Unknown',
    'Verified Fact',
    'Fact Date',
    'Fact Source URL',
  ];

  const rows = leads.map((lead) =>
    [
      lead.rank,
      lead.name,
      lead.domain,
      lead.websiteUrl,
      lead.neighborhood,
      lead.category,
      lead.estimatedEmployees,
      lead.contactChannel,
      lead.status.toUpperCase(),
      lead.status === 'cut' ? lead.cutReason ?? lead.whyFit : lead.whyFit,
      lead.unknownInfo,
      lead.verifiedFact ?? '',
      lead.factDate ?? '',
      lead.factSourceUrl ?? '',
    ]
      .map(escapeCsvCell)
      .join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}

export function buildTrackerActivityCsv(leads: LeadCandidate[]): string {
  const headers = [
    'Rank',
    'Company Name',
    'Domain',
    'Status',
    'Contact Channel',
    'Messages Sent',
    'Replied',
    'Audit Booked',
    'Notes',
  ];

  const rows = leads.map((lead) => {
    const tr = lead.outreachTracker ?? {
      sentCount: 0,
      replied: false,
      auditBooked: false,
      notes: '',
    };
    return [
      lead.rank,
      lead.name,
      lead.domain,
      lead.status.toUpperCase(),
      lead.contactChannel,
      tr.sentCount,
      tr.replied ? 'YES' : 'NO',
      tr.auditBooked ? 'YES' : 'NO',
      tr.notes,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function buildOnePagePlanHtml(plan: GtmPlanState): string {
  const selectedSegment = plan.segments.find((s) => s.isSelected) ?? plan.segments[0];
  const top3 = plan.leads.filter((l) => l.status === 'top3').slice(0, 3);
  const cutCount = plan.leads.filter((l) => l.status === 'cut').length;
  const primaryLead =
    top3.find((l) => l.id === plan.activePrimaryOpenerLeadId) ?? top3[0];
  const activeMessage = getActiveOpenerText(primaryLead);
  const accent = plan.offer.accentColor || '#0F766E';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GTM PLAN: ${escapeHtml(plan.offer.projectName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 36px 20px;
      background: #FAF9F6;
      color: #111827;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.55;
    }
    .sheet {
      max-width: 820px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-top: 6px solid ${escapeHtml(accent)};
      border-radius: 14px;
      padding: 34px 38px;
    }
    .eyebrow {
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${escapeHtml(accent)};
    }
    h1 { margin: 4px 0 18px; font-size: 28px; letter-spacing: -0.02em; }
    .row { padding: 14px 0; border-top: 1px solid #E5E7EB; }
    .key {
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${escapeHtml(accent)};
      margin-bottom: 5px;
    }
    p { margin: 0; font-size: 15px; }
    ol { margin: 6px 0 0; padding-left: 20px; }
    li { margin-bottom: 8px; font-size: 14.5px; }
    blockquote {
      margin: 8px 0 0;
      padding: 12px 16px;
      border: 1px solid #E5E7EB;
      box-shadow: inset 4px 0 0 ${escapeHtml(accent)};
      background: #FAF9F6;
      border-radius: 8px;
      font-size: 15px;
    }
    code {
      background: #F3F4F6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    a { color: ${escapeHtml(accent)}; }
    @media print {
      body { background: #FFFFFF; padding: 0; }
      .sheet { border: 1px solid #D1D5DB; box-shadow: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <div class="eyebrow">One-Page Go-to-Market Plan</div>
    <h1>GTM PLAN: ${escapeHtml(plan.offer.projectName)}</h1>

    <section class="row">
      <div class="key">The offer</div>
      <p><strong>${escapeHtml(plan.offer.oneLiner)}</strong></p>
    </section>

    <section class="row">
      <div class="key">The segment</div>
      <p>${escapeHtml(selectedSegment?.reachabilityReason)}</p>
    </section>

    <section class="row">
      <div class="key">The list</div>
      <p>${plan.leads.length} candidates, found in Clay with <code>"${escapeHtml(plan.claySpec.sculptorQuery)}"</code> (${cutCount} disqualified during verification pass).</p>
    </section>

    <section class="row">
      <div class="key">Top three, with the fact I’d open with</div>
      <ol>
        ${top3
          .map(
            (lead) =>
              `<li><strong>${escapeHtml(lead.name)}</strong> (${escapeHtml(lead.domain)}): ${escapeHtml(lead.verifiedFact ?? lead.whyFit)} <a href="${escapeHtml(toSafeHttpUrl(lead.factSourceUrl ?? lead.websiteUrl, lead.domain))}" target="_blank" rel="noreferrer">[Source]</a></li>`,
          )
          .join('\n        ')}
      </ol>
    </section>

    <section class="row">
      <div class="key">The message (${escapeHtml(primaryLead?.name ?? 'Primary Pick')} · ${countWords(activeMessage)} words)</div>
      <blockquote>${escapeHtml(activeMessage)}</blockquote>
    </section>

    <section class="row">
      <div class="key">What I’ll watch</div>
      <p>${escapeHtml(plan.metrics.primarySignal)}</p>
    </section>
  </main>
</body>
</html>`;
}

export function buildOnePagePlanMarkdown(plan: GtmPlanState, includeAppendix = true): string {
  const selectedSegment = plan.segments.find((s) => s.isSelected) ?? plan.segments[0];
  const top3 = plan.leads.filter((l) => l.status === 'top3').slice(0, 3);
  const primaryLead =
    top3.find((l) => l.id === plan.activePrimaryOpenerLeadId) ?? top3[0];
  const chosenOpener = getActiveOpenerText(primaryLead);

  const coreLines = [
    `# GTM PLAN: ${plan.offer.projectName}`,
    '',
    `**The offer:** ${plan.offer.oneLiner}`,
    '',
    `**The segment:** ${selectedSegment?.reachabilityReason ?? ''}`,
    '',
    `**The list:** ${plan.leads.length} candidates, found in Clay with \`"${plan.claySpec.sculptorQuery}"\``,
    '',
    '**Top three, with the fact I’d open with:**',
    ...top3.map(
      (lead, index) =>
        `${index + 1}. **${lead.name}** (${lead.domain}) — ${lead.verifiedFact ?? ''} *(Source: ${lead.factSourceUrl ?? lead.websiteUrl})*`,
    ),
    '',
    `**The message (${primaryLead?.name ?? 'Top Pick'}):** ${chosenOpener}`,
    '',
    `**What I’ll watch:** ${plan.metrics.primarySignal}`,
  ];

  if (!includeAppendix) {
    return coreLines.join('\n');
  }

  const cutLeads = plan.leads.filter((l) => l.status === 'cut');
  const watchlistLeads = plan.leads.filter((l) => l.status === 'watchlist');

  const appendixLines = [
    '',
    '---',
    '',
    '## Clay Sculptor Filters & Verification Notes',
    `- **Location:** ${plan.claySpec.locationFilter}`,
    `- **Company Size:** ${plan.claySpec.headcountFilter}`,
    `- **Industry Neighbors:** ${plan.claySpec.industryNeighbors.join(', ')}`,
    `- **Keywords:** ${plan.claySpec.keywordsInclude.join(', ')}`,
    `- **Exclusions:** ${plan.claySpec.exclusions.join(', ')}`,
    `- **Credit Note:** ${plan.claySpec.trialNote}`,
    '',
    `## All ${plan.leads.length} Clay Candidates & Narrowing Pass`,
    '| # | Company | Domain | Neighborhood | Status | Notes / Reason Cut |',
    '|---|---------|--------|--------------|--------|--------------------|',
    ...plan.leads.map((lead) => {
      const statusLabel =
        lead.status === 'top3' ? 'TOP 3' : lead.status === 'watchlist' ? 'Watchlist' : 'CUT';
      const detail = lead.status === 'cut' ? lead.cutReason ?? lead.whyFit : lead.whyFit;
      return `| ${lead.rank} | ${lead.name} | ${lead.domain} | ${lead.neighborhood} | ${statusLabel} | ${detail.replace(/\|/g, '/')} |`;
    }),
    '',
    `## Summary of Cuts (${cutLeads.length}) & Unknowns (${watchlistLeads.length} Watchlist Kept)`,
    `- **What couldn't be verified publicly:** ${plan.metrics.whatUnknownPubliclySummary}`,
    '',
    '## Two Opener Angles (<60 Words Each) for Top 3',
    ...top3.flatMap((lead) => {
      if (!lead.openers) return [];
      return [
        `### ${lead.name} (${lead.contactChannel})`,
        `- **${lead.openers.angleALabel}** (${countWords(lead.openers.angleAFactFirst)} words): ${lead.openers.angleAFactFirst}`,
        `- **${lead.openers.angleBLabel}** (${countWords(lead.openers.angleBValueFirst)} words): ${lead.openers.angleBValueFirst}`,
        `- **Selected Opener (${lead.openers.selectedAngle}):** ${getActiveOpenerText(lead)}`,
        '',
      ];
    }),
  ];

  return [...coreLines, ...appendixLines].join('\n');
}

export function buildShowcaseSubmissionText(plan: GtmPlanState): string {
  const cutLeads = plan.leads.filter((l) => l.status === 'cut');
  return [
    '# Handshake Showcase Submission Kit',
    '',
    '## Project Title',
    plan.showcase.projectTitle,
    '',
    `## Description (${plan.showcase.description.trim().length} / 500 characters)`,
    plan.showcase.description.trim(),
    '',
    '## Preview Image Spec',
    '- Required Ratio: 3:2, at least 1200px wide',
    '- Generated Asset: deliverables/gtm-plan-card-1500x1000.png (1500 x 1000 px)',
    '',
    '## Cut Breakdown',
    ...cutLeads.map((l) => `- **${l.name}:** ${l.cutReason ?? ''}`),
  ].join('\n');
}

export function buildActionPlaybookMarkdown(plan: GtmPlanState): string {
  const top3 = plan.leads.filter((l) => l.status === 'top3').slice(0, 3);
  const cutLeads = plan.leads.filter((l) => l.status === 'cut');
  const selectedSegment = plan.segments.find((s) => s.isSelected) ?? plan.segments[0];

  return [
    `# GTM Action Assignments & Execution Playbook: ${plan.offer.projectName}`,
    '',
    `**Offer:** ${plan.offer.oneLiner}`,
    `**Target Segment:** ${selectedSegment?.name ?? ''}`,
    `**Assigned To:** Side Hustle Operator (You)`,
    `**Status:** Ready to Execute (Week 1)`,
    '',
    '---',
    '',
    '## Operator Execution Checklist (Assigned Tasks)',
    '',
    '### Task 1: Setup & Clay Lead Mining (Monday Morning)',
    `- [ ] **Query Clay Sculptor:** Go to Clay workspace -> Find leads -> Companies -> Chat (Sculptor).`,
    `  - **Sculptor Natural-Language Input:** \`${plan.claySpec.sculptorQuery}\``,
    `  - **Location Filter:** \`${plan.claySpec.locationFilter}\``,
    `  - **Company Size:** \`${plan.claySpec.headcountFilter}\``,
    `  - **Industry Neighbors:** ${plan.claySpec.industryNeighbors.join(', ')}`,
    `  - **Exclusions:** ${plan.claySpec.exclusions.join(', ')}`,
    `- [ ] Verify the table outputs ${plan.leads.length} candidates.`,
    '',
    '### Task 2: Review Cuts & Missing Data (Monday Afternoon)',
    `- [ ] Confirm the ${cutLeads.length} cut companies are removed from the outreach queue:`,
    ...cutLeads.map((l) => `  - **${l.name}**: ${l.cutReason ?? ''}`),
    `- [ ] Review documented public unknowns: ${plan.metrics.whatUnknownPubliclySummary}`,
    '',
    ...top3.map((lead, idx) => {
      const dayName =
        idx === 0
          ? 'Tuesday Morning'
          : idx === 1
            ? 'Wednesday Morning'
            : 'Thursday Morning';
      const angleAWords = countWords(lead.openers?.angleAFactFirst ?? '');
      const angleBWords = countWords(lead.openers?.angleBValueFirst ?? '');
      return [
        `### Task ${idx + 3}: Outreach #${idx + 1} — ${lead.name} (${dayName})`,
        `- [ ] **Recipient:** ${lead.contactChannel}`,
        `- [ ] **Website:** ${lead.websiteUrl}`,
        `- [ ] **Verified Dated Fact:** ${lead.verifiedFact ?? ''} (${lead.factDate ?? ''})`,
        `- [ ] **Source:** ${lead.factSourceUrl ?? ''}`,
        `- [ ] **Angle A (Fact-First, ${angleAWords} words):**`,
        `  > ${lead.openers?.angleAFactFirst ?? ''}`,
        `- [ ] **Angle B (Value-First, ${angleBWords} words):**`,
        `  > ${lead.openers?.angleBValueFirst ?? ''}`,
        `- [ ] **Selected Opener to Send:** ${getActiveOpenerText(lead)}`,
        '',
      ].join('\n');
    }),
    `### Task ${3 + top3.length}: Deploy 2-Minute Prototype on Reply (Friday)`,
    `- [ ] When any candidate responds ("Sure, send a quick mockup"):`,
    `  - Open the **2-Minute Client Prototype** modal in the GTM Studio web app (or send standalone HTML).`,
    `  - Enter their estimated guest / unit size and selected package.`,
    `  - Click **Download Prototype HTML** or copy the instant staff-ready brief to reply within 2 hours.`,
    '',
    `### Task ${4 + top3.length}: Log Metrics & Submit Handshake Showcase (Friday)`,
    `- [ ] Log messages sent, replies received, and audits booked in the Tracker tab.`,
    `- [ ] **Signal to Watch:** ${plan.metrics.primarySignal}`,
    `- [ ] **Handshake Showcase Upload:**`,
    `  - **Project Title:** \`${plan.showcase.projectTitle}\``,
    `  - **Showcase Description (${plan.showcase.description.trim().length} / 500 chars):** \`${plan.showcase.description.trim()}\``,
    `  - **Cover Image:** Upload \`deliverables/gtm-plan-card-1500x1000.png\` (1500x1000, 3:2 ratio).`,
  ].join('\n');
}

export function buildPresentationHtml(plan: GtmPlanState): string {
  const selectedSegment = plan.segments.find((s) => s.isSelected) ?? plan.segments[0];
  const top3 = plan.leads.filter((l) => l.status === 'top3').slice(0, 3);
  const cutLeads = plan.leads.filter((l) => l.status === 'cut');
  const primaryLead =
    top3.find((l) => l.id === plan.activePrimaryOpenerLeadId) ?? top3[0];
  const activeMessage = getActiveOpenerText(primaryLead);
  const accent = plan.offer.accentColor || '#0F766E';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(plan.offer.projectName)} — Executive Presentation Deck</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #0f172a;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .deck-container {
      width: min(94vw, 960px);
      min-height: 560px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      margin: 20px 0;
    }
    .deck-header {
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e5e7eb;
      background: #fafafa;
    }
    .slide-badge {
      background: ${escapeHtml(accent)}15;
      color: ${escapeHtml(accent)};
      font-weight: 700;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 999px;
      font-family: monospace;
    }
    .deck-body {
      flex: 1;
      padding: 32px 36px;
      overflow-y: auto;
    }
    .slide { display: none; }
    .slide.active { display: block; animation: fadeIn 0.2s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .eyebrow {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${escapeHtml(accent)};
      margin-bottom: 4px;
    }
    h2 { font-size: 24px; margin: 4px 0 16px; letter-spacing: -0.015em; }
    .hero-box {
      background: #faf9f6;
      border: 1px solid #e5e7eb;
      box-shadow: inset 4px 0 0 ${escapeHtml(accent)};
      padding: 16px 20px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    @media (max-width: 680px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } }
    .stat-tile {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      background: #ffffff;
    }
    .stat-val { font-size: 22px; font-weight: 800; font-family: monospace; margin-bottom: 4px; }
    .stat-lbl { font-size: 12.5px; color: #4b5563; }
    .deck-footer {
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #111827;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary { background: ${escapeHtml(accent)}; color: #ffffff; border-color: ${escapeHtml(accent)}; }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="deck-container">
    <div class="deck-header">
      <div style="display:flex; align-items:center; gap:12px;">
        <span class="slide-badge" id="slide-indicator">Slide 1 of 6</span>
        <strong style="font-size:14px;">${escapeHtml(plan.offer.projectName)} — Executive Pitch Deck</strong>
      </div>
      <button class="btn" onclick="window.print()">Print / Save PDF</button>
    </div>

    <div class="deck-body">
      <!-- Slide 1 -->
      <div class="slide active" data-index="0">
        <div class="eyebrow">Slide 1 · Executive Overview</div>
        <h2>Go-to-Market Strategy</h2>
        <div class="hero-box">
          <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:${escapeHtml(accent)}; margin-bottom:4px;">
            The Offer Formula: [What you offer] for [Who]
          </div>
          <div style="font-size:19px; font-weight:600; line-height:1.4;">${escapeHtml(plan.offer.oneLiner)}</div>
        </div>
        <div class="grid-3">
          <div class="stat-tile">
            <div class="stat-val">${plan.leads.length} Leads</div>
            <div class="stat-lbl">Sourced via Clay Sculptor AI</div>
          </div>
          <div class="stat-tile">
            <div class="stat-val">${top3.length} Selected</div>
            <div class="stat-lbl">Week-1 Top Picks with dated facts</div>
          </div>
          <div class="stat-tile">
            <div class="stat-val">${cutLeads.length} Cuts</div>
            <div class="stat-lbl">Documented closed / chain cuts</div>
          </div>
        </div>
      </div>

      <!-- Slide 2 -->
      <div class="slide" data-index="1">
        <div class="eyebrow">Slide 2 · Segment Selection</div>
        <h2>Target Customer Segment</h2>
        <div class="hero-box">
          <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:${escapeHtml(accent)}; margin-bottom:4px;">Selected Segment</div>
          <div style="font-size:17px; font-weight:700; margin-bottom:6px;">${escapeHtml(selectedSegment.name)}</div>
          <div style="font-size:14px; color:#374151; line-height:1.45;">${escapeHtml(selectedSegment.reachabilityReason)}</div>
        </div>
        <div class="grid-2">
          ${plan.segments
            .map(
              (s) => `
          <div class="stat-tile" style="${s.isSelected ? `border-color:${escapeHtml(accent)}; background:#faf9f6;` : ''}">
            <div style="font-weight:700; font-size:14px;">${escapeHtml(s.name)} ${s.isSelected ? '★ Selected' : ''}</div>
            <div style="font-size:12.5px; color:#4b5563; margin-top:4px;">Channel: ${escapeHtml(s.channelAccess)} · Speed: ${escapeHtml(s.speedToReply)}</div>
          </div>`,
            )
            .join('')}
        </div>
      </div>

      <!-- Slide 3 -->
      <div class="slide" data-index="2">
        <div class="eyebrow">Slide 3 · Clay Lead Generation</div>
        <h2>Clay Sculptor AI Query &amp; Filters</h2>
        <div class="hero-box">
          <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:${escapeHtml(accent)}; margin-bottom:4px;">Sculptor Prompt</div>
          <code style="display:block; font-size:14.5px; font-weight:600; font-family:monospace; white-space:normal; word-break:break-word;">“${escapeHtml(plan.claySpec.sculptorQuery)}”</code>
        </div>
        <div class="grid-2">
          <div class="stat-tile">
            <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:#6b7280;">Standard Filters</div>
            <div style="font-size:13.5px; margin-top:6px;">
              <strong>Location:</strong> ${escapeHtml(plan.claySpec.locationFilter)}<br/>
              <strong>Headcount:</strong> ${escapeHtml(plan.claySpec.headcountFilter)}
            </div>
          </div>
          <div class="stat-tile">
            <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:#6b7280;">Industry Neighbors &amp; Exclusions</div>
            <div style="font-size:13.5px; margin-top:6px;">
              <strong>Neighbors:</strong> ${escapeHtml(plan.claySpec.industryNeighbors.join(', '))}<br/>
              <strong>Exclusions:</strong> ${escapeHtml(plan.claySpec.exclusions.join(', '))}
            </div>
          </div>
        </div>
      </div>

      <!-- Slide 4 -->
      <div class="slide" data-index="3">
        <div class="eyebrow">Slide 4 · Top Candidates</div>
        <h2>Top 3 Candidates &amp; Dated Facts</h2>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">
          ${top3
            .map(
              (lead, idx) => `
          <div class="stat-tile">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="font-size:15px;">#${idx + 1} ${escapeHtml(lead.name)} (${escapeHtml(lead.domain)})</strong>
              <span class="slide-badge">${escapeHtml(lead.factDate ?? 'Recent')}</span>
            </div>
            <div style="font-size:13.5px; margin-top:6px; line-height:1.45;">${escapeHtml(lead.verifiedFact ?? lead.whyFit)}</div>
            ${lead.factSourceUrl ? `<div style="font-size:12px; margin-top:4px;"><a href="${escapeHtml(toSafeHttpUrl(lead.factSourceUrl, lead.domain))}" target="_blank" rel="noreferrer" style="color:${escapeHtml(accent)};">Verify Source URL →</a></div>` : ''}
          </div>`,
            )
            .join('')}
        </div>
      </div>

      <!-- Slide 5 -->
      <div class="slide" data-index="4">
        <div class="eyebrow">Slide 5 · Outreach Studio</div>
        <h2>Tested Opening Message (&lt;60 Words)</h2>
        <div class="hero-box">
          <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:${escapeHtml(accent)}; margin-bottom:4px;">
            To: ${escapeHtml(primaryLead?.name ?? 'Primary Candidate')} (${countWords(activeMessage)} words)
          </div>
          <blockquote style="margin:0; font-size:15px; font-style:normal; line-height:1.5;">“${escapeHtml(activeMessage)}”</blockquote>
          <div style="margin-top:6px; font-size:12px; color:#4b5563;">Channel: ${escapeHtml(primaryLead?.contactChannel ?? 'Direct Channel')}</div>
        </div>
        <div class="stat-tile" style="background:#faf9f6;">
          <strong>Interactive 2-Minute Prototype:</strong> Ready to deploy upon prospect reply to convert the cold conversation into a booked audit.
        </div>
      </div>

      <!-- Slide 6 -->
      <div class="slide" data-index="5">
        <div class="eyebrow">Slide 6 · Week-1 Execution</div>
        <h2>Week-1 Action Assignments &amp; KPI Target</h2>
        <div class="grid-2" style="margin-bottom:16px;">
          <div class="stat-tile">
            <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:${escapeHtml(accent)}; margin-bottom:4px;">What I’ll Watch (Signal)</div>
            <div style="font-size:14px; font-weight:600;">${escapeHtml(plan.metrics.primarySignal)}</div>
          </div>
          <div class="stat-tile">
            <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:${escapeHtml(accent)}; margin-bottom:4px;">Handshake Showcase Spec</div>
            <div style="font-size:14px; font-weight:600;">1500 × 1000 px Cover Card + ${plan.showcase.description.length}/500 chars bio</div>
          </div>
        </div>
        <div class="stat-tile">
          <strong>Week-1 Schedule:</strong> Mon: Clay Sculptor setup &amp; cut verification → Tue: ${escapeHtml(top3[0]?.name ?? 'Candidate #1')} → Wed: ${escapeHtml(top3[1]?.name ?? 'Candidate #2')} → Thu: ${escapeHtml(top3[2]?.name ?? 'Candidate #3')} → Fri: Log signal &amp; submit Handshake Showcase.
        </div>
      </div>
    </div>

    <div class="deck-footer">
      <span style="font-size:12px; color:#6b7280;">Use ← and → arrow keys to navigate · 6 slides total</span>
      <div style="display:flex; gap:8px;">
        <button class="btn" id="prev-btn" onclick="prevSlide()" disabled>← Previous</button>
        <button class="btn btn-primary" id="next-btn" onclick="nextSlide()">Next →</button>
      </div>
    </div>
  </div>

  <script>
    let current = 0;
    const slides = document.querySelectorAll('.slide');
    const total = slides.length;
    const indicator = document.getElementById('slide-indicator');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    function showSlide(idx) {
      slides.forEach((s, i) => {
        s.classList.toggle('active', i === idx);
      });
      indicator.textContent = 'Slide ' + (idx + 1) + ' of ' + total;
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === total - 1;
      current = idx;
    }

    function nextSlide() { if (current < total - 1) showSlide(current + 1); }
    function prevSlide() { if (current > 0) showSlide(current - 1); }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });
  </script>
</body>
</html>`;
}

export function parseClayCsvToLeads(
  csvText: string,
  defaults?: { neighborhood?: string; category?: string },
): LeadCandidate[] {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitRow(lines[0]).map((h) => h.toLowerCase());
  const findCol = (patterns: string[]): number =>
    headers.findIndex((h) => patterns.some((p) => h.includes(p)));

  const nameIdx = findCol(['company', 'name']);
  const domainIdx = findCol(['domain', 'website', 'url']);
  const locationIdx = findCol(['location', 'city', 'address', 'neighborhood']);
  const sizeIdx = findCol(['size', 'employee', 'headcount']);
  const categoryIdx = findCol(['industry', 'category']);
  const statusIdx = findCol(['status']);
  const reasonIdx = findCol(['fit', 'cut', 'reason']);
  const unknownIdx = findCol(['unknown', 'missing']);
  const channelIdx = findCol(['channel', 'contact', 'email']);
  const factIdx = findCol(['verified fact', 'fact']);
  const sourceIdx = findCol(['source url', 'source']);

  return lines.slice(1, 26).map((row, idx) => {
    const cols = splitRow(row);
    const rawName = (nameIdx >= 0 ? cols[nameIdx] : cols[0]) || `Imported Lead ${idx + 1}`;
    const rawDomain = (domainIdx >= 0 ? cols[domainIdx] : cols[1]) || 'example.com';
    const cleanDomain = rawDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const websiteUrl = toSafeHttpUrl(rawDomain, cleanDomain);

    const rawStatus = (statusIdx >= 0 ? cols[statusIdx] : '').toLowerCase();
    const status: LeadCandidate['status'] =
      rawStatus === 'top3' || rawStatus === 'watchlist' || rawStatus === 'cut'
        ? rawStatus
        : idx < 3
          ? 'top3'
          : 'watchlist';
    const rawReason = reasonIdx >= 0 ? cols[reasonIdx] : '';

    const defaultLoc = defaults?.neighborhood?.trim() || 'Austin, TX';
    const defaultCat = defaults?.category?.trim() || 'Food & Beverage';

    return {
      id: `imported-${idx + 1}-${cleanDomain.replace(/[^a-z0-9]/gi, '')}`,
      rank: idx + 1,
      name: rawName,
      domain: cleanDomain,
      websiteUrl,
      neighborhood: (locationIdx >= 0 ? cols[locationIdx] : '') || defaultLoc,
      address: (locationIdx >= 0 ? cols[locationIdx] : '') || defaultLoc,
      category: (categoryIdx >= 0 ? cols[categoryIdx] : '') || defaultCat,
      estimatedEmployees: (sizeIdx >= 0 ? cols[sizeIdx] : '') || '1–50',
      contactChannel: (channelIdx >= 0 && cols[channelIdx]) || `Website contact form (${cleanDomain})`,
      status,
      cutReason: status === 'cut' ? rawReason || 'Cut during Clay verification pass.' : undefined,
      unknownInfo:
        (unknownIdx >= 0 && cols[unknownIdx]) ||
        'Verify direct owner email and recent news before outreach.',
      whyFit: rawReason || 'Imported from Clay CSV export.',
      verifiedFact:
        (factIdx >= 0 && cols[factIdx]) ||
        (status === 'top3' ? `Verify current 2025/2026 announcement on ${cleanDomain}.` : undefined),
      factDate: status === 'top3' ? 'Pending verification' : undefined,
      factSourceUrl:
        sourceIdx >= 0 && cols[sourceIdx]
          ? toSafeHttpUrl(cols[sourceIdx], cleanDomain)
          : status === 'top3'
            ? websiteUrl
            : undefined,
    };
  });
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines) break;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length === maxLines && words.length > 0) {
    const joinedWords = lines.join(' ').split(/\s+/).length;
    if (joinedWords < words.length) {
      let last = lines[maxLines - 1];
      while (last.length > 3 && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1).trimEnd();
      }
      lines[maxLines - 1] = `${last}…`;
    }
  }

  return lines;
}

function fitSingleLineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  const clean = text.trim();
  if (!clean || ctx.measureText(clean).width <= maxWidth) return clean;
  let clipped = clean;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1).trimEnd();
  }
  return `${clipped}…`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return `rgba(15, 118, 110, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Renders a crisp 1500x1000 (exact 3:2 ratio) flat modern visual plan card
 * following the mission brief: light canvas, dark text, one accent color,
 * zero stock photos, zero invented metrics.
 */
export function renderPlanCardToCanvas(
  canvas: HTMLCanvasElement,
  plan: GtmPlanState,
): void {
  const width = 1500;
  const height = 1000;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const accent = plan.offer.accentColor || '#0F766E';
  const accentSoftBg = hexToRgba(accent, 0.08);
  const accentSoftBorder = hexToRgba(accent, 0.3);
  const bg = '#FAF9F6';
  const surface = '#FFFFFF';
  const ink = '#111827';
  const muted = '#4B5563';
  const border = '#E5E7EB';

  const selectedSegment = plan.segments.find((s) => s.isSelected) ?? plan.segments[0];
  const top3 = plan.leads.filter((l) => l.status === 'top3').slice(0, 3);
  const primaryLead =
    top3.find((l) => l.id === plan.activePrimaryOpenerLeadId) ?? top3[0];
  const activeMessage = getActiveOpenerText(primaryLead);

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, 8);

  const padX = 76;
  const contentW = width - padX * 2;

  ctx.fillStyle = accent;
  ctx.font = '600 16px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('ONE-PAGE GO-TO-MARKET PLAN', padX, 66);

  ctx.textAlign = 'right';
  ctx.fillStyle = muted;
  ctx.font = '500 16px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Clay Shortlist: ${plan.leads.length} Audited  |  Top ${top3.length} Selected`, width - padX, 66);
  ctx.textAlign = 'left';

  ctx.fillStyle = ink;
  ctx.font = '700 44px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText(fitSingleLineText(ctx, plan.offer.projectName, contentW), padX, 122);

  ctx.fillStyle = muted;
  ctx.font = '500 22px "Inter", "Segoe UI", system-ui, sans-serif';
  const offerLines = wrapTextLines(ctx, plan.offer.oneLiner, contentW, 2);
  offerLines.forEach((line, i) => {
    ctx.fillText(line, padX, 164 + i * 32);
  });

  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, 232);
  ctx.lineTo(width - padX, 232);
  ctx.stroke();

  drawRoundedRect(ctx, padX, 256, contentW, 134, 14);
  ctx.fillStyle = surface;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = '700 14px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('01  /  TARGET SEGMENT & WEEK-1 REACHABILITY', padX + 26, 290);

  ctx.fillStyle = ink;
  ctx.font = '400 20px "Inter", "Segoe UI", system-ui, sans-serif';
  const segLines = wrapTextLines(ctx, selectedSegment?.reachabilityReason ?? '', contentW - 52, 3);
  segLines.forEach((line, i) => {
    ctx.fillText(line, padX + 26, 322 + i * 28);
  });

  const colGap = 28;
  const leftW = 796;
  const rightW = contentW - leftW - colGap;
  const rowY = 414;
  const rowH = 446;

  drawRoundedRect(ctx, padX, rowY, leftW, rowH, 14);
  ctx.fillStyle = surface;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = '700 14px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('02  /  TOP THREE CANDIDATES & VERIFIED OPENING FACTS', padX + 26, rowY + 36);

  let cursorY = rowY + 74;
  top3.forEach((lead, idx) => {
    drawRoundedRect(ctx, padX + 26, cursorY - 18, 28, 26, 6);
    ctx.fillStyle = accentSoftBg;
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.font = '700 14px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`${idx + 1}`, padX + 36, cursorY);

    ctx.fillStyle = ink;
    ctx.font = '700 19px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillText(
      fitSingleLineText(ctx, `${lead.name}  ·  ${lead.domain}`, leftW - 92),
      padX + 66,
      cursorY,
    );

    ctx.fillStyle = muted;
    ctx.font = '400 16px "Inter", "Segoe UI", system-ui, sans-serif';
    const factLines = wrapTextLines(
      ctx,
      lead.verifiedFact || lead.whyFit,
      leftW - 92,
      3,
    );
    factLines.forEach((line, lineIdx) => {
      ctx.fillText(line, padX + 66, cursorY + 26 + lineIdx * 22);
    });

    cursorY += 120;
    if (idx < top3.length - 1) {
      ctx.strokeStyle = '#F3F4F6';
      ctx.beginPath();
      ctx.moveTo(padX + 26, cursorY - 24);
      ctx.lineTo(padX + leftW - 26, cursorY - 24);
      ctx.stroke();
    }
  });

  const rightX = padX + leftW + colGap;
  drawRoundedRect(ctx, rightX, rowY, rightW, rowH, 14);
  ctx.fillStyle = surface;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = '700 14px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText("03  /  FIRST MESSAGE I'M SENDING", rightX + 26, rowY + 36);

  ctx.fillStyle = muted;
  ctx.font = '600 15px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText(
    fitSingleLineText(
      ctx,
      `To: ${primaryLead?.name ?? 'Candidate #1'} (${countWords(activeMessage)} words)`,
      rightW - 52,
    ),
    rightX + 26,
    rowY + 72,
  );

  ctx.fillStyle = ink;
  ctx.font = '400 19px "Inter", "Segoe UI", system-ui, sans-serif';
  const msgLines = wrapTextLines(ctx, activeMessage, rightW - 72, 9);

  const quoteBarH = Math.max(56, msgLines.length * 28 + 2);
  ctx.fillStyle = accent;
  ctx.fillRect(rightX + 26, rowY + 95, 4, quoteBarH);

  ctx.fillStyle = ink;
  msgLines.forEach((line, i) => {
    ctx.fillText(line, rightX + 46, rowY + 114 + i * 28);
  });

  ctx.fillStyle = muted;
  ctx.font = '500 14px "Inter", "Segoe UI", system-ui, sans-serif';
  const channelLines = wrapTextLines(
    ctx,
    `Channel: ${primaryLead?.contactChannel ?? '[Contact Channel]'}`,
    rightW - 52,
    1,
  );
  ctx.fillText(channelLines[0] ?? '', rightX + 26, rowY + rowH - 28);

  drawRoundedRect(ctx, padX, 884, contentW, 68, 12);
  ctx.fillStyle = accentSoftBg;
  ctx.fill();
  ctx.strokeStyle = accentSoftBorder;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = '700 14px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText("WHAT I'LL WATCH:", padX + 24, 924);

  ctx.fillStyle = ink;
  ctx.font = '500 14.5px "Inter", "Segoe UI", system-ui, sans-serif';
  const watchLines = wrapTextLines(ctx, plan.metrics.primarySignal, contentW - 210, 2);
  if (watchLines.length > 1) {
    ctx.fillText(watchLines[0], padX + 180, 913);
    ctx.fillText(watchLines[1], padX + 180, 934);
  } else {
    ctx.fillText(watchLines[0] ?? '', padX + 180, 923);
  }
}
