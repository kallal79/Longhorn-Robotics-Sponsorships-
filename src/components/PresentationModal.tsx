import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Laptop,
  Maximize2,
  Minimize2,
  Printer,
  X,
} from 'lucide-react';
import { GtmPlanState } from '../types/gtm';
import { getActiveOpenerText } from '../utils/validators';
import { buildPresentationHtml } from '../utils/exporters';

interface PresentationModalProps {
  plan: GtmPlanState;
  accentColor: string;
  onClose: () => void;
}

export function PresentationModal({
  plan,
  accentColor,
  onClose,
}: PresentationModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const selectedSegment = plan.segments.find((s) => s.isSelected) ?? plan.segments[0];
  const top3 = plan.leads.filter((l) => l.status === 'top3').slice(0, 3);
  const cutLeads = plan.leads.filter((l) => l.status === 'cut');
  const primaryLead =
    top3.find((l) => l.id === plan.activePrimaryOpenerLeadId) ?? top3[0];
  const activeMessage = getActiveOpenerText(primaryLead);

  const totalSlides = 6;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(totalSlides - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSlides, onClose]);

  return (
    <div
      className="presentation-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Go-to-Market Plan Presentation Deck"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="presentation-panel">
        <header className="presentation-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mono badge badge-emerald" style={{ fontSize: 11.5 }}>
              Slide {currentSlide + 1} of {totalSlides}
            </span>
            <span style={{ fontSize: 13, color: 'var(--ink-secondary)', fontWeight: 600 }}>
              {plan.offer.projectName} — Executive Deck
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                const html = buildPresentationHtml(plan);
                const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'PRESENTATION_DECK.html';
                a.click();
                URL.revokeObjectURL(url);
              }}
              title="Download presentation deck as a self-contained offline HTML file"
            >
              <Download size={13} /> HTML Deck
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => window.print()}
              title="Print slides"
            >
              <Printer size={13} /> Print
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit full-screen' : 'Enter full-screen presentation'}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              {isFullscreen ? 'Windowed' : 'Fullscreen'}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={onClose}
              aria-label="Exit presentation mode"
            >
              <X size={14} /> Exit
            </button>
          </div>
        </header>

        <main className="presentation-body">
          {currentSlide === 0 && (
            <div className="slide-content">
              <div className="eyebrow" style={{ color: accentColor }}>
                Slide 1 · Executive Overview
              </div>
              <h2 className="slide-title">Go-to-Market Strategy</h2>
              <div className="slide-hero-box" style={{ boxShadow: `inset 4px 0 0 ${accentColor}` }}>
                <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: accentColor, fontWeight: 700, marginBottom: 4 }}>
                  The Offer Formula: [What you offer] for [Who]
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-primary)', lineHeight: 1.4 }}>
                  {plan.offer.oneLiner}
                </div>
              </div>
              <div className="grid-3" style={{ marginTop: 24 }}>
                <div className="stat-tile">
                  <div className="stat-value mono">{plan.leads.length} Leads</div>
                  <div className="stat-label">Sourced via Clay Sculptor AI</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-value mono">{top3.length} Selected</div>
                  <div className="stat-label">Week-1 Top Picks with dated facts</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-value mono">{cutLeads.length} Cuts</div>
                  <div className="stat-label">Documented closed / multi-unit cuts</div>
                </div>
              </div>
            </div>
          )}

          {currentSlide === 1 && (
            <div className="slide-content">
              <div className="eyebrow" style={{ color: accentColor }}>
                Slide 2 · Segment Comparison &amp; Selection
              </div>
              <h2 className="slide-title">Target Segment Selection</h2>
              <p className="slide-desc">
                Comparing customer segments and committing to the one with the highest immediate reachability.
              </p>
              <div className="slide-hero-box" style={{ boxShadow: `inset 4px 0 0 ${accentColor}`, marginBottom: 18 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', color: accentColor, marginBottom: 4 }}>
                  Selected Target Segment
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                  {selectedSegment?.name ?? ''}
                </div>
                <div style={{ fontSize: 14.5, color: 'var(--ink-secondary)', lineHeight: 1.45 }}>
                  {selectedSegment?.reachabilityReason ?? ''}
                </div>
              </div>
              <div className="grid-3" style={{ gap: 12 }}>
                {plan.segments.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: 12,
                      borderRadius: 'var(--radius-md)',
                      border: s.isSelected ? `1.5px solid ${accentColor}` : '1px solid var(--border-subtle)',
                      background: s.isSelected ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
                      Channel: {s.channelAccess} · Speed: {s.speedToReply}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentSlide === 2 && (
            <div className="slide-content">
              <div className="eyebrow" style={{ color: accentColor }}>
                Slide 3 · Clay Lead Generation Funnel
              </div>
              <h2 className="slide-title">Clay Sculptor AI Lead Mining</h2>
              <div className="slide-hero-box" style={{ boxShadow: `inset 4px 0 0 ${accentColor}`, marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', color: accentColor, marginBottom: 4 }}>
                  Sculptor AI Prompt
                </div>
                <code
                  style={{
                    fontSize: 14.5,
                    fontWeight: 500,
                    display: 'block',
                    background: 'transparent',
                    padding: 0,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                >
                  “{plan.claySpec.sculptorQuery}”
                </code>
              </div>
              <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
                <div className="stat-tile">
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                    Standard Filters
                  </div>
                  <div style={{ fontSize: 13.5, marginTop: 4 }}>
                    <strong>Location:</strong> {plan.claySpec.locationFilter}<br />
                    <strong>Headcount:</strong> {plan.claySpec.headcountFilter}
                  </div>
                </div>
                <div className="stat-tile">
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                    Industry Neighbors
                  </div>
                  <div style={{ fontSize: 13.5, marginTop: 4 }}>
                    {plan.claySpec.industryNeighbors.join(', ')}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                <strong>Quality Narrowing:</strong> {cutLeads.length} leads removed (
                {cutLeads.length > 0
                  ? cutLeads.map((l) => l.name).join(', ')
                  : 'none cut yet'}
                ).
              </div>
            </div>
          )}

          {currentSlide === 3 && (
            <div className="slide-content">
              <div className="eyebrow" style={{ color: accentColor }}>
                Slide 4 · Top-3 Candidate Research Dossier
              </div>
              <h2 className="slide-title">Top 3 Candidates &amp; Dated Facts</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {top3.map((lead, idx) => (
                  <div
                    key={lead.id}
                    style={{
                      padding: 14,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-canvas)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>
                        #{idx + 1} {lead.name}
                      </span>
                      <span className="mono badge badge-emerald">{lead.factDate}</span>
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--ink-primary)', marginTop: 6, lineHeight: 1.45 }}>
                      {lead.verifiedFact}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
                      Channel: <strong>{lead.contactChannel}</strong> · Domain: <strong>{lead.domain}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentSlide === 4 && (
            <div className="slide-content">
              <div className="eyebrow" style={{ color: accentColor }}>
                Slide 5 · Two-Angle Outreach Studio
              </div>
              <h2 className="slide-title">Conversational Outreach &amp; Prototype</h2>
              <p className="slide-desc">
                Two neutral angles strictly &lt; 60 words: one leading with the verified fact, one leading with value.
              </p>
              <div className="slide-hero-box" style={{ boxShadow: `inset 4px 0 0 ${accentColor}`, marginBottom: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', color: accentColor, marginBottom: 4 }}>
                  Featured Cold Opener ({primaryLead?.name ?? 'Top Pick'})
                </div>
                <blockquote style={{ margin: 0, fontSize: 15, fontStyle: 'normal', lineHeight: 1.5 }}>
                  {activeMessage}
                </blockquote>
              </div>
              <div className="callout" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Laptop size={16} color={accentColor} />
                <span>
                  <strong>Interactive 2-Minute Prototype Demo:</strong> Deployed when prospect replies, generating an instant{' '}
                  {/(menu|catering|intake|bakery|coffee)/i.test(plan.offer.oneLiner)
                    ? 'staff-ready catering/order intake brief'
                    : 'tailored qualification & sample brief'}{' '}
                  and standalone HTML mockup.
                </span>
              </div>
            </div>
          )}

          {currentSlide === 5 && (
            <div className="slide-content">
              <div className="eyebrow" style={{ color: accentColor }}>
                Slide 6 · Execution Playbook &amp; Showcase
              </div>
              <h2 className="slide-title">Week-1 Execution &amp; KPI Target</h2>
              <div className="grid-2" style={{ gap: 14, marginBottom: 16 }}>
                <div className="stat-tile">
                  <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', color: accentColor, marginBottom: 4 }}>
                    What I’ll Watch (Signal)
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.4 }}>
                    {plan.metrics.primarySignal}
                  </div>
                </div>
                <div className="stat-tile">
                  <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', color: accentColor, marginBottom: 4 }}>
                    Handshake Showcase Asset
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.4 }}>
                    1500 × 1000 px (3:2) Cover Card + {plan.showcase.description.length}/500 chars description
                  </div>
                </div>
              </div>
              <div className="card" style={{ background: 'var(--bg-canvas)' }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>
                  7-Day Operator Execution Schedule:
                </div>
                <div className="grid-2" style={{ fontSize: 13, color: 'var(--ink-secondary)', gap: 10 }}>
                  <div><strong>Mon:</strong> Clay Sculptor Lead Mining &amp; Filter Audit</div>
                  <div><strong>Tue:</strong> {top3[0]?.name ?? 'Candidate #1'} Outreach (#1)</div>
                  <div><strong>Wed:</strong> {top3[1]?.name ?? 'Candidate #2'} Outreach (#2)</div>
                  <div><strong>Thu:</strong> {top3[2]?.name ?? 'Candidate #3'} Outreach (#3)</div>
                  <div><strong>Fri:</strong> Deploy 2-Min Prototype on Reply</div>
                  <div><strong>Fri:</strong> Log KPIs &amp; Publish Showcase Card</div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="presentation-footer">
          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            Use <kbd className="mono" style={{ background: '#f3f4f6', padding: '2px 5px', borderRadius: 4 }}>←</kbd> and <kbd className="mono" style={{ background: '#f3f4f6', padding: '2px 5px', borderRadius: 4 }}>→</kbd> keys to navigate · <kbd className="mono" style={{ background: '#f3f4f6', padding: '2px 5px', borderRadius: 4 }}>Esc</kbd> to exit
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} aria-label="Slide selector">
            {Array.from({ length: totalSlides }, (_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Jump to slide ${idx + 1}`}
                onClick={() => setCurrentSlide(idx)}
                style={{
                  width: currentSlide === idx ? 20 : 8,
                  height: 8,
                  borderRadius: 999,
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  background: currentSlide === idx ? accentColor : '#d1d5db',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm"
              disabled={currentSlide === 0}
              onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
            >
              <ArrowLeft size={13} /> Previous
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={currentSlide === totalSlides - 1}
              onClick={() => setCurrentSlide((prev) => Math.min(totalSlides - 1, prev + 1))}
            >
              Next <ArrowRight size={13} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
