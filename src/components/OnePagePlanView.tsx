import { Archive, Copy, Download, ExternalLink, FileCode2, FileText, FolderDown, Printer } from 'lucide-react';
import { GtmPlanState } from '../types/gtm';
import { buildOnePagePlanHtml, buildOnePagePlanMarkdown } from '../utils/exporters';
import {
  analyzeOfferOneLiner,
  countWords,
  getActiveOpenerText,
  isOpenerUnderLimit,
  MAX_SHOWCASE_CHARS,
  toSafeHttpUrl,
} from '../utils/validators';
import { WorkspaceTab } from './TrackerAuditView';

interface OnePagePlanViewProps {
  plan: GtmPlanState;
  isWebVerifiedPreset: boolean;
  onSelectPrimaryLead: (leadId: string) => void;
  onDownloadFile: (content: string, filename: string, mimeType: string) => void;
  onCopyText: (text: string, label: string) => void;
  onPrintPlan: () => void;
  onJumpToTab: (tab: WorkspaceTab) => void;
  onDownloadZipBundle?: () => void;
  onOpenDeliverables?: () => void;
}

export function OnePagePlanView({
  plan,
  isWebVerifiedPreset,
  onSelectPrimaryLead,
  onDownloadFile,
  onCopyText,
  onPrintPlan,
  onJumpToTab,
  onDownloadZipBundle,
  onOpenDeliverables,
}: OnePagePlanViewProps) {
  const selectedSegment = plan.segments.find((s) => s.isSelected) ?? plan.segments[0];
  const top3 = plan.leads.filter((l) => l.status === 'top3').slice(0, 3);
  const cutCount = plan.leads.filter((l) => l.status === 'cut').length;
  const watchlistCount = plan.leads.filter((l) => l.status === 'watchlist').length;
  const keptCount = top3.length + watchlistCount;
  const primaryLead =
    top3.find((l) => l.id === plan.activePrimaryOpenerLeadId) ?? top3[0];
  const activeMessage = getActiveOpenerText(primaryLead);

  const offerDiag = analyzeOfferOneLiner(plan.offer.oneLiner);
  const validOpenersCount = top3.reduce((acc, l) => {
    if (!l.openers) return acc;
    return (
      acc +
      (isOpenerUnderLimit(l.openers.angleAFactFirst) ? 1 : 0) +
      (isOpenerUnderLimit(l.openers.angleBValueFirst) ? 1 : 0)
    );
  }, 0);

  const coreMarkdown = buildOnePagePlanMarkdown(plan, false);
  const fullMarkdown = buildOnePagePlanMarkdown(plan, true);
  const onePageHtml = buildOnePagePlanHtml(plan);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!isWebVerifiedPreset && (
        <div className="callout callout-warn no-print">
          <strong>Starter Template Active:</strong> This preset uses placeholder sample rows so you
          can plan another side hustle. Replace sample leads with your real Clay export and
          verified URLs before submitting.
        </div>
      )}

      <div className="funnel-strip no-print" aria-label="Go-to-Market Readiness Overview">
        <button type="button" className="funnel-tile" onClick={() => onJumpToTab('offer')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <div className="eyebrow" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Phase I · Offer</div>
            <span className="funnel-tile-arrow" aria-hidden="true">↗</span>
          </div>
          <div className="stat-value mono" style={{ fontSize: 22 }}>
            {offerDiag.score}% Clear
          </div>
          <div className="stat-label">
            {plan.segments.length} segments compared → 1 Week-1 target
          </div>
        </button>

        <button type="button" className="funnel-tile" onClick={() => onJumpToTab('clay')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <div className="eyebrow" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Phase II · Funnel</div>
            <span className="funnel-tile-arrow" aria-hidden="true">↗</span>
          </div>
          <div className="stat-value mono" style={{ fontSize: 22 }}>
            {plan.leads.length} → {keptCount} → {top3.length}
          </div>
          <div className="stat-label">
            {cutCount} cut ({watchlistCount} backups, {top3.length} Top picks)
          </div>
        </button>

        <button type="button" className="funnel-tile" onClick={() => onJumpToTab('outreach')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <div className="eyebrow" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Phase III · Openers</div>
            <span className="funnel-tile-arrow" aria-hidden="true">↗</span>
          </div>
          <div className="stat-value mono" style={{ fontSize: 22 }}>
            {validOpenersCount} / {Math.max(2, top3.length * 2)} Ready
          </div>
          <div className="stat-label">
            Two neutral angles + verified facts &amp; prototypes
          </div>
        </button>

        <button type="button" className="funnel-tile" onClick={() => onJumpToTab('showcase')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <div className="eyebrow" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Showcase · 3:2</div>
            <span className="funnel-tile-arrow" aria-hidden="true">↗</span>
          </div>
          <div className="stat-value mono" style={{ fontSize: 22 }}>
            {plan.showcase.description.length} / {MAX_SHOWCASE_CHARS}
          </div>
          <div className="stat-label">1500×1000 PNG cover &amp; copy-ready description</div>
        </button>

        <button type="button" className="funnel-tile" onClick={() => onJumpToTab('tracker')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <div className="eyebrow" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Playbook · Week 1</div>
            <span className="funnel-tile-arrow" aria-hidden="true">↗</span>
          </div>
          <div className="stat-value mono" style={{ fontSize: 22 }}>
            {4 + top3.length} Actions
          </div>
          <div className="stat-label">Assigned tasks, direct mailto &amp; KPI log</div>
        </button>
      </div>

      <div className="card no-print" style={{ padding: '14px 18px' }}>
        <div className="card-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="eyebrow">Ready-to-Submit One-Page Document</div>
            <h2 className="section-title" style={{ marginBottom: 2 }}>One-Page Go-to-Market Plan</h2>
            <p className="section-desc" style={{ margin: 0 }}>
              Follows the exact mission structure. Export clean Markdown, HTML, ZIP, or 1-page PDF.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => onCopyText(coreMarkdown, 'One-Page Plan Markdown')}
            >
              <Copy size={14} />
              Copy Core 1-Pager
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                onDownloadFile(fullMarkdown, 'GTM_PLAN.md', 'text/markdown;charset=utf-8')
              }
            >
              <Download size={14} />
              Download GTM_PLAN.md
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                onDownloadFile(onePageHtml, 'ONE_PAGE_GTM_PLAN.html', 'text/html;charset=utf-8')
              }
            >
              <FileCode2 size={14} />
              Download 1-Page HTML
            </button>
            {onDownloadZipBundle && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={onDownloadZipBundle}
                data-testid="tab1-zip-btn"
                title="Download all deliverables as a standalone ZIP archive"
              >
                <Archive size={14} />
                ZIP Bundle
              </button>
            )}
            {onOpenDeliverables && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={onOpenDeliverables}
                title="Open universal Deliverables Hub for all 9 files"
              >
                <FolderDown size={14} />
                Deliverables Hub
              </button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={onPrintPlan}>
              <Printer size={14} />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      <article className="one-page-sheet" aria-label="One-Page Go-to-Market Plan">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
            paddingBottom: 16,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div className="eyebrow">Go-to-Market Plan</div>
            <h2 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.02em' }}>
              GTM PLAN: {plan.offer.projectName}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-emerald mono">{plan.leads.length} Clay Candidates</span>
            <span className="badge mono">{watchlistCount} Watchlist</span>
            <span className="badge mono">{cutCount} Cut</span>
          </div>
        </div>

        <div className="one-page-row">
          <div className="one-page-key" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="one-page-step-badge mono">01</span>
            <span>The offer</span>
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{plan.offer.oneLiner}</p>
        </div>

        <div className="one-page-row">
          <div className="one-page-key" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="one-page-step-badge mono">02</span>
            <span>The segment</span>
          </div>
          <p style={{ margin: 0, fontSize: 15 }}>{selectedSegment?.reachabilityReason}</p>
        </div>

        <div className="one-page-row">
          <div className="one-page-key" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="one-page-step-badge mono">03</span>
            <span>The list</span>
          </div>
          <p style={{ margin: 0, fontSize: 15 }}>
            <strong>{plan.leads.length} candidates</strong>, found in Clay (Find leads → Companies
            → Sculptor) with{' '}
            <code
              className="mono"
              style={{
                background: 'var(--bg-subtle)',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              “{plan.claySpec.sculptorQuery}”
            </code>{' '}
            and narrowed by removing{' '}
            {isWebVerifiedPreset
              ? `${cutCount} closed, out-of-area, or >50-employee chains.`
              : `${cutCount} out-of-scope or unverified entries.`}
          </p>
        </div>

        <div className="one-page-row">
          <div className="one-page-key" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="one-page-step-badge mono">04</span>
            <span>Top three, with the fact I’d open with</span>
          </div>
          <ol
            style={{
              margin: '8px 0 0',
              paddingLeft: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {top3.map((lead) => (
              <li key={lead.id} style={{ fontSize: 14.5, lineHeight: 1.55 }}>
                <strong style={{ color: 'var(--ink-primary)' }}>{lead.name}</strong>{' '}
                <span className="meta-chip mono" style={{ fontSize: 11.5, padding: '2px 7px', margin: '0 4px' }}>
                  {lead.domain}
                </span>
                :{' '}
                <span>{lead.verifiedFact}</span>{' '}
                {lead.factSourceUrl && (
                  <a
                    href={toSafeHttpUrl(lead.factSourceUrl, lead.domain)}
                    target="_blank"
                    rel="noreferrer"
                    className="no-print"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 12,
                      fontWeight: 600,
                      marginLeft: 4,
                    }}
                  >
                    Source <ExternalLink size={11} />
                  </a>
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="one-page-row">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 8,
            }}
          >
            <div className="one-page-key" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="one-page-step-badge mono">05</span>
              <span>
                The message ({primaryLead?.name ?? 'Primary Candidate'} · {countWords(activeMessage)}{' '}
                words)
              </span>
            </div>
            <div className="no-print" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {top3.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  className={`btn btn-sm ${lead.id === primaryLead?.id ? 'btn-primary' : ''}`}
                  onClick={() => onSelectPrimaryLead(lead.id)}
                >
                  <FileText size={12} />
                  {lead.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <blockquote
            style={{
              margin: 0,
              padding: '12px 16px',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'inset 4px 0 0 var(--accent)',
              background: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-md)',
              fontSize: 15,
            }}
          >
            {activeMessage}
          </blockquote>
          <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink-muted)' }}>
            Channel: {primaryLead?.contactChannel}
          </div>
        </div>

        <div className="one-page-row">
          <div className="one-page-key" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="one-page-step-badge mono">06</span>
            <span>What I’ll watch</span>
          </div>
          <p style={{ margin: 0, fontSize: 15 }}>{plan.metrics.primarySignal}</p>
        </div>
      </article>
    </div>
  );
}
