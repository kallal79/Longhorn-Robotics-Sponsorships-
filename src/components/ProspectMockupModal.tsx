import { useEffect, useState } from 'react';
import { Copy, Download, X } from 'lucide-react';
import { LeadCandidate } from '../types/gtm';

interface ProspectMockupModalProps {
  lead: LeadCandidate;
  accentColor: string;
  projectName?: string;
  onClose: () => void;
  onCopyText: (text: string, label: string) => void;
  onDownloadFile: (content: string, filename: string, mimeType: string) => void;
}

export function ProspectMockupModal({
  lead,
  accentColor,
  projectName = 'Alder & Code Studio',
  onClose,
  onCopyText,
  onDownloadFile,
}: ProspectMockupModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isDesnudo = lead.name.toLowerCase().includes('desnudo');
  const isRockman = lead.name.toLowerCase().includes('rockman');
  const isCoffeeOrBakery = /coffee|bakery|bakeshop|roast|espresso|cafe|tea|matcha|sugarwolf/i.test(
    `${lead.name} ${lead.category}`,
  );

  const [guestCount, setGuestCount] = useState(30);
  const [selectedPackage, setSelectedPackage] = useState(
    isDesnudo
      ? 'Mobile Espresso + Matcha Bar (2 hrs)'
      : isRockman
        ? '2-Tier Custom Celebration Cake + Croissant Platter'
        : isCoffeeOrBakery
          ? 'Morning Office Pastry Boxes + Batch Coffee Carafe'
          : `${lead.category} — Starter Intake Flow`,
  );
  const [eventDate, setEventDate] = useState('48+ hours out (Next Tuesday 8:30 AM)');
  const [dietaryNotes, setDietaryNotes] = useState(
    isDesnudo
      ? 'Oat milk + ceremonial matcha requested'
      : isRockman
        ? 'No nuts; buttercream inscription'
        : isCoffeeOrBakery
          ? 'Seed-oil-free assortment + 2 decaf boxes'
          : 'Standard pre-qualification notes & preferred callback window',
  );

  const packageRate = isDesnudo ? 14 : isRockman ? 11 : isCoffeeOrBakery ? 12 : 15;
  const estSubtotal = guestCount * packageRate;

  const generatedBrief = [
    `Intake Request for ${lead.name}`,
    `Package: ${selectedPackage}`,
    `${isCoffeeOrBakery ? 'Guests' : 'Group / Unit Size'}: ~${guestCount} ${isCoffeeOrBakery ? 'people' : 'units'}`,
    `Target Date/Time: ${eventDate}`,
    `Notes: ${dietaryNotes}`,
    `Estimated Pre-Qualification Range: $${estSubtotal}–$${Math.round(estSubtotal * 1.15)} (subject to final confirmation)`,
  ].join('\n');

  const escHtml = (value: string | number) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const standaloneHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(lead.name)} — Automated Intake Prototype</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px 16px; background: #FAF9F6; color: #111827; font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; }
    .box { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E7EB; border-top: 5px solid ${escHtml(accentColor)}; border-radius: 14px; padding: 26px; box-shadow: 0 8px 24px rgba(17, 24, 39, 0.05); }
    h1 { margin: 4px 0 6px; font-size: 22px; letter-spacing: -0.015em; }
    p { margin: 0 0 18px; color: #4B5563; font-size: 14px; }
    label { display: block; font-size: 12.5px; font-weight: 600; color: #374151; margin: 12px 0 5px; }
    input, select { width: 100%; padding: 9px 11px; border: 1px solid #D1D5DB; border-radius: 6px; font: inherit; background: #FFFFFF; }
    .summary { margin-top: 18px; padding: 14px; border-radius: 10px; background: #ECFDF5; border: 1px solid #A7F3D0; font-size: 13px; white-space: pre-line; font-family: ui-monospace, SFMono-Regular, monospace; }
  </style>
</head>
<body>
  <div class="box">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${escHtml(accentColor)};text-transform:uppercase;">2-Minute Concept Prototype</div>
    <h1>${escHtml(lead.name)} — Pre-Order &amp; Event Intake</h1>
    <p>Interactive intake flow built by ${escHtml(projectName)} to eliminate back-and-forth email threads.</p>
    <label for="pkg">Package</label>
    <input id="pkg" value="${escHtml(selectedPackage)}" />
    <label for="cnt">${isCoffeeOrBakery ? 'Estimated Guests' : 'Estimated Group / Unit Size'}</label>
    <input id="cnt" type="number" min="10" max="500" step="5" value="${escHtml(guestCount)}" />
    <label for="dt">${isCoffeeOrBakery ? 'Pickup / Event Notice Window' : 'Target Schedule / Lead Time'}</label>
    <input id="dt" value="${escHtml(eventDate)}" />
    <label for="notes">${isCoffeeOrBakery ? 'Dietary / Customization Notes' : 'Custom Scope / Requirements Notes'}</label>
    <input id="notes" value="${escHtml(dietaryNotes)}" />
    <div class="summary" id="brief">${escHtml(generatedBrief)}</div>
  </div>
  <script>
    (function () {
      var rate = ${packageRate};
      var unitLabel = ${isCoffeeOrBakery ? '"Guests"' : '"Group / Unit Size"'};
      var unitSuffix = ${isCoffeeOrBakery ? '"people"' : '"units"'};
      var leadTitle = ${JSON.stringify(lead.name).replace(/</g, '\\u003c')};
      var pkg = document.getElementById('pkg');
      var cnt = document.getElementById('cnt');
      var dt = document.getElementById('dt');
      var notes = document.getElementById('notes');
      var brief = document.getElementById('brief');
      function update() {
        var parsed = parseInt(cnt.value, 10);
        var n = isFinite(parsed) && parsed > 0 ? parsed : 10;
        var low = n * rate;
        var high = Math.round(low * 1.15);
        brief.textContent = [
          'Intake Request for ' + leadTitle,
          'Package: ' + pkg.value,
          unitLabel + ': ~' + n + ' ' + unitSuffix,
          'Target Date/Time: ' + dt.value,
          'Notes: ' + notes.value,
          'Estimated Pre-Qualification Range: $' + low + '–$' + high + ' (subject to final confirmation)'
        ].join('\\n');
      }
      [pkg, cnt, dt, notes].forEach(function (el) { el.addEventListener('input', update); });
    })();
  </script>
</body>
</html>`;

  return (
    <div
      className="presentation-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Prototype for ${lead.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="presentation-panel" style={{ maxWidth: 800, minHeight: 'auto' }}>
        <header className="presentation-header" style={{ alignItems: 'flex-start', padding: '18px 24px', gap: 16 }}>
          <div style={{ flex: '1 1 280px', minWidth: 0 }}>
            <div className="eyebrow">2-Minute Client Prototype · {lead.domain}</div>
            <h3 className="section-title" style={{ fontSize: 19 }}>
              {lead.name} — Automated Intake Demo
            </h3>
            <p className="section-desc" style={{ marginTop: 2, fontSize: 13 }}>
              Use this live sample when a prospect replies “sure, send a quick mockup” — test inputs
              below or download the standalone HTML preview.
            </p>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close prototype" style={{ flexShrink: 0 }}>
            <X size={15} /> Close
          </button>
        </header>

        <div className="presentation-body" style={{ padding: '20px 24px' }}>
        <div className="grid-2" style={{ gap: 16 }}>
          <div>
            <div className="field-group">
              <label className="field-label" htmlFor="proto-package">
                Package Selection
              </label>
              <select
                id="proto-package"
                className="select"
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
              >
                {isDesnudo ? (
                  <>
                    <option>Mobile Espresso + Matcha Bar (2 hrs)</option>
                    <option>Cold Brew &amp; Iced Latte Pop-Up Cart</option>
                    <option>Corporate Espresso Martini Evening Bar</option>
                  </>
                ) : isRockman ? (
                  <>
                    <option>2-Tier Custom Celebration Cake + Croissant Platter</option>
                    <option>Office Bagel &amp; Schmeer Morning Box</option>
                    <option>Weekend Event Pastry &amp; Beverage Package</option>
                  </>
                ) : isCoffeeOrBakery ? (
                  <>
                    <option>Morning Office Pastry Boxes + Batch Coffee Carafe</option>
                    <option>Topped Focaccia &amp; Salad Lunch Boxes</option>
                    <option>Full Team Scratch-Bakery Breakfast Pickup</option>
                  </>
                ) : (
                  <>
                    <option>{lead.category} — Starter Intake Flow</option>
                    <option>Recurring Team / Group Package for {lead.name}</option>
                    <option>Custom Qualification &amp; Scheduling Prototype</option>
                  </>
                )}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="proto-guests">
                <span>{isCoffeeOrBakery ? 'Estimated Guest Count' : 'Estimated Group / Unit Size'}</span>
                <span className="mono badge badge-emerald">
                  {guestCount} {isCoffeeOrBakery ? 'guests' : 'units'}
                </span>
              </label>
              <input
                id="proto-guests"
                type="range"
                min={10}
                max={120}
                step={5}
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="proto-date">
                {isCoffeeOrBakery ? 'Pickup / Event Notice Window' : 'Target Schedule / Lead Time'}
              </label>
              <input
                id="proto-date"
                className="input"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor="proto-notes">
                {isCoffeeOrBakery ? 'Dietary / Customization Notes' : 'Custom Scope / Requirements Notes'}
              </label>
              <input
                id="proto-notes"
                className="input"
                value={dietaryNotes}
                onChange={(e) => setDietaryNotes(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div className="eyebrow">Instant Staff-Ready Intake Brief</div>
              <div
                className="mono"
                style={{
                  fontSize: 12.5,
                  whiteSpace: 'pre-line',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 12,
                  lineHeight: 1.55,
                }}
              >
                {generatedBrief}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onCopyText(generatedBrief, `${lead.name} Intake Summary`)}
              >
                <Copy size={13} /> Copy Brief
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() =>
                  onDownloadFile(
                    standaloneHtml,
                    `${lead.domain.replace(/\./g, '-')}-intake-prototype.html`,
                    'text/html;charset=utf-8',
                  )
                }
              >
                <Download size={13} /> Download Prototype HTML
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

