import { AlertCircle, CheckCircle2, Copy, Sparkles } from 'lucide-react';
import { CustomerSegment, OfferDefinition } from '../types/gtm';
import { analyzeOfferOneLiner } from '../utils/validators';

interface OfferSegmentLabProps {
  offer: OfferDefinition;
  segments: CustomerSegment[];
  onUpdateOffer: (next: OfferDefinition) => void;
  onSelectSegment: (segmentId: string) => void;
  onUpdateSegmentReason: (segmentId: string, reason: string) => void;
  onCopyText: (text: string, label: string) => void;
}

export function OfferSegmentLab({
  offer,
  segments,
  onUpdateOffer,
  onSelectSegment,
  onUpdateSegmentReason,
  onCopyText,
}: OfferSegmentLabProps) {
  const diagnostic = analyzeOfferOneLiner(offer.oneLiner);

  const handleRebuildOneLiner = (what: string, who: string) => {
    const cleanWhat = what.trim();
    const cleanWho = who.trim().replace(/\.+$/, '');
    const combined =
      cleanWhat && cleanWho ? `${cleanWhat} for ${cleanWho}.` : offer.oneLiner;
    onUpdateOffer({
      ...offer,
      whatYouOffer: what,
      whoYouServe: who,
      oneLiner: combined,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="eyebrow">Phase I · Step 1</div>
              <h2 className="section-title">Define Your Offer One-Liner</h2>
              <p className="section-desc">
                Shape it strictly as <strong>[what you offer] for [who]</strong>. Tighten the
                “who” so it could not describe 100 unrelated sellers.
              </p>
            </div>
            <span
              className={`badge ${diagnostic.score === 100 ? 'badge-emerald' : 'badge-warn'} mono`}
            >
              Specificity: {diagnostic.score}%
            </span>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="project-name-input">
              Project / Studio Name
            </label>
            <input
              id="project-name-input"
              className="input"
              value={offer.projectName}
              onChange={(e) => onUpdateOffer({ ...offer, projectName: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="what-offer-input">
              [What you offer]
            </label>
            <input
              id="what-offer-input"
              className="input"
              placeholder="e.g. Mobile-ready menu sites and automated catering/order intake"
              value={offer.whatYouOffer}
              onChange={(e) => handleRebuildOneLiner(e.target.value, offer.whoYouServe)}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="who-serve-input">
              [Who] (Tighten with niche, city, and headcount)
            </label>
            <textarea
              id="who-serve-input"
              className="textarea"
              placeholder="e.g. independent specialty coffee shops and neighborhood bakeries in Austin, TX (<50 employees)"
              style={{ minHeight: 56, resize: 'none' }}
              value={offer.whoYouServe}
              onChange={(e) => handleRebuildOneLiner(offer.whatYouOffer, e.target.value)}
            />
          </div>

          <div className="field-group" style={{ marginBottom: 10 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <label
                className="field-label"
                htmlFor="combined-oneliner-input"
                style={{ margin: 0 }}
              >
                Combined One-Liner (used across Plan &amp; Card)
              </label>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onCopyText(offer.oneLiner, 'Offer One-Liner')}
              >
                <Copy size={12} /> Copy One-Liner
              </button>
            </div>
            <textarea
              id="combined-oneliner-input"
              className="textarea"
              value={offer.oneLiner}
              onChange={(e) => onUpdateOffer({ ...offer, oneLiner: e.target.value })}
            />
          </div>

          {diagnostic.tips.length === 0 ? (
            <div className="callout" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent)" />
              <span>
                Tight offer passed: concrete deliverable + specific buyer niche, reachability context &amp; scope.
              </span>
            </div>
          ) : (
            <div className="callout callout-warn">
              <strong>Refinement hints:</strong> {diagnostic.tips.join(' ')}
            </div>
          )}

          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--ink-secondary)',
                marginBottom: 8,
              }}
            >
              Offer Pressure-Test Criteria
            </div>
            <div className="criteria-grid">
              {[
                {
                  label: 'Deliverable Specified',
                  ok: offer.whatYouOffer.trim().length >= 8,
                },
                {
                  label: 'Geo / Setting Anchored',
                  ok: /\b(TX|CA|NY|IL|WA|Austin|Texas|campus|schools|universities|regional|metro|local|city|neighborhood|region|district|state)\b/i.test(
                    offer.whoYouServe,
                  ),
                },
                {
                  label: 'Specific Buyer Niche',
                  ok: offer.whoYouServe.trim().length >= 16,
                },
                {
                  label: 'Scope / Scale Bounded',
                  ok: /<|\b(under|\d+\s*[-–]\s*\d+|employees|staff|headcount|solo|independent|club|clubs|programs|makers|junior|regional|small)\b/i.test(
                    offer.whoYouServe,
                  ),
                },
              ].map((criterion) => (
                <div key={criterion.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {criterion.ok ? (
                    <CheckCircle2 size={13} color="var(--accent)" />
                  ) : (
                    <AlertCircle size={13} color="var(--warn-ink)" />
                  )}
                  <span style={{ color: criterion.ok ? 'var(--ink-primary)' : 'var(--warn-ink)' }}>
                    {criterion.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">Phase I · Step 1B</div>
              <h3 className="section-title" style={{ fontSize: 18 }}>
                Outreach Signature &amp; Sample Asset
              </h3>
              <p className="section-desc">
                Customize how your name and sample link appear across mobile previews and new openers.
              </p>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="sender-placeholder-input">
              Sender Signature / Name
            </label>
            <input
              id="sender-placeholder-input"
              className="input"
              value={offer.senderPlaceholder}
              onChange={(e) => onUpdateOffer({ ...offer, senderPlaceholder: e.target.value })}
              placeholder="[Your Name]"
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="portfolio-placeholder-input">
              Sample / Portfolio Asset Link
            </label>
            <input
              id="portfolio-placeholder-input"
              className="input"
              value={offer.portfolioPlaceholder}
              onChange={(e) => onUpdateOffer({ ...offer, portfolioPlaceholder: e.target.value })}
              placeholder="[2-min sample URL]"
            />
          </div>

          <div
            style={{
              padding: '10px 12px',
              background: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: 12.5,
              color: 'var(--ink-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span>
              <strong>Active sign-off:</strong> — {offer.senderPlaceholder || '[Your Name]'}
            </span>
            <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
              {offer.portfolioPlaceholder || '[No sample link set]'}
            </span>
          </div>
        </section>
        </div>

        <section className="card">
          <div className="card-header">
            <div>
              <div className="eyebrow">Phase I · Step 2</div>
              <h2 className="section-title">Compare 3 Segments &amp; Pick Week 1</h2>
              <p className="section-desc">
                Choose the one segment you can realistically contact this week with channels you
                already have.
              </p>
            </div>
            <Sparkles size={18} color="var(--accent)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {segments.map((segment, segIdx) => (
              <div
                key={segment.id}
                style={{
                  border: segment.isSelected
                    ? '1.5px solid var(--accent)'
                    : '1px solid var(--border-subtle)',
                  background: segment.isSelected ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-md)',
                  padding: 15,
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: segment.isSelected ? 'var(--accent)' : 'var(--ink-muted)',
                        marginBottom: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>Option 0{segIdx + 1}</span>
                      {segment.isSelected && (
                        <span className="badge badge-emerald" style={{ fontSize: 10, padding: '1px 6px' }}>
                          Primary Week 1
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{segment.name}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                      <span className="badge mono" style={{ fontSize: 11.5 }}>
                        Pool: {segment.estimatedSize}
                      </span>
                      <span className="meta-chip" style={{ fontSize: 11.5 }}>
                        Channel: {segment.channelAccess}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${segment.isSelected ? 'btn-primary' : ''}`}
                    onClick={() => onSelectSegment(segment.id)}
                  >
                    {segment.isSelected ? 'Selected ✓' : 'Select Segment'}
                  </button>
                </div>

                <div className="field-group" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor={`seg-reason-${segment.id}`}>
                    <span>“I’m starting with [segment] because [why I can reach them]”</span>
                    <span
                      className={`badge ${
                        segment.speedToReply === 'High'
                          ? 'badge-emerald'
                          : segment.speedToReply === 'Medium'
                            ? 'badge-warn'
                            : ''
                      }`}
                    >
                      Reply Speed: {segment.speedToReply}
                    </span>
                  </label>
                  <textarea
                    id={`seg-reason-${segment.id}`}
                    className="textarea"
                    style={{ minHeight: 116, background: 'var(--bg-surface)' }}
                    value={segment.reachabilityReason}
                    onChange={(e) => onUpdateSegmentReason(segment.id, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <div>
            <div className="eyebrow">Side-by-Side Market Analysis</div>
            <h2 className="section-title">Week-1 Segment &amp; Channel Comparison Matrix</h2>
            <p className="section-desc">
              Compare addressable pool size, direct decision-maker access, and expected reply speed across candidate markets.
            </p>
          </div>
          <span className="meta-chip badge-emerald">
            Active Focus: {segments.find((s) => s.isSelected)?.name || 'Unselected'}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Market Segment</th>
                <th>Est. Market Pool</th>
                <th>Direct Reachability Channel</th>
                <th>Reply Velocity</th>
                <th>Week-1 Priority</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((seg) => (
                <tr
                  key={`matrix-${seg.id}`}
                  className={seg.isSelected ? 'selected-row' : undefined}
                  style={{
                    fontWeight: seg.isSelected ? 500 : 400,
                  }}
                >
                  <td style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>{seg.name}</td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{seg.estimatedSize}</td>
                  <td style={{ color: 'var(--ink-secondary)' }}>{seg.channelAccess}</td>
                  <td>
                    <span
                      className={`badge ${
                        seg.speedToReply === 'High'
                          ? 'badge-emerald'
                          : seg.speedToReply === 'Medium'
                            ? 'badge-warn'
                            : ''
                      }`}
                    >
                      {seg.speedToReply}
                    </span>
                  </td>
                  <td>
                    {seg.isSelected ? (
                      <span className="badge badge-emerald">Primary (Selected)</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onSelectSegment(seg.id)}
                      >
                        Select for Week 1
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

