import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Laptop,
  Mail,
  RefreshCw,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LeadCandidate, OutreachOpenerPair } from '../types/gtm';
import {
  MAX_OPENER_WORDS,
  analyzeOpenerQuality,
  formatStudioEmail,
  generateCadenceTouches,
  getActiveOpenerText,
  toSafeHttpUrl,
} from '../utils/validators';
import { ProspectMockupModal } from './ProspectMockupModal';

interface OutreachStudioProps {
  top3Leads: LeadCandidate[];
  activePrimaryLeadId: string;
  accentColor: string;
  projectName?: string;
  senderPlaceholder?: string;
  onSelectPrimaryLead: (leadId: string) => void;
  onUpdateLead: (leadId: string, patch: Partial<LeadCandidate>) => void;
  onDownloadFile: (content: string, filename: string, mimeType: string) => void;
  onCopyText: (text: string, label: string) => void;
  onToast?: (msg: string) => void;
  onJumpToClay?: () => void;
}

function extractFirstEmail(channel: string): string | null {
  const match = channel.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function getSubjectOptions(lead: LeadCandidate): string[] {
  if (lead.name.includes('Sugarwolf')) {
    return [
      'Sugarwolf downtown opening + quick catering idea',
      '48h advance catering pickup flow on sugarwolfbakery.com',
      'Lightweight pre-order prototype for Sugarwolf',
    ];
  }
  if (lead.name.includes('Rockman')) {
    return [
      'Slated ABIA airport kiosk + custom cake order intake',
      'Quick catering inquiry workflow for rockmanatx.com',
      'Lightweight custom cake prototype for Rockman',
    ];
  }
  if (lead.name.includes('Desnudo')) {
    return [
      'Slated Concourse M spot + tiered espresso bar intake',
      'Tiered catering quote flow for desnudocoffee.com',
      'Lightweight mobile coffee bar prototype for Desnudo',
    ];
  }
  return [
    `Quick pre-order / intake idea for ${lead.name}`,
    `Lightweight customer flow on ${lead.domain}`,
    `${lead.neighborhood} launch note + 2-minute prototype`,
  ];
}

export function OutreachStudio({
  top3Leads,
  activePrimaryLeadId,
  accentColor,
  projectName = 'Alder & Code Studio',
  senderPlaceholder = '[Your Name]',
  onSelectPrimaryLead,
  onUpdateLead,
  onDownloadFile,
  onCopyText,
  onToast,
  onJumpToClay,
}: OutreachStudioProps) {
  const [mockupLeadId, setMockupLeadId] = useState<string | null>(null);
  const [speakingLeadId, setSpeakingLeadId] = useState<string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState<Record<string, boolean>>({});
  const [selectedSubjectIdx, setSelectedSubjectIdx] = useState<Record<string, number>>({});
  const [activeTouch, setActiveTouch] = useState<Record<string, 'touch1' | 'touch2' | 'touch3'>>({});

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const activeMockupLead = top3Leads.find((l) => l.id === mockupLeadId);

  const handleToggleSpeak = (leadId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onCopyText(text, 'Message for Read-Aloud');
      return;
    }
    if (window.speechSynthesis.speaking && speakingLeadId === leadId) {
      window.speechSynthesis.cancel();
      setSpeakingLeadId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/—\s*\[[^\]]+\]/gi, `from ${projectName}.`);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingLeadId(null);
    utterance.onerror = () => setSpeakingLeadId(null);
    setSpeakingLeadId(leadId);
    window.speechSynthesis.speak(utterance);
  };

  const toggleMobilePreview = (leadId: string) => {
    setShowMobilePreview((prev) => ({ ...prev, [leadId]: !prev[leadId] }));
  };

  const updateOpener = (lead: LeadCandidate, patch: Partial<OutreachOpenerPair>) => {
    const existing: OutreachOpenerPair = lead.openers ?? {
      angleALabel: 'Angle A — Leads with the verified fact',
      angleAFactFirst: '',
      angleBLabel: 'Angle B — Leads with what I can do for them',
      angleBValueFirst: '',
      selectedAngle: 'A',
      customEditedMessage: '',
    };
    const prevSelectedText =
      existing.selectedAngle === 'A' ? existing.angleAFactFirst : existing.angleBValueFirst;
    const isSynced = existing.customEditedMessage.trim() === prevSelectedText.trim();

    const nextOpeners = { ...existing, ...patch };
    if (
      isSynced &&
      patch.customEditedMessage === undefined &&
      ((existing.selectedAngle === 'A' && patch.angleAFactFirst !== undefined) ||
        (existing.selectedAngle === 'B' && patch.angleBValueFirst !== undefined))
    ) {
      nextOpeners.customEditedMessage =
        existing.selectedAngle === 'A' ? nextOpeners.angleAFactFirst : nextOpeners.angleBValueFirst;
    }

    onUpdateLead(lead.id, { openers: nextOpeners });
  };

  const selectAngle = (lead: LeadCandidate, angle: 'A' | 'B') => {
    const existing = lead.openers;
    if (!existing) return;
    const text = angle === 'A' ? existing.angleAFactFirst : existing.angleBValueFirst;
    updateOpener(lead, {
      selectedAngle: angle,
      customEditedMessage: text,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div className="card-header" style={{ marginBottom: top3Leads.length > 0 ? 12 : 0 }}>
          <div>
            <div className="eyebrow">Phase III · Specific Facts &amp; Two-Angle Openers</div>
            <h2 className="section-title">Top-3 Verified Fact Dossier &amp; Outreach Studio</h2>
            <p className="section-desc">
              Each candidate pairs one verifiable, dated fact with two neutral opening angles
              strictly under <strong>60 words</strong>—no exaggeration, no invented details, no
              false familiarity. Pick the one that sounds like you.
            </p>
          </div>
          <span className={`badge ${top3Leads.length === 3 ? 'badge-emerald' : 'badge-warn'} mono`}>
            {top3Leads.length} / 3 Top Picks
          </span>
        </div>

        {top3Leads.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-muted)' }}>
              Jump to Candidate:
            </span>
            {top3Leads.map((lead, idx) => {
              const isPrimary = lead.id === activePrimaryLeadId;
              return (
                <button
                  key={`jump-${lead.id}`}
                  type="button"
                  className={`btn btn-sm ${isPrimary ? 'btn-primary' : ''}`}
                  onClick={() => {
                    document
                      .getElementById(`outreach-card-${lead.id}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <span className="mono">#{idx + 1}</span>
                  <span>{lead.name.split(' ')[0]}</span>
                  <span className="mono" style={{ fontSize: 11, opacity: isPrimary ? 0.9 : 0.65 }}>
                    {analyzeOpenerQuality(getActiveOpenerText(lead), lead).wordCount}w
                  </span>
                  {isPrimary && <Check size={12} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {top3Leads.length === 0 ? (
        <div className="callout callout-warn" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>
            <strong>No Top-3 candidates selected yet.</strong> Pick up to 3 leads as Top 3 in the Clay table to draft tailored opening angles.
          </span>
          {onJumpToClay && (
            <button type="button" className="btn btn-sm" onClick={onJumpToClay}>
              Go to 3. Clay Leads
            </button>
          )}
        </div>
      ) : (
        top3Leads.map((lead, idx) => {
        const openers = lead.openers ?? {
          angleALabel: 'Angle A — Leads with the verified fact',
          angleAFactFirst: '',
          angleBLabel: 'Angle B — Leads with what I can do for them',
          angleBValueFirst: '',
          selectedAngle: 'A' as const,
          customEditedMessage: '',
        };
        const diagA = analyzeOpenerQuality(openers.angleAFactFirst, lead);
        const diagB = analyzeOpenerQuality(openers.angleBValueFirst, lead);
        const finalMsg = getActiveOpenerText(lead);
        const diagFinal = analyzeOpenerQuality(finalMsg, lead);
        const isPrimary = lead.id === activePrimaryLeadId;
        const emailAddr = extractFirstEmail(lead.contactChannel);
        const cadence = generateCadenceTouches(lead, senderPlaceholder);
        const currentTouchKey = activeTouch[lead.id] || 'touch1';
        const activeTouchText =
          currentTouchKey === 'touch1'
            ? finalMsg
            : currentTouchKey === 'touch2'
              ? cadence.touch2Bump
              : cadence.touch3Closeout;
        const activeTouchLabel =
          currentTouchKey === 'touch1'
            ? 'Initial Opener'
            : currentTouchKey === 'touch2'
              ? 'Day 3 Bump'
              : 'Day 7 Closeout';

        return (
          <section
            key={lead.id}
            id={`outreach-card-${lead.id}`}
            className="card"
            style={
              isPrimary
                ? {
                    borderColor: 'var(--accent-border)',
                    boxShadow:
                      'inset 4px 0 0 var(--accent), 0 4px 20px color-mix(in srgb, var(--accent) 10%, transparent)',
                  }
                : undefined
            }
          >
            <div className="card-header">
              <div>
                <div className="eyebrow">Candidate #{idx + 1} · {lead.neighborhood}</div>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{lead.name}</h3>
                <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 3, overflowWrap: 'anywhere' }}>
                  Channel: <strong>{lead.contactChannel}</strong> ·{' '}
                  <a href={toSafeHttpUrl(lead.websiteUrl, lead.domain)} target="_blank" rel="noreferrer">
                    {lead.domain} <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setMockupLeadId(lead.id)}
                >
                  <Laptop size={14} /> Preview 2-Min Prototype
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${isPrimary ? 'btn-primary' : ''}`}
                  onClick={() => onSelectPrimaryLead(lead.id)}
                >
                  {isPrimary ? (
                    <>
                      <Check size={14} /> Featured on 1-Page Plan &amp; Card
                    </>
                  ) : (
                    'Feature on 1-Page Plan'
                  )}
                </button>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 14,
                marginBottom: 16,
              }}
            >
              <div className="grid-2" style={{ alignItems: 'stretch' }}>
                <div className="field-group" style={{ marginBottom: 0, height: '100%' }}>
                  <label className="field-label" htmlFor={`fact-${lead.id}`}>
                    <span>Verified Current Fact (Checkable, Non-Generic)</span>
                    <span className="badge badge-emerald">{lead.factDate || 'Add Date'}</span>
                  </label>
                  <textarea
                    id={`fact-${lead.id}`}
                    className="textarea"
                    style={{ flex: 1, minHeight: 118, background: 'var(--bg-surface)' }}
                    value={lead.verifiedFact ?? ''}
                    onChange={(e) => onUpdateLead(lead.id, { verifiedFact: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label" htmlFor={`date-${lead.id}`}>
                      When It Happened / Published
                    </label>
                    <input
                      id={`date-${lead.id}`}
                      className="input"
                      value={lead.factDate ?? ''}
                      onChange={(e) => onUpdateLead(lead.id, { factDate: e.target.value })}
                    />
                  </div>
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label" htmlFor={`url-${lead.id}`}>
                      <span>Direct Public Source URL</span>
                      {lead.factSourceUrl && (
                        <a
                          href={toSafeHttpUrl(lead.factSourceUrl, lead.domain)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          Verify link <ExternalLink size={11} />
                        </a>
                      )}
                    </label>
                    <input
                      id={`url-${lead.id}`}
                      className="input"
                      value={lead.factSourceUrl ?? ''}
                      onChange={(e) => onUpdateLead(lead.id, { factSourceUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div
                style={{
                  border:
                    openers.selectedAngle === 'A'
                      ? '1.5px solid var(--accent)'
                      : '1px solid var(--border-subtle)',
                  background: openers.selectedAngle === 'A' ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
              >
                <div className="field-label" style={{ marginBottom: 8 }}>
                  <span>{openers.angleALabel}</span>
                  <span
                    className={`badge mono ${
                      diagA.underWordLimit ? 'badge-emerald' : 'badge-danger'
                    }`}
                  >
                    {diagA.wordCount} / {MAX_OPENER_WORDS - 1} max words
                  </span>
                </div>
                <textarea
                  aria-label={`Angle A for ${lead.name}`}
                  className="textarea"
                  style={{ minHeight: 146, background: 'var(--bg-surface)' }}
                  value={openers.angleAFactFirst}
                  onChange={(e) => updateOpener(lead, { angleAFactFirst: e.target.value })}
                />
                {diagA.warnings.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--danger-ink)', marginTop: 6 }}>
                    {diagA.warnings.join(' ')}
                  </div>
                )}
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${openers.selectedAngle === 'A' ? 'btn-primary' : ''}`}
                    onClick={() => selectAngle(lead, 'A')}
                  >
                    {openers.selectedAngle === 'A' ? (
                      <>
                        <Check size={13} /> Selected Angle A
                      </>
                    ) : (
                      'Pick Angle A'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onCopyText(openers.angleAFactFirst, `${lead.name} Angle A`)}
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              </div>

              <div
                style={{
                  border:
                    openers.selectedAngle === 'B'
                      ? '1.5px solid var(--accent)'
                      : '1px solid var(--border-subtle)',
                  background: openers.selectedAngle === 'B' ? 'var(--accent-soft)' : 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
              >
                <div className="field-label" style={{ marginBottom: 8 }}>
                  <span>{openers.angleBLabel}</span>
                  <span
                    className={`badge mono ${
                      diagB.underWordLimit ? 'badge-emerald' : 'badge-danger'
                    }`}
                  >
                    {diagB.wordCount} / {MAX_OPENER_WORDS - 1} max words
                  </span>
                </div>
                <textarea
                  aria-label={`Angle B for ${lead.name}`}
                  className="textarea"
                  style={{ minHeight: 146, background: 'var(--bg-surface)' }}
                  value={openers.angleBValueFirst}
                  onChange={(e) => updateOpener(lead, { angleBValueFirst: e.target.value })}
                />
                {diagB.warnings.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--danger-ink)', marginTop: 6 }}>
                    {diagB.warnings.join(' ')}
                  </div>
                )}
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${openers.selectedAngle === 'B' ? 'btn-primary' : ''}`}
                    onClick={() => selectAngle(lead, 'B')}
                  >
                    {openers.selectedAngle === 'B' ? (
                      <>
                        <Check size={13} /> Selected Angle B
                      </>
                    ) : (
                      'Pick Angle B'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onCopyText(openers.angleBValueFirst, `${lead.name} Angle B`)}
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div
                className="field-label"
                style={{
                  marginBottom: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                <span>Tested Cold Email Subject Lines</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => {
                      const curSubj = getSubjectOptions(lead)[selectedSubjectIdx[lead.id] ?? 0];
                      onCopyText(curSubj, `${lead.name} Subject Line`);
                    }}
                    title="Copy currently selected subject line"
                  >
                    <Copy size={11} /> Copy Subject
                  </button>
                  <span className="badge mono">3 Angle Variants</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {getSubjectOptions(lead).map((subj, sIdx) => {
                  const active = (selectedSubjectIdx[lead.id] ?? 0) === sIdx;
                  return (
                    <button
                      key={subj}
                      type="button"
                      className={`subject-btn ${active ? 'active' : ''}`}
                      onClick={() =>
                        setSelectedSubjectIdx((prev) => ({ ...prev, [lead.id]: sIdx }))
                      }
                    >
                      <span className="mono" style={{ fontSize: 11, opacity: 0.8 }}>
                        #{sIdx + 1}
                      </span>{' '}
                      {subj}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div
                className="field-label"
                style={{
                  marginBottom: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                <span>Outreach Sequence Cadence (3 Touches)</span>
                <span className="badge mono">Day 1 · Day 3 · Day 7</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${currentTouchKey === 'touch1' ? 'btn-primary' : ''}`}
                  onClick={() => setActiveTouch((prev) => ({ ...prev, [lead.id]: 'touch1' }))}
                >
                  Touch 1 · Verified Opener ({diagFinal.wordCount}w)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${currentTouchKey === 'touch2' ? 'btn-primary' : ''}`}
                  onClick={() => setActiveTouch((prev) => ({ ...prev, [lead.id]: 'touch2' }))}
                >
                  Touch 2 · Day 3 Bump
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${currentTouchKey === 'touch3' ? 'btn-primary' : ''}`}
                  onClick={() => setActiveTouch((prev) => ({ ...prev, [lead.id]: 'touch3' }))}
                >
                  Touch 3 · Day 7 Closeout
                </button>
              </div>
            </div>

            {currentTouchKey !== 'touch1' && (
              <div
                style={{
                  marginBottom: 12,
                  padding: '12px 14px',
                  background: 'var(--accent-soft)',
                  border: '1px solid var(--accent-border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <span>
                    {currentTouchKey === 'touch2'
                      ? 'Touch 2 · Day 3 Quick Bump'
                      : 'Touch 3 · Day 7 Polite Closeout'}
                  </span>
                  <span className="badge badge-emerald mono">
                    {activeTouchText.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-primary)' }}>
                  {activeTouchText}
                </div>
              </div>
            )}

            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor={`final-msg-${lead.id}`}>
                <span>
                  Final Polish — Read Aloud Check (Angle {openers.selectedAngle} active)
                </span>
                <span
                  className={`badge mono ${
                    diagFinal.warnings.length === 0 ? 'badge-emerald' : 'badge-danger'
                  }`}
                >
                  {diagFinal.wordCount} words{' '}
                  {diagFinal.underWordLimit
                    ? `✓ Under 60 (${MAX_OPENER_WORDS - 1 - diagFinal.wordCount} left)`
                    : '⚠ Too Long'}
                </span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  id={`final-msg-${lead.id}`}
                  className="textarea"
                  style={{ width: '100%', minHeight: 104 }}
                  value={openers.customEditedMessage}
                  onChange={(e) => updateOpener(lead, { customEditedMessage: e.target.value })}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        onCopyText(activeTouchText, `${lead.name} ${activeTouchLabel}`)
                      }
                    >
                      <Copy size={14} /> Copy{' '}
                      {currentTouchKey === 'touch1' ? 'Final Opener' : activeTouchLabel}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${speakingLeadId === lead.id ? 'btn-primary' : ''}`}
                      onClick={() => handleToggleSpeak(lead.id, activeTouchText)}
                      title="Listen to conversational tone via browser text-to-speech"
                    >
                      {speakingLeadId === lead.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      {speakingLeadId === lead.id ? 'Stop Voice' : 'Listen Read-Aloud'}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${showMobilePreview[lead.id] ? 'btn-primary' : ''}`}
                      onClick={() => toggleMobilePreview(lead.id)}
                      title="Toggle mobile phone inbox mockup"
                    >
                      <Smartphone size={13} />
                      {showMobilePreview[lead.id] ? 'Hide Phone' : 'Phone Preview'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => selectAngle(lead, openers.selectedAngle)}
                    >
                      <RefreshCw size={13} /> Sync Angle {openers.selectedAngle}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {emailAddr && (
                      <>
                        <a
                          className="btn btn-sm"
                          href={`mailto:${emailAddr}?subject=${encodeURIComponent(
                            getSubjectOptions(lead)[selectedSubjectIdx[lead.id] ?? 0],
                          )}&body=${encodeURIComponent(activeTouchText)}`}
                        >
                          <Mail size={13} /> Draft Email
                        </a>
                        <a
                          className="btn btn-sm"
                          href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                            emailAddr,
                          )}&su=${encodeURIComponent(
                            getSubjectOptions(lead)[selectedSubjectIdx[lead.id] ?? 0],
                          )}&body=${encodeURIComponent(activeTouchText)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open directly in Gmail Web composer"
                        >
                          Gmail Web <ExternalLink size={11} />
                        </a>
                      </>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        const currentSent = lead.outreachTracker?.sentCount ?? 0;
                        const base = lead.outreachTracker ?? {
                          sentCount: 0,
                          replied: false,
                          auditBooked: false,
                          notes: '',
                        };
                        onUpdateLead(lead.id, {
                          outreachTracker: { ...base, sentCount: currentSent + 1 },
                        });
                        const msg = `Logged outreach sent to ${lead.name} (Total: ${currentSent + 1})`;
                        if (onToast) onToast(msg);
                        else onCopyText(msg, 'Sent Log');
                      }}
                      data-testid={`log-sent-${lead.id}`}
                      title="Log that you sent this outreach message to update your KPI tracker"
                    >
                      <CheckCircle2 size={13} color="var(--accent)" />
                      Log Sent ({lead.outreachTracker?.sentCount ?? 0})
                    </button>
                  </div>
                </div>
              </div>
              {diagFinal.warnings.length > 0 && (
                <div className="callout callout-warn" style={{ marginTop: 8 }}>
                  {diagFinal.warnings.join(' ')}
                </div>
              )}

              {showMobilePreview[lead.id] && (
                <div className="mobile-preview-stage">
                  <div className="mobile-preview-stage-label">
                    <Smartphone size={13} color="var(--accent)" />
                    <span>Live Mobile Inbox Simulation (375px viewport)</span>
                  </div>
                  <div className="mobile-preview-frame" data-testid={`phone-preview-${lead.id}`}>
                    <div className="mobile-preview-notch" aria-hidden="true" />
                    <div className="mobile-preview-header">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <span>
                          <strong>From:</strong> {senderPlaceholder || '[Your Name]'} &lt;
                          {formatStudioEmail(projectName)}&gt;
                        </span>
                        <span className="mono" style={{ fontSize: 11 }}>
                          9:41 AM
                        </span>
                      </div>
                      <div>
                        <strong>To:</strong> {emailAddr || lead.contactChannel}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          color: 'var(--ink-primary)',
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        Subject: {getSubjectOptions(lead)[selectedSubjectIdx[lead.id] ?? 0]}
                      </div>
                    </div>
                    <div className="mobile-preview-body">{activeTouchText}</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })
      )}

      {activeMockupLead && (
        <ProspectMockupModal
          lead={activeMockupLead}
          accentColor={accentColor}
          projectName={projectName}
          onClose={() => setMockupLeadId(null)}
          onCopyText={onCopyText}
          onDownloadFile={onDownloadFile}
        />
      )}
    </div>
  );
}
