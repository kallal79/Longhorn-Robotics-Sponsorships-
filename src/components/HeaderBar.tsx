import { useRef } from 'react';
import {
  Archive,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Printer,
  Copy,
  Download,
  Upload,
  Presentation,
  FolderDown,
} from 'lucide-react';
import { AuditCheckItem } from '../types/gtm';
import { PLAN_PRESETS } from '../data/presets';

interface HeaderBarProps {
  projectName: string;
  activePresetId: string;
  auditItems: AuditCheckItem[];
  onSwitchPreset: (presetId: string) => void;
  onExportJson: () => void;
  onImportJson: (jsonText: string) => void;
  onCopyOnePageMarkdown: () => void;
  onPrintPlan: () => void;
  onResetDefaults: () => void;
  onOpenPresentation?: () => void;
  onDownloadZipBundle?: () => void;
  onOpenDeliverables?: () => void;
}

export function HeaderBar({
  projectName,
  activePresetId,
  auditItems,
  onSwitchPreset,
  onExportJson,
  onImportJson,
  onCopyOnePageMarkdown,
  onPrintPlan,
  onResetDefaults,
  onOpenPresentation,
  onDownloadZipBundle,
  onOpenDeliverables,
}: HeaderBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const passedCount = auditItems.filter((item) => item.passed).length;
  const totalCount = auditItems.length;
  const allPassed = passedCount === totalCount;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportJson(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="header-bar">
      <div className="container">
        <div className="header-stack">
          <div className="header-top-row">
            <div className="brand-block">
              <div className="brand-mark" aria-hidden="true">
                GTM
              </div>
              <div>
                <h1 className="brand-title">{projectName} — Go-to-Market Studio</h1>
                <p className="brand-subtitle">
                  Clay 20-Lead Research · Top-3 Verified Outreach · 3:2 Handshake Showcase Builder
                </p>
              </div>
            </div>

            <div className="header-context">
              <select
                aria-label="Switch side hustle preset"
                className="select preset-select"
                value={activePresetId}
                onChange={(e) => onSwitchPreset(e.target.value)}
              >
                {PLAN_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.isWebVerified ? '✓ ' : 'Template: '}
                    {preset.label}
                  </option>
                ))}
              </select>

              <span className={`status-pill ${allPassed ? '' : 'warn'}`} data-testid="readiness-pill">
                {allPassed ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span className="mono">
                  {passedCount}/{totalCount}
                </span>
                <span>Mission Checks</span>
              </span>
            </div>
          </div>

          <div className="header-toolbar">
            <div className="header-utility-strip" role="toolbar" aria-label="Workspace utilities">
              <button
                type="button"
                className="btn btn-sm"
                onClick={onCopyOnePageMarkdown}
                title="Copy the exact One-Page GTM Plan in Markdown"
              >
                <Copy size={13} />
                Copy Plan MD
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={onExportJson}
                title="Export full workspace state as JSON backup"
              >
                <Download size={13} />
                JSON
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => fileInputRef.current?.click()}
                title="Import saved workspace JSON"
              >
                <Upload size={13} />
                Load
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <button
                type="button"
                className="btn btn-sm"
                onClick={onPrintPlan}
                title="Print or save One-Page Plan as PDF"
              >
                <Printer size={13} />
                Print / PDF
              </button>

              {onOpenDeliverables && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={onOpenDeliverables}
                  data-testid="header-deliverables-btn"
                  title="Open Deliverables Hub to browse and export all 9 project files"
                >
                  <FolderDown size={13} />
                  Deliverables Hub
                </button>
              )}

              <button
                type="button"
                className="btn btn-sm"
                onClick={onResetDefaults}
                title="Reset workspace back to verified Austin coffee & bakery defaults"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            </div>

            <div className="header-toolbar-group">
              {onDownloadZipBundle && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={onDownloadZipBundle}
                  data-testid="header-zip-btn"
                  title="Download complete GTM deliverables bundle as a standalone ZIP"
                >
                  <Archive size={13} />
                  ZIP Bundle
                </button>
              )}

              {onOpenPresentation && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={onOpenPresentation}
                  data-testid="header-present-btn"
                  title="Launch 6-Slide Executive Pitch Deck"
                >
                  <Presentation size={13} />
                  Present
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
