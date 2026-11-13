import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Copy,
  Download,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { AuditCheckItem, GtmMetricsTarget, GtmPlanState, LeadCandidate } from '../types/gtm';
import { buildActionPlaybookMarkdown, buildTrackerActivityCsv } from '../utils/exporters';
import { getActiveOpenerText, toSafeHttpUrl } from '../utils/validators';

export type WorkspaceTab = 'plan' | 'offer' | 'clay' | 'outreach' | 'showcase' | 'tracker';

interface PlaybookTask {
  id: string;
  day: string;
  category: string;
  title: string;
  description: string;
  mailto?: { email: string; subject: string; body: string };
  externalUrl?: string;
  externalLabel?: string;
  copyText?: string;
  copyLabel?: string;
  primaryAction?: { label: string; onClick: () => void };
  jumpTab?: WorkspaceTab;
}

interface TrackerAuditViewProps {
  plan: GtmPlanState;
  leads: LeadCandidate[];
  metrics: GtmMetricsTarget;
  auditItems: AuditCheckItem[];
  onUpdateMetrics: (next: GtmMetricsTarget) => void;
  onUpdateLead: (leadId: string, patch: Partial<LeadCandidate>) => void;
  onJumpToTab: (tab: WorkspaceTab) => void;
  onCopyText: (text: string, label: string) => void;
  onDownloadFile: (content: string, filename: string, mimeType: string) => void;
  onToast: (msg: string) => void;
}

const PHASE_TO_TAB: Record<AuditCheckItem['phase'], WorkspaceTab> = {
  'Phase I': 'offer',
  'Phase II': 'clay',
  'Phase III': 'outreach',
  Showcase: 'showcase',
};

const TAB_DEST_LABELS: Record<WorkspaceTab, string> = {
  plan: 'One-Page Plan',
  offer: 'Offer & Segments',
  clay: 'Clay Leads',
  outreach: 'Top-3 Studio',
  showcase: '3:2 Showcase',
  tracker: 'Tracker',
};

