# Go-to-Market Studio — Longhorn Robotics Sponsorships & Austin Tech GTM Planner

An interactive, production-grade Go-to-Market Plan Studio, Clay 20-lead audit workbench, verified Top-3 multi-touch outreach laboratory, and Handshake Showcase generator.

Built with **React 18**, **TypeScript**, **Vite**, **HTML5 Canvas**, and **Chrome DevTools Protocol (CDP)** live E2E automation.

---

## Quick Start & Local Preview

### 1. Launch Web Application
Double-click `launch-local.bat` or run:
```powershell
npm install
npm start
```
The application will launch and serve at **`http://127.0.0.1:4173/`**.

### 2. Run Local Verification Suite
```powershell
npm run verify:all
```
This runs the complete pipeline:
- **Unit & Edge-Case Tests:** `node --test tests/*.test.mjs` (25 automated assertions)
- **TypeScript Typecheck & Build:** `tsc -b && vite build`
- **Deliverables Generation:** `node scripts/generate-deliverables.mjs`

### 3. Run Chrome E2E Live Browser QA
```powershell
npm run qa:e2e
```
Launches Google Chrome via CDP, tests user interactions across all 6 workspace tabs, verifies all mission invariants, captures 14 audit screenshots in high resolution, and tests responsive viewports (Desktop 1440px, Tablet 768px, Mobile 390px) with zero horizontal overflow.

---

## Workspace Capabilities & Tab Architecture

### 1. One-Page Plan (`Tab 1`)
- **6-Bracket Mission Template:** Follows the exact mission structure: Offer, Segment, List (20), Top 3 with dated facts & source URLs, Message (<60w), and What I'll Watch.
- **Export Bar:** Instant copy for Core 1-Pager Markdown, download for `GTM_PLAN.md` & `ONE_PAGE_GTM_PLAN.html`, single-click `ZIP Bundle` download, and native `Print / Save PDF`.
- **Deliverables Hub Launcher:** Opens the modal with all 9 project files and 1-click submission buttons.

### 2. Offer & Segment Lab (`Tab 2`)
- **Offer Specificity Engine:** Automatic scoring of the `[what you offer] for [who]` syntax with real-time feedback.
- **Comparison Matrix:** Evaluates 3 distinct customer segments with reachability scores, channel viability, and an explicit Week-1 primary selection.

### 3. Clay 20-Lead Mining & Cut Audit (`Tab 3`)
- **Clay Sculptor Spec:** Sculptor prompt query, location filter, headcount filter, 4 noise exclusions, and 2 adjacent industries.
- **20-Lead Table:** Categorized into 3 Top Picks, 11 Watchlist Backups, and 6 documented Disqualified Cuts.
- **Direct Email Quick Filter:** Dedicated filter isolating verified direct email addresses.
- **Multi-Column Sorting:** Sort table dynamically by `# Rank`, `Company & Domain`, or `Status`.
- **Dossier Inspector:** Modal viewing of each prospect's public gaps, fact dates, and verified source URLs.

### 4. Top-3 Outreach Studio (`Tab 4`)
- **3-Touch Sequence Cadence:**
  - **Touch 1 (Opener):** Two neutral angles (Angle A Fact-First, Angle B Value-First) strictly `< 60` words with live word count remaining.
  - **Touch 2 (Day-3 Bump):** Friendly follow-up nudge (`< 35` words) referencing company context.
  - **Touch 3 (Day-7 Closeout):** Polite, graceful closeout (`< 35` words).
- **Webmail Launchers:** Direct `Draft Email` mailto link + 1-click `Gmail Web` composer button.
- **Interactive Prototype Demo:** 2-Minute interactive customized intake demo modal for candidates.
- **Live Mobile Inbox Mockup:** Realistic 375px phone simulation syncing active touch messages in real time.
- **KPI Sent Logging:** Directly logs outreach messages to the execution tracker.

### 5. 3:2 Canvas Card & Handshake Showcase Kit (`Tab 5`)
- **1500 × 1000 px 3:2 Canvas:** Light mode graphic with generous whitespace and selected accent color (Deep Emerald, Royal Cobalt, Warm Terracotta, or Swiss Charcoal).
- **Handshake Showcase Description:** Verified `484 / 500` characters containing one-line offer, #1 opening fact, 6 cuts summary, and public unknowns.
- **Automated PII Guard:** Scans for and prevents exposure of personal phone numbers or personal webmail domains.
- **Direct Image Exporters:** Instant `Download 1500×1000 PNG` and `Copy Image` to clipboard.

