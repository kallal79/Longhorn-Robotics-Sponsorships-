import { useEffect, useRef } from 'react';
import { CheckCircle2, Copy, Download, FileCode2, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { GtmPlanState, ShowcaseSubmission } from '../types/gtm';
import { buildOnePagePlanHtml, renderPlanCardToCanvas } from '../utils/exporters';
import { MAX_SHOWCASE_CHARS, detectPotentialPii } from '../utils/validators';

export interface AccentThemeOption {
  label: string;
  hex: string;
  soft: string;
  border: string;
  hover: string;
}

export const ACCENT_THEMES: AccentThemeOption[] = [
  { label: 'Deep Emerald', hex: '#0F766E', soft: '#ECFDF5', border: '#A7F3D0', hover: '#0D5D56' },
  { label: 'Royal Cobalt', hex: '#1D4ED8', soft: '#EFF6FF', border: '#BFDBFE', hover: '#1E40AF' },
  { label: 'Warm Terracotta', hex: '#C2410C', soft: '#FFF7ED', border: '#FED7AA', hover: '#9A3412' },
  { label: 'Swiss Charcoal', hex: '#1F2937', soft: '#F3F4F6', border: '#D1D5DB', hover: '#111827' },
];

interface ShowcaseCardStudioProps {
  plan: GtmPlanState;
  onUpdateShowcase: (next: ShowcaseSubmission) => void;
  onChangeAccentColor: (hex: string) => void;
  onDownloadFile: (content: string, filename: string, mimeType: string) => void;
  onCopyText: (text: string, label: string) => void;
  onToast: (msg: string) => void;
}

export function ShowcaseCardStudio({
  plan,
  onUpdateShowcase,
  onChangeAccentColor,
  onDownloadFile,
  onCopyText,
  onToast,
}: ShowcaseCardStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const charCount = plan.showcase.description.length;
  const withinLimit = charCount > 0 && charCount <= MAX_SHOWCASE_CHARS;
  const piiWarnings = detectPotentialPii(plan.showcase.description);

  useEffect(() => {
    if (canvasRef.current) {
      renderPlanCardToCanvas(canvasRef.current, plan);
    }
  }, [plan]);

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderPlanCardToCanvas(canvas, plan);
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'gtm-plan-card-1500x1000.png';
    link.click();
    onToast('Downloaded 1500x1000 (3:2) PNG plan card.');
  };

  const handleCopyImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          onToast('Could not convert canvas to image.');
          return;
        }
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          onToast('Copied 1500x1000 PNG card image to clipboard!');
        } catch {
          onToast('Clipboard image write blocked — click Download 1500×1000 PNG instead.');
        }
      });
    } catch {
      onToast('Direct clipboard image copy unavailable in this browser.');
    }
  };

  const handleRegenerateDescription = () => {
    const top1 = plan.leads.find((l) => l.status === 'top3');
    const cutLeads = plan.leads.filter((l) => l.status === 'cut');
    const cutNames =
      cutLeads.length > 0
        ? cutLeads.map((l) => l.name.split(/\s+/)[0]).join(', ')
        : 'none';
    const rawUnknown =
      (plan.metrics.whatUnknownPubliclySummary || 'exact hourly headcounts and direct owner emails')
        .replace(/Public profiles and websites do not disclose\s*/i, '')
        .replace(/\.$/, '');
    const draft = `Offer: ${plan.offer.oneLiner} Top fact (${top1?.name ?? 'Top pick'}): ${top1?.verifiedFact ?? ''} Cut ${cutLeads.length} of ${plan.leads.length} (${cutNames}). Missing publicly: ${rawUnknown}.`;

    let nextDesc = draft.trim();
    if (nextDesc.length > MAX_SHOWCASE_CHARS) {
      const sliced = nextDesc.slice(0, MAX_SHOWCASE_CHARS - 1);
      const lastSpace = sliced.lastIndexOf(' ');
      nextDesc = `${(lastSpace > 120 ? sliced.slice(0, lastSpace) : sliced).trimEnd()}.`;
    }

    onUpdateShowcase({
      ...plan.showcase,
      description: nextDesc,
    });
    onToast(`Synced showcase bio from active plan (${nextDesc.length}/${MAX_SHOWCASE_CHARS} chars).`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section className="card">
        <div className="card-header">
          <div>
            <div className="eyebrow">Optional Visual Card &amp; Showcase Cover</div>
            <h2 className="section-title">One-Page Plan Card (1500 × 1000 px · Exact 3:2)</h2>
            <p className="section-desc">
              Flat and modern with generous whitespace, dark text on a light canvas, and one
              selected accent color—zero stock imagery, zero invented metrics, ready for Handshake’s
              3:2 uploader (≥1200px wide).
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCopyImage}
              data-testid="copy-canvas-btn"
              title="Copy 1500x1000 PNG image directly to clipboard"
            >
              <Copy size={14} /> Copy Image
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleDownloadPng}>
              <Download size={14} /> Download 1500×1000 PNG
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {ACCENT_THEMES.map((theme) => {
            const active = plan.offer.accentColor.toLowerCase() === theme.hex.toLowerCase();
            return (
              <button
                key={theme.hex}
                type="button"
                className={`accent-swatch ${active ? 'active' : ''}`}
                onClick={() => onChangeAccentColor(theme.hex)}
              >
                <span className="swatch-dot" style={{ background: theme.hex }} />
                {theme.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: '#faf9f6',
          }}
        >
          <canvas
            ref={canvasRef}
            aria-label="3:2 One-Page GTM Plan Visual Card Preview"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              aspectRatio: '3 / 2',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 10,
            fontSize: 12.5,
            color: 'var(--ink-muted)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ImageIcon size={14} color="var(--accent)" />
            Canvas resolution: <strong className="mono">1500 × 1000 px</strong> (3:2 ratio)
          </span>
          <span>Live-synced to your Offer, Segment, Top 3 Facts, Chosen Message &amp; Watch Metric</span>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="eyebrow">Handshake Showcase Submission Kit</div>
              <h2 className="section-title">Title &amp; 500-Character Description</h2>
              <p className="section-desc">
                One-line offer + opening fact for 1 of your final three + which of the 20 you cut +
                what you couldn’t find out about them.
              </p>
            </div>
            <button type="button" className="btn btn-sm" onClick={handleRegenerateDescription}>
              Sync Draft From Plan
            </button>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="showcase-title-input">
              <span>Project Title</span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onCopyText(plan.showcase.projectTitle, 'Project Title')}
              >
                <Copy size={12} /> Copy Title
              </button>
            </label>
            <input
              id="showcase-title-input"
              className="input"
              value={plan.showcase.projectTitle}
              onChange={(e) =>
                onUpdateShowcase({ ...plan.showcase, projectTitle: e.target.value })
              }
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="showcase-desc-input">
              <span>Showcase Description</span>
              <span
                className={`badge mono ${withinLimit ? 'badge-emerald' : 'badge-danger'}`}
                data-testid="showcase-char-count"
              >
                {charCount} / {MAX_SHOWCASE_CHARS}
              </span>
            </label>
            <textarea
              id="showcase-desc-input"
              className="textarea"
              style={{ minHeight: 158 }}
              value={plan.showcase.description}
              onChange={(e) =>
                onUpdateShowcase({ ...plan.showcase, description: e.target.value })
              }
            />
            <div className="progress-track" style={{ height: 4, margin: '8px 0 0' }} aria-hidden="true">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, Math.round((charCount / MAX_SHOWCASE_CHARS) * 100))}%`,
                  background: charCount > MAX_SHOWCASE_CHARS ? 'var(--danger-ink)' : 'var(--accent)',
                }}
              />
            </div>
            {charCount > MAX_SHOWCASE_CHARS && (
              <div className="callout callout-warn" style={{ marginTop: 8 }}>
                <strong>Over 500-character limit:</strong> Trim by {charCount - MAX_SHOWCASE_CHARS}{' '}
                characters so Handshake Showcase accepts the description.
              </div>
            )}
          </div>

          {piiWarnings.length > 0 ? (
            <div className="callout callout-warn" style={{ marginBottom: 12 }}>
              <strong>Privacy Alert:</strong> {piiWarnings.join(' ')}
            </div>
          ) : (
            <div
              className="callout"
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
            >
              <ShieldCheck size={16} color="var(--accent)" />
              <span>
                Privacy check passed: no personal phone numbers or personal webmail addresses
                detected.
              </span>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onCopyText(plan.showcase.description, 'Showcase Description')}
          >
            <Copy size={14} /> Copy Description ({charCount}/500)
          </button>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <div className="eyebrow">Submission Slot Checklist</div>
              <h2 className="section-title">Handshake Upload Readiness</h2>
              <p className="section-desc">
                Grab every file &amp; text field needed for your Handshake Showcase publish modal.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="stat-tile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={15} color="var(--accent)" /> 1. Project Title
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>{plan.showcase.projectTitle}</div>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onCopyText(plan.showcase.projectTitle, 'Project Title')}
              >
                <Copy size={12} /> Copy
              </button>
            </div>

            <div className="stat-tile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={15} color="var(--accent)" /> 2. Your Project Upload File
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>Self-contained 1-page HTML or Markdown</div>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  onDownloadFile(
                    buildOnePagePlanHtml(plan),
                    'ONE_PAGE_GTM_PLAN.html',
                    'text/html;charset=utf-8',
                  )
                }
              >
                <FileCode2 size={12} /> Download HTML
              </button>
            </div>

            <div className="stat-tile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={15} color="var(--accent)" /> 3. Preview Image (3:2, ≥1200px)
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>Exact 1500 × 1000 px PNG</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-sm" onClick={handleCopyImage} title="Copy PNG image to clipboard">
                  <Copy size={12} /> Copy
                </button>
                <button type="button" className="btn btn-sm" onClick={handleDownloadPng}>
                  <Download size={12} /> PNG
                </button>
              </div>
            </div>

            <div className="stat-tile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={15} color={withinLimit ? 'var(--accent)' : 'var(--warn-ink)'} /> 4. Description (≤500 chars)
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                  {charCount} / 500 characters ({piiWarnings.length === 0 ? 'privacy verified' : 'check PII warning'})
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onCopyText(plan.showcase.description, 'Showcase Description')}
              >
                <Copy size={12} /> Copy
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