export function TrackerAuditView({
  plan,
  leads,
  metrics,
  auditItems,
  onUpdateMetrics,
  onUpdateLead,
  onJumpToTab,
  onCopyText,
  onDownloadFile,
  onToast,
}: TrackerAuditViewProps) {
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(() => {
    try {
      const raw = window.localStorage.getItem('alder_completed_tasks_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [avgDealValue, setAvgDealValue] = useState<number>(750);

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      try {
        window.localStorage.setItem('alder_completed_tasks_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const activeProspects = [
    ...leads.filter((l) => l.status === 'top3'),
    ...leads.filter((l) => l.status === 'watchlist'),
  ].slice(0, 10);
  const totalSent = activeProspects.reduce(
    (sum, l) => sum + (l.outreachTracker?.sentCount ?? 0),
    0,
  );
  const totalReplies = activeProspects.filter((l) => l.outreachTracker?.replied).length;
  const totalAudits = activeProspects.filter((l) => l.outreachTracker?.auditBooked).length;
  const replyRatePerTen = totalSent > 0 ? ((totalReplies / totalSent) * 10).toFixed(1) : '0.0';

  const updateTracker = (
    lead: LeadCandidate,
    patch: Partial<NonNullable<LeadCandidate['outreachTracker']>>,
  ) => {
    const base = lead.outreachTracker ?? {
      sentCount: 0,
      replied: false,
      auditBooked: false,
      notes: '',
    };
    onUpdateLead(lead.id, { outreachTracker: { ...base, ...patch } });
  };

  const cutLeads = leads.filter((l) => l.status === 'cut');
  const top3 = leads.filter((l) => l.status === 'top3').slice(0, 3);
  const bioLength = plan.showcase.description.trim().length;
  const outreachDays = ['Day 2 (Tue)', 'Day 3 (Wed)', 'Day 4 (Thu)'];
  const cutSummaryNames = cutLeads
    .slice(0, 6)
    .map((l) =>
      l.name
        .replace(/\s*\([^)]*\)\s*/g, '')
        .split(/\s+(?:Coffee|Roasters|Bakery|Co\.?)/i)[0]
        .trim(),
    )
    .join(', ');
  const isIntakeServiceOffer = /(menu|catering|intake|site|audit)/i.test(plan.offer.oneLiner);
  const showAlderEstimateBanner =
    plan.offer.projectName.toLowerCase().includes('alder') ||
    /(menu sites|catering\/order intake)/i.test(plan.offer.oneLiner);

  const playbookTasks: PlaybookTask[] = [
    {
      id: 'task-clay',
      day: 'Day 1 (Mon)',
      category: 'Lead Mining',
      title: 'Run Clay Sculptor Lead Mining & Filter Verification',
      description: `Query Clay Sculptor with "${plan.claySpec.sculptorQuery}" · Location: ${plan.claySpec.locationFilter} · Headcount: ${plan.claySpec.headcountFilter}.`,
      primaryAction: {
        label: 'Copy Sculptor Prompt',
        onClick: () => onCopyText(plan.claySpec.sculptorQuery, 'Clay Sculptor Query'),
      },
      jumpTab: 'clay',
    },
    {
      id: 'task-cuts',
      day: 'Day 1 (Mon)',
      category: 'Verification',
      title: `Review ${cutLeads.length} Disqualified Leads & Public Unknowns`,
      description:
        cutLeads.length > 0
          ? `Confirm the ${cutLeads.length} cut companies (${cutSummaryNames}) are disqualified and review public research gaps.`
          : 'Confirm no noisy leads remain in the shortlist and review public research gaps.',
      jumpTab: 'clay',
    },
    ...top3.map((lead, idx): PlaybookTask => {
      const emailMatch = lead.contactChannel.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      const urlMatch = lead.contactChannel.match(/https?:\/\/\S+/i);
      const fallbackUrl = lead.contactChannel.toLowerCase().includes('events page')
        ? `https://${lead.domain}/pages/events`
        : lead.websiteUrl || `https://${lead.domain}`;
      const activeBody = getActiveOpenerText(lead) || lead.openers?.angleAFactFirst || '';
      return {
        id: `task-outreach-${lead.id}`,
        day: outreachDays[idx] ?? `Day ${idx + 2}`,
        category: `Outreach #${idx + 1}`,
        title: `Personalized Outreach — ${lead.name}`,
        description: lead.verifiedFact || lead.whyFit,
        mailto: emailMatch
          ? {
              email: emailMatch[0],
              subject: isIntakeServiceOffer
                ? `Quick intake workflow idea for ${lead.name}`
                : `Quick question for ${lead.name}`,
              body: activeBody,
            }
          : undefined,
        externalUrl: !emailMatch ? toSafeHttpUrl(urlMatch ? urlMatch[0] : fallbackUrl, lead.domain) : undefined,
        externalLabel: !emailMatch
          ? lead.contactChannel.toLowerCase().includes('events')
            ? 'Open Events Page'
            : 'Open Contact Page'
          : undefined,
        copyText: activeBody || undefined,
        copyLabel: `${lead.name} Final Opener`,
        jumpTab: 'outreach',
      };
    }),
    {
      id: 'task-proto',
      day: 'Day 5 (Fri)',
      category: 'Response Handling',
      title: 'Deploy 2-Minute Prototype on Candidate Reply',
      description:
        'When any lead replies ("sure, send a quick mockup"), open the 2-Minute Prototype modal, adjust inputs, and send the staff-ready brief and standalone HTML within 2 hours.',
      jumpTab: 'outreach',
    },
    {
      id: 'task-showcase',
      day: 'Day 5 (Fri)',
      category: 'Showcase Submission',
      title: 'Log Week-1 KPIs & Submit Handshake Showcase',
      description: `Log sent counts, replies, and booked audits. Upload deliverables/gtm-plan-card-1500x1000.png (1500x1000 3:2) and submit the ${bioLength}-character description to Handshake.`,
      primaryAction: {
        label: `Copy ${bioLength}-char Bio`,
        onClick: () => onCopyText(plan.showcase.description, 'Showcase Description'),
      },
      jumpTab: 'showcase',
    },
  ];

  const completedCount = playbookTasks.filter((t) => completedTasks[t.id]).length;
  const totalTasks = playbookTasks.length;
  const percentComplete = Math.round((completedCount / totalTasks) * 100);

  const handleDownloadPlaybook = () => {
    onDownloadFile(
      buildActionPlaybookMarkdown(plan),
      'WEEK_1_ACTION_ASSIGNMENTS.md',
      'text/markdown;charset=utf-8',
    );
    onToast('Downloaded WEEK_1_ACTION_ASSIGNMENTS.md.');
  };

  const handleCopyPlaybook = () => {
    onCopyText(buildActionPlaybookMarkdown(plan), 'Action Playbook Markdown');
  };

  const handleCheckAllTasks = () => {
    const allDone: Record<string, boolean> = {};
    playbookTasks.forEach((t) => {
      allDone[t.id] = true;
    });
    setCompletedTasks(allDone);
    try {
      window.localStorage.setItem('alder_completed_tasks_v1', JSON.stringify(allDone));
    } catch {
      // ignore
    }
    onToast(`All ${totalTasks} operator tasks marked completed! Ready for Handshake Showcase.`);
  };

  const handleResetTasks = () => {
    setCompletedTasks({});
    try {
      window.localStorage.removeItem('alder_completed_tasks_v1');
    } catch {
      // ignore
    }
    onToast(`Playbook checklist reset to 0 / ${totalTasks}.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="grid-2">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="eyebrow">What I’ll Watch · Week-1 Signal</div>
              <h2 className="section-title">Outreach Performance &amp; KPI Target</h2>
              <p className="section-desc">
                Track messages sent, replies per 10 messages, and booked 15-minute audits as you
                execute your plan this week.
              </p>
            </div>
          </div>

          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="stat-tile">
              <div className="stat-value mono">{totalSent} / {metrics.weeklySendGoal}</div>
              <div className="stat-label">Messages Sent</div>
              <div className="progress-track" style={{ height: 5, margin: '8px 0 0' }} aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, Math.round((totalSent / Math.max(1, metrics.weeklySendGoal)) * 100))}%`,
                    opacity: totalSent === 0 ? 0 : 1,
                  }}
                />
              </div>
            </div>
            <div className="stat-tile">
              <div className="stat-value mono" style={{ color: 'var(--accent)' }}>
                {replyRatePerTen}
              </div>
              <div className="stat-label">
                Replies / 10 (Goal: {metrics.targetRepliesPerTen})
              </div>
              <div className="progress-track" style={{ height: 5, margin: '8px 0 0' }} aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, Math.round((Number(replyRatePerTen) / Math.max(1, metrics.targetRepliesPerTen)) * 100))}%`,
                    opacity: Number(replyRatePerTen) === 0 ? 0 : 1,
                  }}
                />
              </div>
            </div>
            <div className="stat-tile">
              <div className="stat-value mono">{totalAudits} / {metrics.targetAuditsBooked}</div>
              <div className="stat-label">
                {isIntakeServiceOffer ? 'Audits Booked' : 'Follow-ups Booked'}
              </div>
              <div className="progress-track" style={{ height: 5, margin: '8px 0 0' }} aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, Math.round((totalAudits / Math.max(1, metrics.targetAuditsBooked)) * 100))}%`,
                    opacity: totalAudits === 0 ? 0 : 1,
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              fontSize: 12.5,
            }}
          >
            {showAlderEstimateBanner ? (
              <>
                <span>
                  <strong>Projected Pipeline Value:</strong> $1,500 – $3,000 (est. $750/client automated intake build)
                </span>
                <span className="mono badge badge-emerald">
                  Target Value / Reply: ~$300
                </span>
              </>
            ) : (
              <>
                <span>
                  <strong>Projected Week-1 Funnel Target:</strong> {metrics.targetRepliesPerTen} replies per{' '}
                  {metrics.weeklySendGoal} outreach sends → {metrics.targetAuditsBooked} booked follow-ups
                </span>
                <span className="mono badge badge-emerald">Focus: {plan.offer.projectName}</span>
              </>
            )}
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="watch-signal-input">
              “What I’ll Watch” One-Line Signal (appears on Plan &amp; Card)
            </label>
            <textarea
              id="watch-signal-input"
              className="textarea"
              style={{ minHeight: 96 }}
              value={metrics.primarySignal}
              onChange={(e) => onUpdateMetrics({ ...metrics, primarySignal: e.target.value })}
            />
          </div>

          <div className="field-group" style={{ marginBottom: 16 }}>
            <label className="field-label" htmlFor="unknowns-summary-input">
              Public Research Gaps Summary (“What couldn’t you find out about them?”)
            </label>
            <textarea
              id="unknowns-summary-input"
              className="textarea"
              style={{ minHeight: 96 }}
              value={metrics.whatUnknownPubliclySummary}
              onChange={(e) =>
                onUpdateMetrics({ ...metrics, whatUnknownPubliclySummary: e.target.value })
              }
            />
          </div>

          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--ink-secondary)',
                marginBottom: 10,
              }}
            >
              Adjust Week-1 KPI Targets
            </div>
            <div className="grid-3" style={{ gap: 10 }}>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor="goal-send-input" style={{ fontSize: 11.5 }}>
                  Send Goal
                </label>
                <input
                  id="goal-send-input"
                  type="number"
                  min={1}
                  max={100}
                  className="input mono"
                  style={{ padding: '6px 9px', fontSize: 13 }}
                  value={metrics.weeklySendGoal}
                  onChange={(e) =>
                    onUpdateMetrics({
                      ...metrics,
                      weeklySendGoal: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor="goal-replies-input" style={{ fontSize: 11.5 }}>
                  Replies / 10 Goal
                </label>
                <input
                  id="goal-replies-input"
                  type="number"
                  min={1}
                  max={10}
                  className="input mono"
                  style={{ padding: '6px 9px', fontSize: 13 }}
                  value={metrics.targetRepliesPerTen}
                  onChange={(e) =>
                    onUpdateMetrics({
                      ...metrics,
                      targetRepliesPerTen: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor="goal-audits-input" style={{ fontSize: 11.5 }}>
                  {isIntakeServiceOffer ? 'Audits Goal' : 'Follow-ups Goal'}
                </label>
                <input
                  id="goal-audits-input"
                  type="number"
                  min={1}
                  max={50}
                  className="input mono"
                  style={{ padding: '6px 9px', fontSize: 13 }}
                  value={metrics.targetAuditsBooked}
                  onChange={(e) =>
                    onUpdateMetrics({
                      ...metrics,
                      targetAuditsBooked: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <div className="eyebrow">Automated Quality Assurance</div>
              <h2 className="section-title">Mission Readiness Audit</h2>
              <p className="section-desc">
                Verifies every mission constraint automatically before you export and submit.
              </p>
            </div>
            <span
              className={`badge mono ${
                auditItems.every((a) => a.passed) ? 'badge-emerald' : 'badge-warn'
              }`}
            >
              {auditItems.filter((a) => a.passed).length} / {auditItems.length} Passed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {auditItems.map((item) => {
              const destTab = PHASE_TO_TAB[item.phase];
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${item.passed ? 'var(--accent-border)' : 'var(--warn-border)'}`,
                    background: item.passed ? 'var(--accent-soft)' : 'var(--warn-bg)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: '1 1 260px' }}>
                    {item.passed ? (
                      <CheckCircle2 size={17} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                    ) : (
                      <AlertCircle size={17} color="var(--warn-ink)" style={{ marginTop: 2, flexShrink: 0 }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                        <span className="mono" style={{ fontSize: 11.5, marginRight: 6 }}>
                          [{item.phase}]
                        </span>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                        {item.detail}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onJumpToTab(destTab)}
                  >
                    Open {TAB_DEST_LABELS[destTab]} <ArrowRight size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <div>
            <div className="eyebrow">Assigned Operator Playbook · Week 1</div>
            <h2 className="section-title">Execution Checklist &amp; Playbook</h2>
            <p className="section-desc">
              Your step-by-step assigned tasks for Week 1. Check off each task as you complete it
              to track your operational progress.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCopyPlaybook}
              title="Copy the complete action assignments in Markdown"
            >
              <Copy size={14} /> Copy Playbook MD
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleDownloadPlaybook}
              title="Download the complete action assignments markdown file"
            >
              <Download size={14} /> Download Playbook
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCheckAllTasks}
              data-testid="playbook-check-all-btn"
              title={`Mark all ${totalTasks} operator tasks as completed`}
            >
              <CheckSquare size={14} /> Check All Done
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleResetTasks}
              data-testid="playbook-reset-btn"
              title="Reset checklist progress"
            >
              Reset
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CheckSquare size={16} color="var(--accent)" />
              <span>Assigned Tasks Progress</span>
            </span>
            <span className="mono badge badge-emerald" data-testid="playbook-progress-badge">
              {completedCount} / {totalTasks} Completed ({percentComplete}%)
            </span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div
              className="progress-fill"
              style={{ width: `${percentComplete}%`, opacity: percentComplete === 0 ? 0 : 1 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {playbookTasks.map((task) => {
            const isDone = Boolean(completedTasks[task.id]);
            return (
              <div key={task.id} className={`task-row ${isDone ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  id={`playbook-${task.id}`}
                  aria-label={`Mark task ${task.title} as completed`}
                  checked={isDone}
                  onChange={() => toggleTask(task.id)}
                  style={{
                    marginTop: 4,
                    width: 18,
                    height: 18,
                    cursor: 'pointer',
                    accentColor: 'var(--accent)',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      className="task-badge"
                      style={{
                        background: isDone ? 'var(--accent-soft)' : undefined,
                        color: isDone ? 'var(--accent)' : undefined,
                        borderColor: isDone ? 'var(--accent-border)' : undefined,
                        fontWeight: 700,
                      }}
                    >
                      {isDone ? '✓ ' : ''}{task.day}
                    </span>
                    <label
                      htmlFor={`playbook-${task.id}`}
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: isDone ? 'line-through' : 'none',
                        color: isDone ? 'var(--ink-muted)' : 'var(--ink-primary)',
                      }}
                    >
                      {task.title}
                    </label>
                  </div>
                  <p
                    style={{
                      margin: '4px 0 10px',
                      fontSize: 13,
                      color: 'var(--ink-secondary)',
                      lineHeight: 1.45,
                    }}
                  >
                    {task.description}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {task.mailto && (
                      <a
                        href={`mailto:${task.mailto.email}?subject=${encodeURIComponent(task.mailto.subject)}&body=${encodeURIComponent(task.mailto.body)}`}
                        className="btn btn-sm btn-primary"
                        style={{ textDecoration: 'none' }}
                      >
                        <Mail size={13} /> Draft Email
                      </a>
                    )}
                    {task.externalUrl && (
                      <a
                        href={task.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        <ExternalLink size={13} /> {task.externalLabel || 'Open Link'}
                      </a>
                    )}
                    {task.copyText && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onCopyText(task.copyText ?? '', task.copyLabel || 'Text')}
                      >
                        <Copy size={13} /> Copy Opener
                      </button>
                    )}
                    {task.primaryAction && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={task.primaryAction.onClick}
                      >
                        <Copy size={13} /> {task.primaryAction.label}
                      </button>
                    )}
                    {task.jumpTab && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          if (task.jumpTab) onJumpToTab(task.jumpTab);
                        }}
                      >
                        Open {TAB_DEST_LABELS[task.jumpTab]} <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <div className="eyebrow">Execution Log</div>
            <h2 className="section-title">Week-1 Outreach Tracker (Top 3 + First 7 Backups)</h2>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                onDownloadFile(
                  buildTrackerActivityCsv(leads),
                  'outreach-activity-log.csv',
                  'text/csv;charset=utf-8',
                )
              }
              title="Download structured CSV activity log for CRM or spreadsheet import"
            >
              <Download size={14} /> Export Activity CSV
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Priority</th>
                <th>Channel</th>
                <th>Sent</th>
                <th>Replied</th>
                <th>{isIntakeServiceOffer ? 'Audit Booked' : 'Follow-up Booked'}</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {activeProspects.map((lead) => {
                const tr = lead.outreachTracker ?? {
                  sentCount: 0,
                  replied: false,
                  auditBooked: false,
                  notes: '',
                };
                return (
                  <tr
                    key={lead.id}
                    style={{
                      background: tr.auditBooked
                        ? 'rgba(236, 253, 245, 0.7)'
                        : tr.replied
                          ? 'rgba(239, 246, 255, 0.6)'
                          : undefined,
                    }}
                  >
                    <td style={{ fontWeight: 600 }}>{lead.name}</td>
                    <td>
                      <span className={`badge ${lead.status === 'top3' ? 'badge-emerald' : ''}`}>
                        {lead.status === 'top3' ? 'Top 3' : 'Backup'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{lead.contactChannel}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        aria-label={`Messages sent to ${lead.name}`}
                        className="input mono"
                        style={{ width: 68, padding: '5px 8px' }}
                        value={tr.sentCount}
                        onChange={(e) =>
                          updateTracker(lead, {
                            sentCount: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Replied status for ${lead.name}`}
                        checked={tr.replied}
                        onChange={(e) => updateTracker(lead, { replied: e.target.checked })}
                        style={{ width: 17, height: 17, accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Audit booked status for ${lead.name}`}
                        checked={tr.auditBooked}
                        onChange={(e) => updateTracker(lead, { auditBooked: e.target.checked })}
                        style={{ width: 17, height: 17, accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ minWidth: 220 }}>
                      <input
                        className="input"
                        style={{ padding: '5px 8px', fontSize: 12.5 }}
                        value={tr.notes}
                        placeholder="Add outreach notes..."
                        onChange={(e) => updateTracker(lead, { notes: e.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <div className="eyebrow">Pipeline Economics &amp; Conversion Modeling</div>
            <h2 className="section-title">Outreach Conversion Funnel &amp; Revenue Projections</h2>
            <p className="section-desc">
              Visualizes step-by-step funnel conversion from initial prospecting to closed engagements with live pipeline valuation.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="deal-size-input" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-secondary)' }}>
              Avg Client Value:
            </label>
            <div style={{ position: 'relative', width: 100 }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--ink-muted)' }}>$</span>
              <input
                id="deal-size-input"
                type="number"
                min={50}
                max={50000}
                step={50}
                className="input mono"
                style={{ paddingLeft: 20, paddingRight: 6, paddingTop: 4, paddingBottom: 4, fontSize: 13 }}
                value={avgDealValue}
                onChange={(e) => setAvgDealValue(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>
        </div>

        <div className="grid-4" style={{ gap: 12, marginBottom: 16 }}>
          <div className="stat-tile" style={{ padding: 12 }}>
            <div className="funnel-kpi-value mono" style={{ fontSize: 22, fontWeight: 800 }}>
              {leads.length}
            </div>
            <div className="stat-label">1. Sourced Prospects</div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>100% addressable pool</div>
          </div>

          <div className="stat-tile" style={{ padding: 12 }}>
            <div className="funnel-kpi-value mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-primary)' }}>
              {totalSent}
            </div>
            <div className="stat-label">2. Outreach Contacted</div>
            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
              {leads.length > 0 ? Math.round((totalSent / leads.length) * 100) : 0}% contacted
            </div>
          </div>

          <div className="stat-tile" style={{ padding: 12 }}>
            <div className="funnel-kpi-value mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
              {totalReplies}
            </div>
            <div className="stat-label">3. Replies Received</div>
            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
              {totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0}% reply rate
            </div>
          </div>

          <div className="stat-tile" style={{ padding: 12 }}>
            <div className="funnel-kpi-value mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
              {totalAudits}
            </div>
            <div className="stat-label">4. Engagements Booked</div>
            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
              {totalReplies > 0 ? Math.round((totalAudits / totalReplies) * 100) : 0}% booking rate
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent-border)',
            borderRadius: 'var(--radius-md)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent)' }}>
              Commercial Pipeline Value
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-secondary)', marginTop: 2 }}>
              Active Pipeline: <strong>${(totalAudits * avgDealValue).toLocaleString()}</strong> · Goal Pipeline: <strong>${(metrics.targetAuditsBooked * avgDealValue).toLocaleString()}</strong>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              onDownloadFile(
                buildTrackerActivityCsv(leads),
                'outreach-activity-log.csv',
                'text/csv;charset=utf-8',
              )
            }
          >
            <Download size={13} /> Export Activity CSV
          </button>
        </div>
      </section>
    </div>
  );
}

