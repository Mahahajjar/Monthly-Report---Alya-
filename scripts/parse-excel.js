#!/usr/bin/env node
/**
 * Reads the report Excel file and returns a structured data object
 * ready to be passed to the HTML/PDF builder.
 *
 * Expected sheet structure — see data/EXCEL-TEMPLATE.md for the full guide.
 *
 * Sheets:
 *   Settings     — project metadata (rarely changes)
 *   Monthly      — report date, status, overview text, financial text
 *   Progress     — bullet points for "Progress This Month"
 *   Next Steps   — action items with due dates and urgency
 *   CEO Decisions — decisions required from the CEO
 *   Phases       — phase tracker (tasks, done/pending)
 */

const ExcelJS = require('exceljs');

async function parseExcel(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const settings = readKeyValueSheet(wb.getWorksheet('Settings'));
  const monthly  = readKeyValueSheet(wb.getWorksheet('Monthly'));

  // Progress items: col A = bold prefix, col B = rest of text
  const progress = [];
  const progressSheet = wb.getWorksheet('Progress');
  if (progressSheet) {
    progressSheet.eachRow((row, n) => {
      if (n === 1) return; // skip header
      const text = cellStr(row.getCell(2));
      if (text) progress.push({ bold_prefix: cellStr(row.getCell(1)), text });
    });
  }

  // Next steps: Title | Description | Due | Urgency
  const nextSteps = [];
  const nsSheet = wb.getWorksheet('Next Steps');
  if (nsSheet) {
    nsSheet.eachRow((row, n) => {
      if (n === 1) return;
      const title = cellStr(row.getCell(1));
      if (!title) return;
      nextSteps.push({
        title,
        description: cellStr(row.getCell(2)),
        due:         cellStr(row.getCell(3)),
        urgency:     cellStr(row.getCell(4)).toLowerCase() || 'normal'
      });
    });
  }

  // CEO Decisions: Urgency | Title | Body
  const ceoDecisions = [];
  const cdSheet = wb.getWorksheet('CEO Decisions');
  if (cdSheet) {
    cdSheet.eachRow((row, n) => {
      if (n === 1) return;
      const urgency = cellStr(row.getCell(1));
      if (!urgency) return;
      ceoDecisions.push({
        urgency: urgency,
        title:   cellStr(row.getCell(2)),
        body:    cellStr(row.getCell(3))
      });
    });
  }

  // Phases — two tables in one sheet
  // Table 1 (rows 2–N, cols B–E): Name | Color | Badge | Columns
  // Empty row separator
  // Table 2 (remaining rows, cols A–C): Phase Name | Task | Status
  const phases = {};
  const phaseSheet = wb.getWorksheet('Phases');
  if (phaseSheet) {
    let inConfig = true;
    phaseSheet.eachRow((row, n) => {
      if (n === 1) return; // header of config table

      const colA = cellStr(row.getCell(1));
      const colB = cellStr(row.getCell(2));

      if (inConfig) {
        // Config rows: B=name, C=color, D=badge, E=columns
        const name = cellStr(row.getCell(2));
        if (!name) { inConfig = false; return; } // empty row = end of config
        phases[name] = {
          name,
          color:   cellStr(row.getCell(3)) || '#7A1143',
          badge:   cellStr(row.getCell(4)) || 'PM',
          columns: Number(row.getCell(5).value) || 7,
          tasks_done:    [],
          tasks_pending: []
        };
      } else {
        // Task rows: A=phase name, B=task name, C=Done/Pending
        if (!colA || !colB) return;
        const phase = phases[colA];
        if (!phase) return;
        const status = cellStr(row.getCell(3)).toLowerCase();
        if (status === 'done') phase.tasks_done.push(colB);
        else phase.tasks_pending.push(colB);
      }
    });
  }

  const phaseList = Object.values(phases).map(p => ({
    ...p,
    done:  p.tasks_done.length,
    total: p.tasks_done.length + p.tasks_pending.length
  }));

  return {
    project_name:        cellStr2(settings['Project Name']) || 'ALYA TOWER',
    location:            cellStr2(settings['Location'])     || '',
    fund_name:           cellStr2(settings['Fund Name'])    || '',
    phase_label:         cellStr2(settings['Phase Label'])  || '',
    pm:                  cellStr2(settings['PM'])           || '',
    units:               Number(settings['Units'])          || 0,
    floors:              Number(settings['Floors'])         || 0,
    fund_manager:        cellStr2(settings['Fund Manager']) || '',
    contractor:          cellStr2(settings['Contractor'])   || '',
    designer:            cellStr2(settings['Designer'])     || '',
    supervision:         cellStr2(settings['Supervision'])  || '',

    report_date:         cellStr2(monthly['Report Date'])      || '',
    status:              cellStr2(monthly['Status'])           || 'AMBER',
    days_sidra_open:     Number(monthly['Days Sidra Open'])    || 0,
    overview_paragraphs: [
      cellStr2(monthly['Overview Para 1']) || '',
      cellStr2(monthly['Overview Para 2']) || '',
      cellStr2(monthly['Overview Para 3']) || ''
    ].filter(Boolean),
    financial_body:      cellStr2(monthly['Financial Body'])    || '',
    financial_callout:   cellStr2(monthly['Financial Callout']) || '',

    progress_items: progress,
    next_steps:     nextSteps,
    ceo_decisions:  ceoDecisions,
    phases:         phaseList
  };
}

function cellStr(cell) {
  const v = cell ? cell.value : null;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && v.richText) return v.richText.map(r => r.text).join('');
  return String(v).trim();
}

function cellStr2(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && val.richText) return val.richText.map(r => r.text).join('');
  return String(val).trim();
}

module.exports = { parseExcel };
