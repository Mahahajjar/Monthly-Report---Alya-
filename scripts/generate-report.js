#!/usr/bin/env node
/**
 * Alya Tower Monthly Report Generator
 *
 * Reads structured data from an Excel file (parsed by parse-excel.js),
 * builds the branded HTML report, and renders it to PDF via Puppeteer.
 *
 * Usage:
 *   node scripts/generate-report.js [path/to/source.xlsx]
 *
 * If no path is given, looks for reports/_source.xlsx (placed there by fetch-excel.js)
 * or falls back to the most recent .xlsx in project/uploads/.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { parseExcel } = require('./parse-excel');

const REPO_ROOT   = path.join(__dirname, '..');
const PROJECT_DIR = path.join(REPO_ROOT, 'project');
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');
const DS_DIR      = path.join(PROJECT_DIR, '_ds', 'tashyid-design-system-09b28622-2bf5-4946-a4b3-6903bd054256');
const FONTS_URL   = `file://${DS_DIR}/fonts`;
const ASSETS_URL  = `file://${PROJECT_DIR}/assets`;

if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

// ─── Locate source Excel ──────────────────────────────────────────────────────

function findExcel(argPath) {
  if (argPath && fs.existsSync(argPath)) return argPath;

  const candidates = [
    path.join(REPORTS_DIR, '_source.xlsx'),
    ...fs.readdirSync(path.join(PROJECT_DIR, 'uploads'))
      .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
      .map(f => path.join(PROJECT_DIR, 'uploads', f))
  ].filter(f => fs.existsSync(f));

  if (!candidates.length) throw new Error('No Excel source file found. Run fetch-excel.js first, or provide a path as the first argument.');
  return candidates.sort((a, b) => fs.statSync(b).mtime - fs.statSync(a).mtime)[0];
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function taskPillsHTML(phase) {
  const all = [...phase.tasks_done, ...phase.tasks_pending];
  return all.map((task, i) => i < phase.done
    ? `<div style="display:flex;align-items:center;gap:5px;padding:5px 7px;background:#F8F6F4;border-radius:2px;border:1px solid #E4E0DC;">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect width="12" height="12" rx="2" fill="#C8C4C0"/><path d="M3 6l2.5 2.5L9 4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span style="font-family:'DIN Next LT W23',sans-serif;font-size:9.5px;color:#B0ACAA;text-decoration:line-through;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${task}</span>
       </div>`
    : `<div style="display:flex;align-items:center;gap:5px;padding:5px 7px;background:white;border-radius:2px;border:1px solid #E4E0DC;">
        <span style="font-family:'DIN Next LT W23',sans-serif;font-size:7.5px;font-weight:700;background:${phase.color};color:white;padding:1px 4px;border-radius:1px;flex-shrink:0;">${phase.badge}</span>
        <span style="font-family:'DIN Next LT W23',sans-serif;font-size:9.5px;color:#2E2D2C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${task}</span>
        <div style="margin-left:auto;width:10px;height:10px;border:1.5px solid #C8C4C0;border-radius:1px;flex-shrink:0;"></div>
       </div>`
  ).join('');
}

function phaseHTML(phase, showToday, reportDate) {
  const pct = phase.total > 0 ? Math.round((phase.done / phase.total) * 100) : 0;
  const pctColor = pct > 0 ? '#AAD3BF' : 'rgba(255,255,255,0.4)';
  const cols = phase.columns || 7;
  const todayBadge = showToday ? `
    <div style="display:flex;align-items:center;gap:6px;">
      <div style="width:7px;height:7px;background:#F5C040;border-radius:50%;"></div>
      <span style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#F5C040;">Today</span>
      <span style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;color:rgba(255,255,255,0.35);margin-left:4px;">${reportDate}</span>
    </div>` : '';

  return `
  <div style="background:white;border-bottom:1px solid #E4E0DC;">
    <div style="background:${phase.color};padding:9px 36px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="font-family:'DIN Next LT W23',sans-serif;font-size:12px;font-weight:700;color:white;letter-spacing:0.04em;text-transform:uppercase;">${phase.name}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-left:16px;">
          <div style="width:180px;height:5px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:#AAD3BF;border-radius:3px;"></div>
          </div>
          <span style="font-family:'DIN Next LT W23',sans-serif;font-size:11px;font-weight:700;color:${pctColor};">${pct}%</span>
          <span style="font-family:'DIN Next LT W23',sans-serif;font-size:10px;color:rgba(255,255,255,0.4);">${phase.done} / ${phase.total} done</span>
        </div>
      </div>
      ${todayBadge}
    </div>
    <div style="padding:10px 36px 11px;display:grid;grid-template-columns:repeat(${cols},1fr);gap:5px;">
      ${taskPillsHTML(phase)}
    </div>
  </div>`;
}

function progressHTML(items) {
  return items.map(item => `
    <div style="display:grid;grid-template-columns:7px 1fr;gap:9px;padding:6px 0;border-bottom:1px solid #F0EDE9;align-items:start;">
      <div style="width:5px;height:5px;background:#7A1143;border-radius:50%;margin-top:6px;"></div>
      <p style="font-family:'DIN Next Arabic',sans-serif;font-size:11px;font-weight:400;color:#3A3937;line-height:1.72;">
        ${item.bold_prefix ? `<strong style="font-weight:700;color:#2E2D2C;">${item.bold_prefix}</strong> ` : ''}${item.text}
      </p>
    </div>`).join('');
}

function nextStepsHTML(steps) {
  return steps.map((step, i) => {
    const urgent   = step.urgency === 'urgent';
    const complete = step.urgency === 'complete';
    const border = urgent ? 'border:1px solid rgba(200,134,10,0.4);border-left:3px solid #C8860A;' : 'border:1px solid #E4E0DC;';
    const bg     = urgent ? 'background:rgba(200,134,10,0.04);' : 'background:white;';
    const numBg  = urgent ? '#C8860A' : '#7A1143';
    const badge  = complete
      ? `<span style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;background:rgba(170,211,191,0.25);color:#2E7D5A;padding:2px 6px;border-radius:2px;display:inline-block;margin-top:4px;font-weight:700;">✓ Complete</span>`
      : urgent
        ? `<span style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;background:rgba(200,134,10,0.18);color:#9A6408;padding:2px 6px;border-radius:2px;display:inline-block;margin-top:4px;font-weight:700;">${step.due}</span>`
        : `<span style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;background:rgba(122,17,67,0.07);color:#7A1143;padding:2px 6px;border-radius:2px;display:inline-block;margin-top:4px;">${step.due}</span>`;

    return `
    <div style="display:grid;grid-template-columns:20px 1fr;gap:9px;align-items:start;${border}border-radius:2px;padding:9px 11px;${bg}">
      <div style="width:20px;height:20px;border-radius:2px;display:flex;align-items:center;justify-content:center;font-family:'DIN Next LT W23',sans-serif;font-size:9px;font-weight:700;color:white;flex-shrink:0;background:${numBg};">${i + 1}</div>
      <div>
        <div style="font-family:'DIN Next LT W23',sans-serif;font-size:11px;font-weight:700;color:#2E2D2C;margin-bottom:3px;">${step.title}</div>
        <p style="font-family:'DIN Next Arabic',sans-serif;font-size:10.5px;color:#6B6866;line-height:1.55;">${step.description}</p>
        ${badge}
      </div>
    </div>`;
  }).join('');
}

function decisionsHTML(decisions) {
  return decisions.map(d => {
    const urgent = d.urgency === 'Urgent';
    const bg     = urgent ? 'rgba(122,17,67,0.35)' : 'rgba(255,255,255,0.05)';
    const border = urgent
      ? 'border:1px solid rgba(122,17,67,0.55);border-top:2px solid #7A1143;'
      : 'border:1px solid rgba(255,255,255,0.1);border-top:2px solid rgba(255,255,255,0.2);';
    const dot    = urgent ? '#F5C040' : 'rgba(255,255,255,0.35)';
    const label  = urgent ? '#F5C040' : 'rgba(255,255,255,0.35)';
    return `
    <div style="background:${bg};${border}border-radius:2px;padding:13px 16px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:7px;">
        <span style="width:5px;height:5px;background:${dot};border-radius:50%;"></span>
        <span style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${label};">CEO — ${d.urgency}</span>
      </div>
      <div style="font-family:'DIN Next LT W23',sans-serif;font-size:11.5px;font-weight:700;color:white;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.02em;">${d.title}</div>
      <p style="font-family:'DIN Next Arabic',sans-serif;font-size:11px;color:rgba(255,255,255,0.55);line-height:1.72;">${d.body}</p>
    </div>`;
  }).join('');
}

function buildHTML(d) {
  const statusColor  = { GREEN: '#4CAF50', AMBER: '#F5C040', RED: '#EF5350'     }[d.status] || '#F5C040';
  const statusBg     = { GREEN: 'rgba(76,175,80,0.25)', AMBER: 'rgba(200,134,10,0.25)', RED: 'rgba(239,83,80,0.25)' }[d.status] || 'rgba(200,134,10,0.25)';
  const statusBorder = { GREEN: 'rgba(76,175,80,0.5)',  AMBER: 'rgba(245,192,64,0.5)',  RED: 'rgba(239,83,80,0.5)'  }[d.status] || 'rgba(245,192,64,0.5)';

  const phasesHTML    = (d.phases || []).map((p, i) => phaseHTML(p, i === 0, d.report_date)).join('');
  const overviewHTML  = (d.overview_paragraphs || []).map((p, i) =>
    `<p style="font-family:'DIN Next Arabic',sans-serif;font-size:11.5px;color:#3A3937;line-height:1.72;${i > 0 ? 'margin-top:9px;' : ''}">${p}</p>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${d.project_name} — Project Monthly Report</title>
<style>
  @font-face{font-family:'DIN Next Arabic';src:url('${FONTS_URL}/DINNextArabic-Regular-v2.otf') format('opentype');font-weight:400}
  @font-face{font-family:'DIN Next Arabic';src:url('${FONTS_URL}/DINNextArabic-Medium-v2.otf') format('opentype');font-weight:500}
  @font-face{font-family:'DIN Next Arabic';src:url('${FONTS_URL}/DINNextArabic-Bold-v2.otf') format('opentype');font-weight:700}
  @font-face{font-family:'DIN Next LT W23';src:url('${FONTS_URL}/DINNextLTW23-Regular.otf') format('opentype');font-weight:400}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}
</style>
</head>
<body>
<div style="width:1122px;background:white;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;">

  <!-- HEADER -->
  <div style="position:relative;overflow:hidden;background:#7A1143;height:168px;display:flex;align-items:stretch;">
    <div style="position:absolute;inset:0;background-image:url('${ASSETS_URL}/neom-07.jpg');background-size:cover;background-position:center 30%;opacity:0.2;mix-blend-mode:luminosity;"></div>
    <div style="position:absolute;inset:0;background-image:url('${ASSETS_URL}/TD-PATTERNS-02-palmtrees.png');background-size:180px;opacity:0.06;"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(122,17,67,0.3) 0%,transparent 60%);"></div>
    <div style="position:relative;z-index:1;padding:28px 32px;border-right:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;justify-content:space-between;width:130px;flex-shrink:0;">
      <img src="${ASSETS_URL}/TD-LOGO-04-badge-white.png" alt="Tashyid" style="height:44px;display:block;">
      <div style="font-family:'DIN Next LT W23',sans-serif;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Confidential</div>
    </div>
    <div style="position:relative;z-index:1;padding:28px 40px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(255,255,255,0.38);">Project Monthly Report</div>
      <div>
        <div style="font-family:'DIN Next LT W23',sans-serif;font-size:52px;font-weight:700;color:white;line-height:1;letter-spacing:-0.02em;text-transform:uppercase;">${d.project_name}</div>
        <div style="margin-top:10px;display:flex;align-items:center;gap:10px;">
          <span style="font-family:'DIN Next LT W23',sans-serif;font-size:11px;color:rgba(255,255,255,0.55);">${d.fund_name}</span>
          <span style="color:rgba(255,255,255,0.2);">◇</span>
          <span style="font-family:'DIN Next LT W23',sans-serif;font-size:11px;color:rgba(255,255,255,0.55);">${d.location}</span>
          <span style="color:rgba(255,255,255,0.2);">◇</span>
          <span style="font-family:'DIN Next LT W23',sans-serif;font-size:11px;color:rgba(255,255,255,0.55);">${d.phase_label}</span>
        </div>
      </div>
    </div>
    <div style="position:relative;z-index:1;padding:28px 36px;border-left:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;width:200px;flex-shrink:0;">
      <div>
        <div style="display:inline-flex;align-items:center;gap:7px;background:${statusBg};border:1px solid ${statusBorder};padding:5px 12px;border-radius:2px;margin-bottom:5px;">
          <span style="width:6px;height:6px;background:${statusColor};border-radius:50%;"></span>
          <span style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${statusColor};">${d.status}</span>
        </div>
        <div style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.35);text-align:right;">${d.report_date}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'DIN Next LT W23',sans-serif;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:2px;">Sidra Term Sheet Open</div>
        <div style="font-family:'DIN Next LT W23',sans-serif;font-size:44px;font-weight:700;color:#F5C040;line-height:1;">${d.days_sidra_open}<span style="font-size:16px;color:rgba(255,255,255,0.45);font-weight:400;margin-left:3px;">days</span></div>
      </div>
    </div>
  </div>

  <!-- Chevron stripe -->
  <div style="height:12px;background-image:url('${ASSETS_URL}/TD-PATTERNS-05-chevron.png');background-size:cover;"></div>

  <!-- STAT STRIP -->
  <div style="background:#F8F6F4;display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid #E4E0DC;">
    ${[
      ['PM', d.pm, '11px', '#2E2D2C'],
      ['Units', d.units, '18px', '#7A1143'],
      ['Floors', d.floors, '18px', '#7A1143'],
      ['Fund Manager', d.fund_manager, '11px', '#2E2D2C'],
      ['Contractor', d.contractor, '11px', '#2E2D2C'],
      ['Designer', d.designer, '11px', '#2E2D2C'],
      ['Supervision', d.supervision, '11px', '#2E2D2C']
    ].map(([label, val, size, color], i, arr) =>
      `<div style="padding:10px 14px;${i < arr.length - 1 ? 'border-right:1px solid #E4E0DC;' : ''}">
        <div style="font-family:'DIN Next LT W23',sans-serif;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#9E9B99;margin-bottom:2px;">${label}</div>
        <div style="font-family:'DIN Next LT W23',sans-serif;font-size:${size};font-weight:700;color:${color};line-height:1.2;">${val}</div>
       </div>`
    ).join('')}
  </div>

  <!-- PHASE TRACKERS -->
  ${phasesHTML}

  <!-- 3-COLUMN BODY -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;min-height:360px;">

    <div style="padding:22px 26px 22px 36px;border-right:1px solid #E4E0DC;">
      <div style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;letter-spacing:0.26em;text-transform:uppercase;color:#7A1143;display:flex;align-items:center;gap:6px;padding-bottom:8px;border-bottom:1px solid #E4E0DC;margin-bottom:11px;">◇ Project Overview</div>
      ${overviewHTML}
      <div style="margin-top:16px;border-radius:2px;overflow:hidden;height:90px;position:relative;">
        <div style="position:absolute;inset:0;background-image:url('${ASSETS_URL}/neom-03.jpg');background-size:cover;background-position:center;"></div>
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(122,17,67,0.6) 0%,transparent 60%);"></div>
        <div style="position:absolute;bottom:9px;left:11px;font-family:'DIN Next LT W23',sans-serif;font-size:8px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.6);">Corniche · Jeddah</div>
      </div>
    </div>

    <div style="padding:22px 26px;border-right:1px solid #E4E0DC;">
      <div style="margin-bottom:20px;">
        <div style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;letter-spacing:0.26em;text-transform:uppercase;color:#7A1143;display:flex;align-items:center;gap:6px;padding-bottom:8px;border-bottom:1px solid #E4E0DC;margin-bottom:11px;">◇ Progress This Month</div>
        ${progressHTML(d.progress_items || [])}
      </div>
      <div>
        <div style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;letter-spacing:0.26em;text-transform:uppercase;color:#7A1143;display:flex;align-items:center;gap:6px;padding-bottom:8px;border-bottom:1px solid #E4E0DC;margin-bottom:11px;">◇ Financial Status</div>
        <div style="display:flex;align-items:center;gap:6px;background:rgba(200,134,10,0.07);border:1px solid rgba(200,134,10,0.28);border-radius:2px;padding:7px 10px;margin-bottom:9px;">
          <span style="width:6px;height:6px;background:#C8860A;border-radius:50%;flex-shrink:0;"></span>
          <span style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#9A6408;">AMBER — Attention Required</span>
        </div>
        <p style="font-family:'DIN Next Arabic',sans-serif;font-size:11px;color:#3A3937;line-height:1.72;">${d.financial_body || ''}</p>
        <div style="margin-top:9px;background:#F8F6F4;border-left:3px solid #C8860A;padding:8px 10px;border-radius:0 2px 2px 0;">
          <p style="font-family:'DIN Next Arabic',sans-serif;font-size:11px;color:#7A1143;font-weight:600;line-height:1.72;">${d.financial_callout || ''}</p>
        </div>
      </div>
    </div>

    <div style="padding:22px 36px 22px 26px;">
      <div style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;letter-spacing:0.26em;text-transform:uppercase;color:#7A1143;display:flex;align-items:center;gap:6px;padding-bottom:8px;border-bottom:1px solid #E4E0DC;margin-bottom:11px;">◇ What Happens Next</div>
      <div style="display:flex;flex-direction:column;gap:8px;">${nextStepsHTML(d.next_steps || [])}</div>
    </div>
  </div>

  <!-- CEO DECISIONS -->
  <div style="background:#2E2D2C;padding:18px 36px;position:relative;overflow:hidden;">
    <div style="position:absolute;inset:0;background-image:url('${ASSETS_URL}/TD-PATTERNS-04-shield.png');background-size:140px;opacity:0.05;"></div>
    <div style="position:relative;z-index:1;display:grid;grid-template-columns:auto 1fr 1fr;gap:28px;align-items:center;">
      <div style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;letter-spacing:0.26em;text-transform:uppercase;color:rgba(255,255,255,0.35);writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;border-right:1px solid rgba(255,255,255,0.1);padding-right:14px;">◇ CEO Decisions Required</div>
      ${decisionsHTML(d.ceo_decisions || [])}
    </div>
  </div>

  <!-- FOOTER -->
  <div style="background:#7A1143;padding:11px 36px;display:flex;align-items:center;justify-content:space-between;">
    <div style="font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Confidential — CEO &amp; Investor Use Only</div>
    <div style="display:flex;align-items:center;gap:10px;font-family:'DIN Next LT W23',sans-serif;font-size:8.5px;color:rgba(255,255,255,0.4);">
      <span>www.tashyid.sa</span><span style="color:rgba(255,255,255,0.2);">◇</span>
      <span>Info@tashyid.sa</span><span style="color:rgba(255,255,255,0.2);">◇</span>
      <span>+966 12 612 6277</span>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const xlsxPath = findExcel(process.argv[2]);
  console.log(`📊 Reading Excel: ${path.relative(REPO_ROOT, xlsxPath)}`);

  const data = await parseExcel(xlsxPath);
  console.log(`✅ Data loaded — ${data.project_name}, ${data.report_date}, status: ${data.status}`);

  const html = buildHTML(data);

  const now = new Date();
  const dateStr  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const pdfName  = `Alya-Tower-Report-${dateStr}.pdf`;
  const pdfPath  = path.join(REPORTS_DIR, pdfName);

  console.log('🖨️  Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1122, height: 794 });
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
  const pdf = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    scale: 0.792,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  await browser.close();

  fs.writeFileSync(pdfPath, pdf);
  console.log(`✅ PDF saved: ${path.relative(REPO_ROOT, pdfPath)}`);

  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput) {
    fs.appendFileSync(ghOutput, `pdf_path=${pdfPath}\npdf_name=${pdfName}\nreport_date=${data.report_date}\n`);
  }
}

main().catch(err => {
  console.error('❌ Report generation failed:', err.message);
  process.exit(1);
});