### 6. Tracker & Execution Audit (`Tab 6`)
- **Mission Readiness Audit:** Automated 8/8 rule validation with deep links to fix any failing check.
- **Assigned Operator Playbook:** Day-by-day 7-task execution checklist (Monday to Friday) with bulk check/reset.
- **Outreach Conversion Pipeline:** 4-stage funnel (Sourced → Contacted → Replied → Booked) with live conversion rates.
- **Commercial Pipeline Valuation:** Customizable Average Client Value with live active vs. goal revenue projection.
- **Activity Log CSV:** Instant export of prospect outreach status and notes to `outreach-activity-log.csv`.

---

## Deliverables Inventory (`deliverables/`)

| File | Format | Purpose & Constraints |
| :--- | :--- | :--- |
| **`ONE_PAGE_GTM_PLAN.html`** | Standalone HTML | Styled printable HTML one-page plan with zero external runtime dependencies. |
| **`gtm-plan-card-1500x1000.png`** | PNG (1500 × 1000) | Exact 3:2 cover card for Handshake Showcase (≥1200px width required). |
| **`GTM_PLAN_ONE_PAGE.md`** | Markdown | Core 6-bracket plan formatted for assignment submission. |
| **`GTM_PLAN.md`** | Markdown | Full specification with Clay query, all 20 leads, 6 cut reasons, and 6 openers. |
| **`WEEK_1_ACTION_ASSIGNMENTS.md`** | Markdown | Day-by-day 7-task operator execution schedule with verified URLs & mailto links. |
| **`PRESENTATION_DECK.html`** | Standalone HTML | Interactive 6-slide executive pitch deck with keyboard arrow navigation and print view. |
| **`clay-shortlist-20.csv`** | CSV Data | All 20 sourced companies with status, contact channels, cut reasons, and public unknowns. |
| **`showcase-submission.md`** | Markdown | Handshake submission kit with project title, 484-character bio, and preview specs. |
| **`DELIVERABLES_MANIFEST.md`** | Markdown | Complete index and invariant audit summary. |

---

## Handshake Showcase Submission Quick Reference

1. **Project Title:**
   ```text
   Alder & Code Studio — One-Page GTM Plan for Austin Indie Coffee & Bakeries
   ```
2. **Upload File:**
   - Select `deliverables/ONE_PAGE_GTM_PLAN.html` (or `deliverables/GTM_PLAN_ONE_PAGE.md`)
3. **Cover Image:**
   - Upload `deliverables/gtm-plan-card-1500x1000.png` (`1500 × 1000 px`, 3:2 ratio)
4. **Description (`484 / 500` characters):**
   ```text
   Offer: Mobile-ready menu sites & automated catering intake for independent Austin coffee shops and bakeries (<50 staff). Top fact: Sugarwolf Bakery & Coffee Bar opened May 5, 2026 downtown with a no-Wi-Fi policy and 48-hour advance pickup catering. Cut 6 of 20: Try Hard and LeverCraft (closed), Greater Goods (moved to Dripping Springs), Proud Mary and Easy Tiger (>50 staff), ThoroughBread (domain/contact unclear). Missing publicly: exact hourly headcounts and direct owner emails.
   ```
5. **Publish:**
   - Check **"Share to Showcase"** to receive the public AI Project Builder badge, then click **Publish**.

---

## Interactive Presets

Switch presets dynamically using the selector in the header bar:
1. **Austin Coffee & Bakery** (`austin-web-ai`) — Full verified production dataset (Default).
2. **Longhorn Robotics Sponsorships** (`robotics-sponsors`) — Technical student engineering sponsorship outreach.
3. **Ceramic Mugs & Hospitality** (`mugs-coffee-shops`) — Wholesale physical goods distribution.
4. **Local Service Agency** (`local-agency`) — Professional services consulting starter.

---

## License
MIT License. Created for Go-to-Market Operator training and Handshake Showcase certification.
