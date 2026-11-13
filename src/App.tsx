import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Compass,
  Database,
  FileText,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react';
import { DEFAULT_GTM_PLAN } from './data/austinCoffeePlan';
import { PLAN_PRESETS } from './data/presets';
import { GtmPlanState, LeadCandidate, LeadStatus } from './types/gtm';
import {
  buildActionPlaybookMarkdown,
  buildLeadsCsv,
  buildOnePagePlanHtml,
  buildOnePagePlanMarkdown,
  buildPresentationHtml,
  buildShowcaseSubmissionText,
} from './utils/exporters';
import { createZipBlob } from './utils/zip';
import {
  createDefaultOpenersForLead,
  isValidGtmPlanState,
  runMissionReadinessAudit,
} from './utils/validators';
import { HeaderBar } from './components/HeaderBar';
import { OnePagePlanView } from './components/OnePagePlanView';
import { OfferSegmentLab } from './components/OfferSegmentLab';
import { ClayLeadsLab } from './components/ClayLeadsLab';
import { OutreachStudio } from './components/OutreachStudio';
import { ACCENT_THEMES, ShowcaseCardStudio } from './components/ShowcaseCardStudio';
import { TrackerAuditView, WorkspaceTab } from './components/TrackerAuditView';
import { PresentationModal } from './components/PresentationModal';
import { DeliverablesModal } from './components/DeliverablesModal';

const STORAGE_KEY = 'alder_gtm_plan_v1';
const PRESET_KEY = 'alder_gtm_preset_v1';

function loadInitialPlan(): GtmPlanState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GTM_PLAN;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidGtmPlanState(parsed)) {
      return DEFAULT_GTM_PLAN;
    }
    return parsed;
  } catch {
    return DEFAULT_GTM_PLAN;
  }
}

function loadInitialPresetId(): string {
  try {
    return window.localStorage.getItem(PRESET_KEY) || PLAN_PRESETS[0].id;
  } catch {
    return PLAN_PRESETS[0].id;
  }
}

