import { useEffect } from 'react';
import {
  Archive,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Presentation,
  X,
} from 'lucide-react';
import { GtmPlanState } from '../types/gtm';
import {
  buildActionPlaybookMarkdown,
  buildLeadsCsv,
  buildOnePagePlanHtml,
  buildOnePagePlanMarkdown,
  buildPresentationHtml,
  buildShowcaseSubmissionText,
} from '../utils/exporters';

interface DeliverablesModalProps {
  plan: GtmPlanState;
  accentColor: string;
  onClose: () => void;
  onCopyText: (text: string, label: string) => void;
  onDownloadFile: (content: string, filename: string, mimeType: string) => void;
  onDownloadZipBundle?: () => void;
  onOpenPresentation?: () => void;
}

export function DeliverablesModal({
  plan,
  accentColor,
  onClose,
  onCopyText,
  onDownloadFile,
  onDownloadZipBundle,
  onOpenPresentation,
}: DeliverablesModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const top3Count = plan.leads.filter((l) => l.status === 'top3').length;
  const cutCount = plan.leads.filter((l) => l.status === 'cut').length;
  const watchlistCount = plan.leads.filter((l) => l.status === 'watchlist').length;

  const deliverables = [
    {
      id: 'one-page-md',
      name: 'GTM_PLAN_ONE_PAGE.md',
      format: 'Markdown',
      icon: FileText,
      desc: 'The exact 6-bracket One-Page Plan for mission assignment submission.',
      getContent: () => buildOnePagePlanMarkdown(plan, false),
      mime: 'text/markdown;charset=utf-8',
      copyable: true,
    },
    {
      id: 'full-plan-md',
      name: 'GTM_PLAN.md',
      format: 'Markdown',
      icon: FileText,
      desc: `Complete specification with full ${plan.leads.length}-lead audit table, filters, cuts, and 6 openers.`,
      getContent: () => buildOnePagePlanMarkdown(plan, true),
      mime: 'text/markdown;charset=utf-8',
      copyable: true,
    },
    {
      id: 'one-page-html',
      name: 'ONE_PAGE_GTM_PLAN.html',
      format: 'Self-Contained HTML',
      icon: FileCode2,
      desc: 'Self-contained styled HTML document with print styling and clean responsive typography.',
      getContent: () => buildOnePagePlanHtml(plan),
      mime: 'text/html;charset=utf-8',
      copyable: false,
    },
    {
      id: 'deck-html',
      name: 'PRESENTATION_DECK.html',
      format: 'Presentation Deck',
      icon: Presentation,
      desc: 'Interactive 6-slide executive pitch deck with arrow keys, slide dots, and print view.',
      getContent: () => buildPresentationHtml(plan),
      mime: 'text/html;charset=utf-8',
      copyable: false,
      extraAction: onOpenPresentation
        ? {
            label: 'Present Live',
            onClick: () => {
              onClose();
              onOpenPresentation();
            },
          }
        : undefined,
    },
    {
      id: 'leads-csv',
      name: 'clay-shortlist-20.csv',
      format: 'CSV Spreadsheet',
      icon: FileSpreadsheet,
      desc: `All ${plan.leads.length} audited leads (${top3Count} Top Picks, ${watchlistCount} Watchlist, ${cutCount} Cuts).`,
      getContent: () => buildLeadsCsv(plan.leads),
      mime: 'text/csv;charset=utf-8',
      copyable: true,
    },
    {
      id: 'showcase-md',
      name: 'showcase-submission.md',
      format: 'Submission Kit',
      icon: FileText,
      desc: `Handshake Showcase copy kit with ${plan.showcase.description.trim().length}/500-char bio and cut breakdown.`,
      getContent: () => buildShowcaseSubmissionText(plan),
      mime: 'text/markdown;charset=utf-8',
      copyable: true,
    },
    {
      id: 'playbook-md',
      name: 'WEEK_1_ACTION_ASSIGNMENTS.md',
      format: 'Action Playbook',
      icon: FileText,
      desc: `Day-by-day ${4 + top3Count}-task operator execution schedule with verified facts and copy-ready openers.`,
      getContent: () => buildActionPlaybookMarkdown(plan),
      mime: 'text/markdown;charset=utf-8',
      copyable: true,
    },
    {
      id: 'workspace-json',
      name: 'gtm-workspace-backup.json',
      format: 'JSON Backup',
      icon: FileCode2,
      desc: 'Complete workspace state backup for instant rehydration or team handoff.',
      getContent: () => JSON.stringify(plan, null, 2),
      mime: 'application/json;charset=utf-8',
      copyable: true,
    },
  ];

  return (
    <div
      className="presentation-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Deliverables Export Hub"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="presentation-panel" style={{ maxWidth: 860, maxHeight: '90vh' }}>
        <header className="presentation-header" style={{ alignItems: 'flex-start', padding: '18px 24px', gap: 16 }}>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div className="eyebrow" style={{ color: accentColor }}>
              Export &amp; Submission Hub
            </div>
            <h2 className="section-title" style={{ fontSize: 20 }}>
              All 9 Deliverables: {plan.offer.projectName}
            </h2>
            <p className="section-desc" style={{ marginTop: 2, fontSize: 13 }}>
              Browse, copy, or download each generated asset individually, or grab the complete ZIP bundle.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            {onDownloadZipBundle && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onDownloadZipBundle}
                title="Download all deliverables as a single ZIP bundle"
              >
                <Archive size={14} /> Download ZIP Bundle
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm"
              onClick={onClose}
              aria-label="Close Deliverables Hub"
            >
              <X size={15} /> Close
            </button>
          </div>
        </header>

        <div className="presentation-body" style={{ padding: '20px 24px' }}>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-soft)',
              border: '1px solid var(--accent-border)',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 12.5,
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Handshake Showcase Submission Checklist
              </div>
              <span className="badge badge-emerald mono">
                {plan.showcase.description.length} / 500 Chars · Verified
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-secondary)', lineHeight: 1.45, marginBottom: 10 }}>
              All submission fields and deliverables are formatted, verified, and ready to publish:
            </div>
            <div className="grid-3" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: 'var(--bg-surface)', justifyContent: 'space-between' }}
                onClick={() => onCopyText(plan.showcase.projectTitle, 'Project Title')}
                title="Copy Handshake project title"
              >
                <span>1. Project Title</span>
                <Copy size={12} />
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: 'var(--bg-surface)', justifyContent: 'space-between' }}
                onClick={() => onCopyText(plan.showcase.description, 'Showcase Bio')}
                title="Copy Handshake 484-character description"
              >
                <span>2. Bio ({plan.showcase.description.length} chars)</span>
                <Copy size={12} />
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: 'var(--bg-surface)', justifyContent: 'space-between' }}
                onClick={() => onCopyText(buildOnePagePlanMarkdown(plan, false), 'One-Page Markdown')}
                title="Copy exact 6-bracket One-Page Plan markdown"
              >
                <span>3. One-Page MD</span>
                <Copy size={12} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {deliverables.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-canvas)',
                    gap: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 320px', minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'var(--accent-soft)',
                        border: '1px solid var(--accent-border)',
                        color: accentColor,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className="mono" style={{ fontWeight: 700, fontSize: 13.5 }}>
                          {item.name}
                        </span>
                        <span className="meta-chip" style={{ fontSize: 11, padding: '1px 6px' }}>
                          {item.format}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-secondary)', marginTop: 2 }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                    {item.copyable && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onCopyText(item.getContent(), item.name)}
                        title={`Copy ${item.name} content to clipboard`}
                      >
                        <Copy size={12} /> Copy
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => onDownloadFile(item.getContent(), item.name, item.mime)}
                      title={`Download ${item.name}`}
                    >
                      <Download size={12} /> Download
                    </button>
                    {item.extraAction && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={item.extraAction.onClick}
                      >
                        <ExternalLink size={12} /> {item.extraAction.label}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
