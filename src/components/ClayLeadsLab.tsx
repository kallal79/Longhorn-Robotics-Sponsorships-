import { useMemo, useRef, useState } from 'react';
import {
  Copy,
  Download,
  ExternalLink,
  FileUp,
  Filter,
  Info,
  Mail,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { ClayFilterSpec, LeadCandidate, LeadStatus } from '../types/gtm';
import { buildLeadsCsv, parseClayCsvToLeads } from '../utils/exporters';
import { toSafeHttpUrl } from '../utils/validators';
import { LeadDetailModal } from './LeadDetailModal';

interface ClayLeadsLabProps {
  claySpec: ClayFilterSpec;
  leads: LeadCandidate[];
  accentColor?: string;
  defaultLocation?: string;
  defaultCategory?: string;
  onUpdateClaySpec: (next: ClayFilterSpec) => void;
  onChangeLeadStatus: (leadId: string, status: LeadStatus, cutReason?: string) => void;
  onUpdateLeadField: (leadId: string, patch: Partial<LeadCandidate>) => void;
  onAddLead: (lead: LeadCandidate) => void;
  onReplaceLeads: (leads: LeadCandidate[]) => void;
  onDownloadFile: (content: string, filename: string, mimeType: string) => void;
  onCopyText: (text: string, label: string) => void;
  onToast?: (msg: string) => void;
}

export function ClayLeadsLab({
  claySpec,
  leads,
  accentColor = '#0F766E',
  defaultLocation = 'Austin, TX',
  defaultCategory = 'Independent Coffee / Bakery',
  onUpdateClaySpec,
  onChangeLeadStatus,
  onUpdateLeadField,
  onAddLead,
  onReplaceLeads,
  onDownloadFile,
  onCopyText,
  onToast,
}: ClayLeadsLabProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [emailOnly, setEmailOnly] = useState(false);
  const [sortCol, setSortCol] = useState<'rank' | 'name' | 'status'>('rank');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectingLeadId, setInspectingLeadId] = useState<string | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  const inspectingLead = leads.find((l) => l.id === inspectingLeadId) ?? null;
  const [showCsvPanel, setShowCsvPanel] = useState(false);
  const [csvDraft, setCsvDraft] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newExclusion, setNewExclusion] = useState('');
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newNeighborhood, setNewNeighborhood] = useState(defaultLocation);

  const top3Count = leads.filter((l) => l.status === 'top3').length;
  const watchlistCount = leads.filter((l) => l.status === 'watchlist').length;
  const cutLeads = leads.filter((l) => l.status === 'cut');
  const cutCount = cutLeads.length;
  const directEmailCount = leads.filter((l) => /@/.test(l.contactChannel)).length;
  const documentedCuts = cutLeads.filter((l) => (l.cutReason || l.whyFit).trim().length > 0).length;
  const filterScore =
    claySpec.exclusions.length >= 4 &&
    claySpec.industryNeighbors.length >= 2 &&
    (cutCount === 0 || documentedCuts === cutCount)
      ? 100
      : Math.min(
          95,
          55 +
            Math.min(20, claySpec.exclusions.length * 4) +
            (cutCount > 0 ? Math.round((documentedCuts / cutCount) * 20) : 20),
        );

  const handleSort = (col: 'rank' | 'name' | 'status') => {
    if (sortCol === col) {
      setSortAsc((prev) => !prev);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
        const matchesEmail = !emailOnly || /@/.test(lead.contactChannel);
        const q = searchTerm.trim().toLowerCase();
        const matchesText =
          !q ||
          lead.name.toLowerCase().includes(q) ||
          lead.domain.toLowerCase().includes(q) ||
          lead.neighborhood.toLowerCase().includes(q) ||
          lead.category.toLowerCase().includes(q);
        return matchesStatus && matchesEmail && matchesText;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortCol === 'rank') {
          cmp = a.rank - b.rank;
        } else if (sortCol === 'name') {
          cmp = a.name.localeCompare(b.name);
        } else if (sortCol === 'status') {
          const order: Record<LeadStatus, number> = { top3: 1, watchlist: 2, cut: 3 };
          cmp = (order[a.status] ?? 4) - (order[b.status] ?? 4);
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [leads, statusFilter, emailOnly, searchTerm, sortCol, sortAsc]);

  const applyCsvText = (rawText: string) => {
    const parsed = parseClayCsvToLeads(rawText, {
      neighborhood: defaultLocation,
      category: defaultCategory,
    });
    if (parsed.length > 0) {
      onReplaceLeads(parsed);
      setCsvDraft('');
      setShowCsvPanel(false);
    } else {
      onToast?.('No valid rows found — ensure CSV has a header row with Company Name & Domain.');
    }
  };

  const handleImportCsv = () => applyCsvText(csvDraft);

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        applyCsvText(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddChip = (field: 'industryNeighbors' | 'exclusions', raw: string, clear: () => void) => {
    const val = raw.trim();
    if (!val || claySpec[field].includes(val)) return;
    onUpdateClaySpec({ ...claySpec, [field]: [...claySpec[field], val] });
    clear();
  };

  const handleRemoveChip = (field: 'industryNeighbors' | 'exclusions', val: string) => {
    onUpdateClaySpec({
      ...claySpec,
      [field]: claySpec[field].filter((item) => item !== val),
    });
  };

  const handleAddQuickLead = () => {
    if (!newName.trim() || !newDomain.trim()) return;
    const cleanDomain = newDomain
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '');
    onAddLead({
      id: `custom-${Date.now()}`,
      rank: leads.length + 1,
      name: newName.trim(),
      domain: cleanDomain,
      websiteUrl: `https://${cleanDomain}`,
      neighborhood: newNeighborhood.trim() || defaultLocation,
      address: newNeighborhood.trim() || defaultLocation,
      category: defaultCategory,
      estimatedEmployees: '1–20 (est.)',
      contactChannel: `Website contact form (${cleanDomain})`,
      status: 'watchlist',
      unknownInfo: 'Verify exact staff size and public opening fact.',
      whyFit: 'Added manually to Clay starter list.',
    });
    setNewName('');
    setNewDomain('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="grid-sidebar">
        <aside className="card">
          <div className="eyebrow">Phase II · Clay Sculptor Setup</div>
          <h2 className="section-title" style={{ fontSize: 18 }}>
            Find Leads → Companies → Chat
          </h2>
          <p className="section-desc" style={{ marginBottom: 14 }}>
            Copy this prompt into Clay’s Sculptor AI chat, then audit the left-panel filters below.
          </p>

          <div className="field-group">
            <label className="field-label" htmlFor="sculptor-query">
              <span>Sculptor Natural-Language Query</span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onCopyText(claySpec.sculptorQuery, 'Clay Sculptor Query')}
              >
                <Copy size={12} />
                Copy
              </button>
            </label>
            <textarea
              id="sculptor-query"
              className="textarea"
              style={{ minHeight: 112 }}
              value={claySpec.sculptorQuery}
              onChange={(e) => onUpdateClaySpec({ ...claySpec, sculptorQuery: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="location-filter">
              Location Filter
            </label>
            <textarea
              id="location-filter"
              className="textarea"
              style={{ minHeight: 84, resize: 'none' }}
              value={claySpec.locationFilter}
              onChange={(e) => onUpdateClaySpec({ ...claySpec, locationFilter: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="headcount-filter">
              Company Size (Smaller = Reachable)
            </label>
            <input
              id="headcount-filter"
              className="input"
              value={claySpec.headcountFilter}
              onChange={(e) => onUpdateClaySpec({ ...claySpec, headcountFilter: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="field-label" style={{ marginBottom: 6 }}>
              Industry + Close Neighbors
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {claySpec.industryNeighbors.map((ind) => (
                <span key={ind} className="badge badge-emerald">
                  {ind}
                  <button
                    type="button"
                    aria-label={`Remove industry ${ind}`}
                    onClick={() => handleRemoveChip('industryNeighbors', ind)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'inline-flex',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                aria-label="New neighbor industry"
                className="input"
                style={{ padding: '5px 8px', fontSize: 12.5 }}
                placeholder="Add neighbor industry..."
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChip('industryNeighbors', newIndustry, () => setNewIndustry(''));
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  handleAddChip('industryNeighbors', newIndustry, () => setNewIndustry(''))
                }
              >
                Add
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="field-label" style={{ marginBottom: 6 }}>
              Exclusions (Noise Removal)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {claySpec.exclusions.map((exc) => (
                <span key={exc} className="badge badge-warn">
                  − {exc}
                  <button
                    type="button"
                    aria-label={`Remove exclusion ${exc}`}
                    onClick={() => handleRemoveChip('exclusions', exc)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'inline-flex',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                aria-label="New exclusion term"
                className="input"
                style={{ padding: '5px 8px', fontSize: 12.5 }}
                placeholder="Add exclusion..."
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChip('exclusions', newExclusion, () => setNewExclusion(''));
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleAddChip('exclusions', newExclusion, () => setNewExclusion(''))}
              >
                Add
              </button>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Clay Trial Credit Meter
              </span>
              <span className="mono badge badge-emerald" style={{ fontSize: 11 }}>
                0 / 100 Credits Used
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
              Standard searching and Sculptor filtering consume <strong>0 credits</strong>. All{' '}
              {leads.length} candidate rows use public domain research to preserve trial credits.
            </div>
          </div>

          <div
            style={{
              background: filterScore === 100 ? 'var(--accent-soft)' : 'var(--warn-bg)',
              border: `1px solid ${filterScore === 100 ? 'var(--accent-border)' : 'var(--warn-border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: filterScore === 100 ? 'var(--accent)' : 'var(--warn-ink)',
                marginBottom: 4,
              }}
            >
              ✓ Filter Tightness: {filterScore}%
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
              {claySpec.exclusions.length} noise exclusions active ({claySpec.headcountFilter} headcount guard). {cutCount} cuts documented.
            </div>
          </div>

          <div className="callout" style={{ fontSize: 12.5 }}>
            <strong>Trial Credit Tip:</strong> {claySpec.trialNote}
          </div>
        </aside>

        <section className="card">
          <div className="card-header">
            <div>
              <div className="eyebrow">{leads.length} Potential Customers · Narrowing Pass</div>
              <h2 className="section-title">Clay Starter List &amp; Cut Audit</h2>
              <p className="section-desc">
                Verify websites, cut closed or oversized rows, and pick exactly{' '}
                <strong>3 Top Candidates</strong> for Week-1 outreach.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  onDownloadFile(
                    buildLeadsCsv(leads),
                    leads.length === 20 ? 'clay-shortlist-20.csv' : `clay-shortlist-${leads.length}.csv`,
                    'text/csv;charset=utf-8',
                  )
                }
              >
                <Download size={14} />
                Export CSV
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  onCopyText(JSON.stringify(leads, null, 2), `Clay ${leads.length}-Leads JSON`)
                }
                title={`Copy all ${leads.length} leads as clean JSON for Clay / CRM import`}
              >
                <Copy size={14} />
                Copy JSON
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowCsvPanel((prev) => !prev)}
              >
                <Upload size={14} />
                {showCsvPanel ? 'Close CSV Import' : 'Import Clay CSV'}
              </button>
            </div>
          </div>

          {top3Count !== 3 && (
            <div className="callout callout-warn" style={{ marginBottom: 14 }}>
              You currently have <strong>{top3Count}</strong> Top-3 leads selected. Mission Phase
              II requires picking exactly <strong>3</strong> companies to contact first.
            </div>
          )}

          {showCsvPanel && (
            <div
              style={{
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: 14,
                marginBottom: 16,
                background: 'var(--bg-canvas)',
              }}
            >
              <div className="field-label" style={{ marginBottom: 6 }}>
                <span>Paste Clay CSV or upload `.csv` file (Company Name, Domain, Location, Size)</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => csvFileInputRef.current?.click()}
                >
                  <FileUp size={12} /> Upload .csv File
                </button>
                <input
                  ref={csvFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={handleCsvFileUpload}
                />
              </div>
              <textarea
                aria-label="Paste Clay CSV text"
                className="textarea"
                placeholder="Company Name,Domain,Location,Employees,Industry&#10;Example Roasters,example.com,Austin TX,1-10,Food and Beverage Services"
                value={csvDraft}
                onChange={(e) => setCsvDraft(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleImportCsv}>
                  Replace Table With CSV
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
              padding: '10px 12px',
              marginBottom: 14,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              fontSize: 12,
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--ink-primary)', marginRight: 4 }}>Market Pool:</span>
            <button
              type="button"
              className="badge mono"
              aria-pressed={statusFilter === 'all'}
              style={{
                cursor: 'pointer',
                borderColor: statusFilter === 'all' ? 'var(--accent)' : undefined,
                boxShadow: statusFilter === 'all' ? '0 0 0 2px var(--accent-soft)' : undefined,
              }}
              onClick={() => setStatusFilter('all')}
              title="Show all leads"
            >
              {leads.length} Sourced
            </button>
            <button
              type="button"
              className="badge badge-emerald mono"
              aria-pressed={statusFilter === 'top3'}
              style={{
                cursor: 'pointer',
                borderColor: statusFilter === 'top3' ? 'var(--accent)' : undefined,
                boxShadow: statusFilter === 'top3' ? '0 0 0 2px var(--accent-soft)' : undefined,
              }}
              onClick={() => setStatusFilter('top3')}
              title="Filter to Top 3 picks"
            >
              {top3Count} Week-1 Priority
            </button>
            <button
              type="button"
              className="badge mono"
              aria-pressed={statusFilter === 'watchlist'}
              style={{
                cursor: 'pointer',
                borderColor: statusFilter === 'watchlist' ? 'var(--accent)' : undefined,
                boxShadow: statusFilter === 'watchlist' ? '0 0 0 2px var(--accent-soft)' : undefined,
              }}
              onClick={() => setStatusFilter('watchlist')}
              title="Filter to Watchlist backups"
            >
              {watchlistCount} Backups
            </button>
            <button
              type="button"
              className={`badge mono ${emailOnly ? 'badge-emerald' : ''}`}
              aria-pressed={emailOnly}
              style={{
                cursor: 'pointer',
                borderColor: emailOnly ? 'var(--accent)' : undefined,
                boxShadow: emailOnly ? '0 0 0 2px var(--accent-soft)' : undefined,
                background: emailOnly ? 'var(--accent-soft)' : undefined,
                color: emailOnly ? 'var(--accent)' : undefined,
              }}
              onClick={() => setEmailOnly((prev) => !prev)}
              title={emailOnly ? 'Showing direct email contacts only (click to show all)' : 'Filter to direct email contacts only'}
            >
              {directEmailCount} Direct Email Inbox {emailOnly ? '✓' : ''}
            </button>
            <button
              type="button"
              className="badge mono"
              aria-pressed={statusFilter === 'cut'}
              style={{
                cursor: 'pointer',
                borderColor: statusFilter === 'cut' ? 'var(--accent)' : undefined,
                boxShadow: statusFilter === 'cut' ? '0 0 0 2px var(--accent-soft)' : undefined,
              }}
              onClick={() => setStatusFilter('cut')}
              title="Filter to Cut leads"
            >
              {cutCount} Cut
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                <Filter size={12} /> All ({leads.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'top3' ? 'btn-primary' : ''}`}
                onClick={() => setStatusFilter('top3')}
              >
                Top 3 ({top3Count})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'watchlist' ? 'btn-primary' : ''}`}
                onClick={() => setStatusFilter('watchlist')}
              >
                Watchlist ({watchlistCount})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'cut' ? 'btn-primary' : ''}`}
                onClick={() => setStatusFilter('cut')}
              >
                Cut ({cutCount})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${emailOnly ? 'btn-primary' : ''}`}
                onClick={() => setEmailOnly((prev) => !prev)}
                title="Toggle leads with verified direct email addresses"
              >
                <Mail size={12} /> Direct Email ({directEmailCount})
              </button>
              {searchTerm.trim() && (
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink-muted)', marginLeft: 4 }}>
                  {filteredLeads.length} matching
                </span>
              )}
            </div>

            <div style={{ position: 'relative', minWidth: 230, flex: '0 1 280px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ink-muted)',
                }}
              />
              <input
                type="search"
                className="input"
                style={{ paddingLeft: 32, paddingRight: searchTerm ? 32 : 12, paddingTop: 7, paddingBottom: 7 }}
                placeholder="Search company, domain, area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="Clear search query"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--ink-muted)',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="table-wrap">
            <table className="leads-table">
              <thead>
                <tr>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('rank')}
                    title="Click to sort by rank #"
                  >
                    # {sortCol === 'rank' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('name')}
                    title="Click to sort alphabetically by company name"
                  >
                    Company &amp; Domain {sortCol === 'name' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th>Area &amp; Est. Size</th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('status')}
                    title="Click to sort by status"
                  >
                    Status {sortCol === 'status' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th>Fit / Cut Reason &amp; Public Unknowns</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '28px 16px' }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>
                        No leads match the current filter or search query.
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setStatusFilter('all');
                          setEmailOnly(false);
                          setSearchTerm('');
                        }}
                      >
                        Clear Search &amp; Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={lead.status === 'top3' ? 'lead-row-top3' : lead.status === 'cut' ? 'lead-row-cut' : ''}
                  >
                    <td className="mono" style={{ color: 'var(--ink-muted)' }}>
                      {lead.rank}
                    </td>
                    <td style={{ minWidth: 215 }}>
                      <div style={{ fontWeight: 700, lineHeight: 1.35 }}>{lead.name}</div>
                      <div
                        style={{
                          marginTop: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <a
                          href={toSafeHttpUrl(lead.websiteUrl, lead.domain)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 12.5,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            wordBreak: 'break-word',
                          }}
                        >
                          {lead.domain} <ExternalLink size={11} />
                        </a>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ padding: '2px 8px', fontSize: 11, flexShrink: 0 }}
                          onClick={() => setInspectingLeadId(lead.id)}
                          data-testid={`inspect-lead-${lead.id}`}
                          title={`Inspect ${lead.name} dossier`}
                        >
                          <Info size={11} /> Inspect
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
                        {lead.contactChannel}
                      </div>
                    </td>
                    <td style={{ minWidth: 130 }}>
                      <div style={{ fontWeight: 500 }}>{lead.neighborhood}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        {lead.category}
                      </div>
                      <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>
                        {lead.estimatedEmployees}
                      </div>
                    </td>
                    <td style={{ minWidth: 122 }}>
                      <select
                        aria-label={`Status for ${lead.name}`}
                        className={`select ${lead.status === 'top3' ? 'select-status-top3' : lead.status === 'cut' ? 'select-status-cut' : ''}`}
                        style={{ padding: '6px 8px', fontSize: 12.5 }}
                        value={lead.status}
                        onChange={(e) =>
                          onChangeLeadStatus(
                            lead.id,
                            e.target.value as LeadStatus,
                            e.target.value === 'cut' && !lead.cutReason
                              ? 'Cut during reachability/fit review.'
                              : lead.cutReason,
                          )
                        }
                      >
                        <option value="top3">★ Top 3</option>
                        <option value="watchlist">Watchlist</option>
                        <option value="cut">Cut</option>
                      </select>
                    </td>
                    <td style={{ minWidth: 230 }}>
                      {lead.status === 'cut' ? (
                        <div style={{ fontSize: 12.5 }}>
                          <span className="badge badge-danger" style={{ marginBottom: 4 }}>
                            Cut Reason
                          </span>
                          <input
                            aria-label={`Cut reason for ${lead.name}`}
                            className="input"
                            style={{ padding: '6px 8px', fontSize: 12.5, marginTop: 4 }}
                            placeholder="Document exact reason cut..."
                            value={lead.cutReason ?? ''}
                            onChange={(e) =>
                              onUpdateLeadField(lead.id, { cutReason: e.target.value })
                            }
                          />
                        </div>
                      ) : (
                        <div style={{ fontSize: 13 }}>{lead.whyFit}</div>
                      )}
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--ink-muted)',
                          marginTop: 6,
                          padding: '5px 8px',
                          background: 'var(--bg-canvas)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <strong>Couldn’t find publicly:</strong> {lead.unknownInfo}
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <input
              aria-label="Add candidate name"
              className="input"
              style={{ flex: '1 1 200px' }}
              placeholder="Add candidate name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddQuickLead();
                }
              }}
            />
            <input
              aria-label="Candidate domain"
              className="input"
              style={{ flex: '1 1 180px' }}
              placeholder="Domain (e.g. shop.com)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddQuickLead();
                }
              }}
            />
            <input
              aria-label="Candidate neighborhood or area"
              className="input"
              style={{ flex: '1 1 160px' }}
              placeholder="Area / Neighborhood"
              value={newNeighborhood}
              onChange={(e) => setNewNeighborhood(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddQuickLead();
                }
              }}
            />
            <button type="button" className="btn btn-sm" onClick={handleAddQuickLead}>
              <Plus size={14} /> Add Lead
            </button>
          </div>
        </section>
      </div>

      {inspectingLead && (
        <LeadDetailModal
          lead={inspectingLead}
          accentColor={accentColor}
          onClose={() => setInspectingLeadId(null)}
          onChangeStatus={(id, status, cutReason) => {
            onChangeLeadStatus(id, status, cutReason);
          }}
        />
      )}
    </div>
  );
}