export function App() {
  const [plan, setPlan] = useState<GtmPlanState>(loadInitialPlan);
  const [activePresetId, setActivePresetId] = useState<string>(loadInitialPresetId);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('plan');
  const [trackerResetNonce, setTrackerResetNonce] = useState(0);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [isDeliverablesOpen, setIsDeliverablesOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      window.localStorage.setItem(PRESET_KEY, activePresetId);
    } catch {
      // Ignore storage quota errors in restricted browser contexts.
    }
  }, [plan, activePresetId]);

  useEffect(() => {
    const theme =
      ACCENT_THEMES.find((t) => t.hex.toLowerCase() === plan.offer.accentColor.toLowerCase()) ??
      ACCENT_THEMES[0];
    const root = document.documentElement;
    root.style.setProperty('--accent', theme.hex);
    root.style.setProperty('--accent-hover', theme.hover);
    root.style.setProperty('--accent-soft', theme.soft);
    root.style.setProperty('--accent-border', theme.border);
  }, [plan.offer.accentColor]);

  useEffect(() => {
    document.title = `${plan.offer.projectName} — Go-to-Market Studio`;
  }, [plan.offer.projectName]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const auditItems = useMemo(() => runMissionReadinessAudit(plan), [plan]);
  const top3Leads = useMemo(
    () => plan.leads.filter((lead) => lead.status === 'top3'),
    [plan.leads],
  );
  const activePreset = PLAN_PRESETS.find((p) => p.id === activePresetId) ?? PLAN_PRESETS[0];

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`Copied ${label} to clipboard.`);
    } catch {
      setToast(`Ready to copy ${label} (clipboard access blocked by browser).`);
    }
  };

  const handleDownloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setToast(`Downloaded ${filename}.`);
  };

  const handleDownloadZipBundle = () => {
    try {
      const top3Count = plan.leads.filter((l) => l.status === 'top3').length;
      const watchlistCount = plan.leads.filter((l) => l.status === 'watchlist').length;
      const cutCount = plan.leads.filter((l) => l.status === 'cut').length;
      const readme = [
        `========================================================================`,
        `${plan.offer.projectName} — Go-to-Market Plan & Execution Deliverables`,
        `========================================================================`,
        ``,
        `Generated directly from the GTM Studio workspace.`,
        ``,
        `INCLUDED FILES:`,
        `1. GTM_PLAN_ONE_PAGE.md         - The exact 6-bracket One-Page Plan for assignment submission.`,
        `2. GTM_PLAN_DETAILED.md         - Comprehensive plan with full ${plan.leads.length}-lead table, cuts & openers.`,
        `3. WEEK_1_ACTION_ASSIGNMENTS.md - Day-by-day ${4 + top3Count}-task operator execution playbook.`,
        `4. showcase-submission.md       - Handshake Showcase submission kit with <=500-char bio.`,
        `5. clay-shortlist-20.csv        - Sourced ${plan.leads.length} leads (${top3Count} Top Picks, ${watchlistCount} Watchlist, ${cutCount} Cuts).`,
        `6. ONE_PAGE_GTM_PLAN.html       - Self-contained, printable styled HTML one-page plan.`,
        `7. PRESENTATION_DECK.html       - Standalone 6-slide executive presentation deck with controls.`,
        `8. workspace-backup.json        - Full workspace state backup for import/rehydration.`,
        ``,
        `Offer: ${plan.offer.oneLiner}`,
        `Segment: ${plan.segments.find((s) => s.isSelected)?.name ?? ''}`,
        `Primary Signal: ${plan.metrics.primarySignal}`,
      ].join('\r\n');

      const files = [
        { filename: 'README.txt', content: readme },
        { filename: 'GTM_PLAN_ONE_PAGE.md', content: buildOnePagePlanMarkdown(plan, false) },
        { filename: 'GTM_PLAN_DETAILED.md', content: buildOnePagePlanMarkdown(plan, true) },
        { filename: 'WEEK_1_ACTION_ASSIGNMENTS.md', content: buildActionPlaybookMarkdown(plan) },
        { filename: 'showcase-submission.md', content: buildShowcaseSubmissionText(plan) },
        { filename: 'clay-shortlist-20.csv', content: buildLeadsCsv(plan.leads) },
        { filename: 'ONE_PAGE_GTM_PLAN.html', content: buildOnePagePlanHtml(plan) },
        { filename: 'PRESENTATION_DECK.html', content: buildPresentationHtml(plan) },
        { filename: 'workspace-backup.json', content: JSON.stringify(plan, null, 2) },
      ];

      const zipBlob = createZipBlob(files);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      const slug =
        plan.offer.projectName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'gtm-studio';
      link.download = `${slug}-gtm-bundle.zip`;
      link.click();
      URL.revokeObjectURL(url);
      setToast('Downloaded complete deliverables ZIP bundle.');
    } catch {
      setToast('Failed to create ZIP bundle.');
    }
  };

  const handleResetDefaults = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(PRESET_KEY);
    window.localStorage.removeItem('alder_completed_tasks_v1');
    setTrackerResetNonce((n) => n + 1);
    setActivePresetId(PLAN_PRESETS[0].id);
    setPlan(DEFAULT_GTM_PLAN);
    setToast('Workspace reset to verified Austin coffee & bakery defaults.');
  };

  const handleSwitchPreset = (presetId: string) => {
    const preset = PLAN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    window.localStorage.removeItem('alder_completed_tasks_v1');
    setTrackerResetNonce((n) => n + 1);
    setActivePresetId(preset.id);
    setPlan(preset.buildState());
    setToast(`Loaded preset: ${preset.label}`);
  };

  const handleImportJson = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!isValidGtmPlanState(parsed)) {
        setToast('Invalid workspace JSON structure.');
        return;
      }
      window.localStorage.removeItem('alder_completed_tasks_v1');
      setTrackerResetNonce((n) => n + 1);
      setPlan(parsed);
      setToast(`Loaded ${parsed.offer.projectName} workspace backup.`);
    } catch {
      setToast('Could not parse JSON workspace file.');
    }
  };

  const handleChangeLeadStatus = (
    leadId: string,
    status: LeadStatus,
    cutReason?: string,
  ) => {
    setPlan((prev) => {
      const nextLeads = prev.leads.map((lead) => {
        if (lead.id !== leadId) return lead;
        const baseOpeners =
          status === 'top3' && !lead.openers
            ? createDefaultOpenersForLead(lead, prev.offer)
            : lead.openers;
        return {
          ...lead,
          status,
          cutReason: status === 'cut' ? cutReason : undefined,
          openers: baseOpeners,
        };
      });

      const remainingTop3 = nextLeads.filter((l) => l.status === 'top3');
      const primaryStillTop3 = remainingTop3.some((l) => l.id === prev.activePrimaryOpenerLeadId);

      return {
        ...prev,
        leads: nextLeads,
        activePrimaryOpenerLeadId: primaryStillTop3
          ? prev.activePrimaryOpenerLeadId
          : remainingTop3[0]?.id ?? prev.activePrimaryOpenerLeadId,
      };
    });
  };

  const handleUpdateLead = (leadId: string, patch: Partial<LeadCandidate>) => {
    setPlan((prev) => ({
      ...prev,
      leads: prev.leads.map((lead) => (lead.id === leadId ? { ...lead, ...patch } : lead)),
    }));
  };

  const handleSelectTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const tabs: { id: WorkspaceTab; label: string; icon: typeof FileText }[] = [
    { id: 'plan', label: '1. One-Page Plan', icon: FileText },
    { id: 'offer', label: '2. Offer & Segments', icon: Compass },
    { id: 'clay', label: `3. Clay 20 Leads (${plan.leads.length})`, icon: Database },
    { id: 'outreach', label: `4. Top-3 Outreach (${top3Leads.length})`, icon: MessageSquare },
    { id: 'showcase', label: '5. 3:2 Card & Showcase', icon: ImageIcon },
    { id: 'tracker', label: '6. Tracker & Audit', icon: BarChart3 },
  ];

  return (
    <div className="app-shell">
      <HeaderBar
        projectName={plan.offer.projectName}
        activePresetId={activePresetId}
        auditItems={auditItems}
        onSwitchPreset={handleSwitchPreset}
        onExportJson={() =>
          handleDownloadFile(
            JSON.stringify(plan, null, 2),
            'gtm-workspace-backup.json',
            'application/json;charset=utf-8',
          )
        }
        onImportJson={handleImportJson}
        onCopyOnePageMarkdown={() =>
          handleCopyText(buildOnePagePlanMarkdown(plan, false), 'One-Page Plan Markdown')
        }
        onPrintPlan={() => {
          handleSelectTab('plan');
          window.setTimeout(() => window.print(), 80);
        }}
        onResetDefaults={handleResetDefaults}
        onOpenPresentation={() => setIsPresentationOpen(true)}
        onDownloadZipBundle={handleDownloadZipBundle}
        onOpenDeliverables={() => setIsDeliverablesOpen(true)}
      />

      <nav className="tabs-bar" aria-label="Mission Phases">
        <div className="container">
          <div className="tabs-scroll" role="tablist">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectTab(tab.id)}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="container">
          {activeTab === 'plan' && (
            <OnePagePlanView
              plan={plan}
              isWebVerifiedPreset={activePreset.isWebVerified}
              onSelectPrimaryLead={(leadId) =>
                setPlan((prev) => ({ ...prev, activePrimaryOpenerLeadId: leadId }))
              }
              onDownloadFile={handleDownloadFile}
              onCopyText={handleCopyText}
              onPrintPlan={() => window.print()}
              onJumpToTab={handleSelectTab}
              onDownloadZipBundle={handleDownloadZipBundle}
              onOpenDeliverables={() => setIsDeliverablesOpen(true)}
            />
          )}

          {activeTab === 'offer' && (
            <OfferSegmentLab
              offer={plan.offer}
              segments={plan.segments}
              onUpdateOffer={(offer) => setPlan((prev) => ({ ...prev, offer }))}
              onSelectSegment={(segmentId) =>
                setPlan((prev) => ({
                  ...prev,
                  segments: prev.segments.map((seg) => ({
                    ...seg,
                    isSelected: seg.id === segmentId,
                  })),
                }))
              }
              onUpdateSegmentReason={(segmentId, reachabilityReason) =>
                setPlan((prev) => ({
                  ...prev,
                  segments: prev.segments.map((seg) =>
                    seg.id === segmentId ? { ...seg, reachabilityReason } : seg,
                  ),
                }))
              }
              onCopyText={handleCopyText}
            />
          )}

          {activeTab === 'clay' && (
            <ClayLeadsLab
              key={`${activePresetId}-${trackerResetNonce}`}
              claySpec={plan.claySpec}
              leads={plan.leads}
              accentColor={plan.offer.accentColor}
              defaultLocation={plan.claySpec.locationFilter.split(';')[0]?.trim() || 'Austin, TX'}
              defaultCategory={
                plan.segments.find((s) => s.isSelected)?.name || 'Target Customer'
              }
              onToast={setToast}
              onUpdateClaySpec={(claySpec) => setPlan((prev) => ({ ...prev, claySpec }))}
              onChangeLeadStatus={handleChangeLeadStatus}
              onUpdateLeadField={handleUpdateLead}
              onAddLead={(lead) => {
                setPlan((prev) => {
                  const enrichedLead =
                    lead.status === 'top3' && !lead.openers
                      ? { ...lead, openers: createDefaultOpenersForLead(lead, prev.offer) }
                      : lead;
                  return { ...prev, leads: [...prev.leads, enrichedLead] };
                });
                setToast(`Added ${lead.name} to Clay lead list.`);
              }}
              onReplaceLeads={(leads) => {
                setPlan((prev) => {
                  const enrichedLeads = leads.map((lead) =>
                    lead.status === 'top3' && !lead.openers
                      ? { ...lead, openers: createDefaultOpenersForLead(lead, prev.offer) }
                      : lead,
                  );
                  const nextPrimaryId =
                    enrichedLeads.find((l) => l.status === 'top3')?.id ??
                    enrichedLeads[0]?.id ??
                    prev.activePrimaryOpenerLeadId;
                  return {
                    ...prev,
                    leads: enrichedLeads,
                    activePrimaryOpenerLeadId: nextPrimaryId,
                  };
                });
                setToast(`Imported ${leads.length} leads from Clay CSV.`);
              }}
              onDownloadFile={handleDownloadFile}
              onCopyText={handleCopyText}
            />
          )}

          {activeTab === 'outreach' && (
            <OutreachStudio
              key={`${activePresetId}-${trackerResetNonce}`}
              projectName={plan.offer.projectName}
              senderPlaceholder={plan.offer.senderPlaceholder}
              top3Leads={top3Leads}
              activePrimaryLeadId={plan.activePrimaryOpenerLeadId}
              accentColor={plan.offer.accentColor}
              onSelectPrimaryLead={(leadId) => {
                setPlan((prev) => ({ ...prev, activePrimaryOpenerLeadId: leadId }));
                setToast('Updated featured opener on One-Page Plan and 3:2 Card.');
              }}
              onUpdateLead={handleUpdateLead}
              onDownloadFile={handleDownloadFile}
              onCopyText={handleCopyText}
              onToast={setToast}
              onJumpToClay={() => handleSelectTab('clay')}
            />
          )}

          {activeTab === 'showcase' && (
            <ShowcaseCardStudio
              plan={plan}
              onUpdateShowcase={(showcase) => setPlan((prev) => ({ ...prev, showcase }))}
              onChangeAccentColor={(accentColor) =>
                setPlan((prev) => ({ ...prev, offer: { ...prev.offer, accentColor } }))
              }
              onDownloadFile={handleDownloadFile}
              onCopyText={handleCopyText}
              onToast={setToast}
            />
          )}

          {activeTab === 'tracker' && (
            <TrackerAuditView
              key={`${activePresetId}-${trackerResetNonce}`}
              plan={plan}
              leads={plan.leads}
              metrics={plan.metrics}
              auditItems={auditItems}
              onUpdateMetrics={(metrics) => setPlan((prev) => ({ ...prev, metrics }))}
              onUpdateLead={handleUpdateLead}
              onJumpToTab={handleSelectTab}
              onCopyText={handleCopyText}
              onDownloadFile={handleDownloadFile}
              onToast={setToast}
            />
          )}
        </div>
      </main>

      {toast && (
        <div className="toast-banner" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {isPresentationOpen && (
        <PresentationModal
          plan={plan}
          accentColor={plan.offer.accentColor}
          onClose={() => setIsPresentationOpen(false)}
        />
      )}

      {isDeliverablesOpen && (
        <DeliverablesModal
          plan={plan}
          accentColor={plan.offer.accentColor}
          onClose={() => setIsDeliverablesOpen(false)}
          onCopyText={handleCopyText}
          onDownloadFile={handleDownloadFile}
          onDownloadZipBundle={handleDownloadZipBundle}
          onOpenPresentation={() => {
            setIsDeliverablesOpen(false);
            setIsPresentationOpen(true);
          }}
        />
      )}
    </div>
  );
}

export default App;
