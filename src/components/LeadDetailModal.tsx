import { useEffect } from 'react';
import {
  ExternalLink,
  MapPin,
  Users,
  MessageSquare,
  AlertCircle,
  X,
  FileCheck,
} from 'lucide-react';
import { LeadCandidate, LeadStatus } from '../types/gtm';
import { MAX_OPENER_WORDS, countWords, toSafeHttpUrl } from '../utils/validators';

interface LeadDetailModalProps {
  lead: LeadCandidate;
  accentColor: string;
  onClose: () => void;
  onChangeStatus: (leadId: string, status: LeadStatus, cutReason?: string) => void;
}

export function LeadDetailModal({
  lead,
  accentColor,
  onClose,
  onChangeStatus,
}: LeadDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const wordCountA = lead.openers?.angleAFactFirst ? countWords(lead.openers.angleAFactFirst) : 0;
  const wordCountB = lead.openers?.angleBValueFirst ? countWords(lead.openers.angleBValueFirst) : 0;

  return (
    <div
      className="presentation-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-detail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="presentation-panel"
        style={{
          maxWidth: 680,
          minHeight: 'auto',
          maxHeight: '90vh',
        }}
      >
        <div className="presentation-header" style={{ alignItems: 'flex-start', padding: '18px 24px', gap: 16 }}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="mono badge badge-emerald">Rank #{lead.rank}</span>
              <span
                className={`badge ${
                  lead.status === 'top3'
                    ? 'badge-emerald'
                    : lead.status === 'watchlist'
                    ? 'badge-primary'
                    : 'badge-danger'
                }`}
              >
                {lead.status === 'top3' ? '★ Top 3 Pick' : lead.status === 'watchlist' ? 'Watchlist' : 'Cut / Disqualified'}
              </span>
            </div>
            <h2 id="lead-detail-title" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              {lead.name}
            </h2>
            <a
              href={toSafeHttpUrl(lead.websiteUrl, lead.domain)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 13,
                color: accentColor,
                fontWeight: 500,
                marginTop: 3,
              }}
            >
              {lead.domain} <ExternalLink size={12} />
            </a>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={onClose}
            aria-label="Close prospect profile"
          >
            <X size={15} /> Close
          </button>
        </div>

        <div className="presentation-body" style={{ padding: '20px 24px' }}>
        {/* Status Transition Control */}
        <div
          style={{
            background: 'var(--bg-canvas)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>Triage Status:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`btn btn-sm ${lead.status === 'top3' ? 'btn-primary' : ''}`}
              onClick={() => onChangeStatus(lead.id, 'top3')}
            >
              ★ Top 3
            </button>
            <button
              type="button"
              className={`btn btn-sm ${lead.status === 'watchlist' ? 'btn-primary' : ''}`}
              onClick={() => onChangeStatus(lead.id, 'watchlist')}
            >
              Watchlist
            </button>
            <button
              type="button"
              className={`btn btn-sm ${lead.status === 'cut' ? 'btn-primary' : ''}`}
              onClick={() =>
                onChangeStatus(
                  lead.id,
                  'cut',
                  lead.cutReason ?? 'Cut during reachability/fit review.',
                )
              }
            >
              Cut
            </button>
          </div>
        </div>

        {/* Core Metadata Grid */}
        <div className="grid-2" style={{ gap: 14, marginBottom: 20 }}>
          <div style={{ padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>
              <MapPin size={13} /> Location &amp; Address
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{lead.neighborhood}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-secondary)', marginTop: 2 }}>{lead.address}</div>
          </div>

          <div style={{ padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>
              <Users size={13} /> Headcount &amp; Category
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{lead.estimatedEmployees}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-secondary)', marginTop: 2 }}>{lead.category}</div>
          </div>
        </div>

        {/* Fit Analysis or Cut Reason */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-muted)', marginBottom: 6 }}>
            {lead.status === 'cut' ? 'Cut / Disqualification Reason' : 'Fit & Reachability Rationale'}
          </div>
          <div
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md)',
              background: lead.status === 'cut' ? '#fef2f2' : 'var(--bg-canvas)',
              border: lead.status === 'cut' ? '1px solid #fecaca' : '1px solid var(--border-subtle)',
              fontSize: 13.5,
              lineHeight: 1.5,
            }}
          >
            {lead.status === 'cut' ? lead.cutReason || 'Disqualified during audit.' : lead.whyFit}
          </div>
        </div>

        {/* Public Unknowns */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-muted)', marginBottom: 6 }}>
            <AlertCircle size={13} /> Couldn’t Find Publicly
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-secondary)', padding: '8px 12px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {lead.unknownInfo}
          </div>
        </div>

        {/* Verified Fact (if present) */}
        {lead.verifiedFact && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: accentColor, marginBottom: 6 }}>
              <FileCheck size={13} /> One True, Dated, Checkable Fact
            </div>
            <div
              style={{
                padding: 14,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                boxShadow: `inset 4px 0 0 ${accentColor}`,
                background: 'var(--bg-canvas)',
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>
                {lead.verifiedFact}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--ink-muted)', marginTop: 8 }}>
                <span>Published: <strong>{lead.factDate ?? 'Recent'}</strong></span>
                {lead.factSourceUrl && (
                  <a
                    href={toSafeHttpUrl(lead.factSourceUrl, lead.domain)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: accentColor }}
                  >
                    Verify Source <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Outreach Openers (if present) */}
        {lead.openers && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-muted)', marginBottom: 10 }}>
              <MessageSquare size={13} /> Tested Outreach Angles (&lt;60 Words)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  border: lead.openers.selectedAngle === 'A' ? `1.5px solid ${accentColor}` : '1px solid var(--border-subtle)',
                  background: lead.openers.selectedAngle === 'A' ? 'var(--bg-canvas)' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: lead.openers.selectedAngle === 'A' ? accentColor : 'var(--ink-muted)' }}>
                    Angle A · Fact-First {lead.openers.selectedAngle === 'A' && '★ Active'}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: wordCountA < MAX_OPENER_WORDS ? 'var(--ink-muted)' : 'var(--danger-ink)' }}>
                    {wordCountA} / {MAX_OPENER_WORDS - 1} max words
                  </span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.45, fontStyle: 'italic' }}>
                  “{lead.openers.angleAFactFirst}”
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  border: lead.openers.selectedAngle === 'B' ? `1.5px solid ${accentColor}` : '1px solid var(--border-subtle)',
                  background: lead.openers.selectedAngle === 'B' ? 'var(--bg-canvas)' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: lead.openers.selectedAngle === 'B' ? accentColor : 'var(--ink-muted)' }}>
                    Angle B · Value-First {lead.openers.selectedAngle === 'B' && '★ Active'}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: wordCountB < MAX_OPENER_WORDS ? 'var(--ink-muted)' : 'var(--danger-ink)' }}>
                    {wordCountB} / {MAX_OPENER_WORDS - 1} max words
                  </span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.45, fontStyle: 'italic' }}>
                  “{lead.openers.angleBValueFirst}”
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
