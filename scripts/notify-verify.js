#!/usr/bin/env node
// Sends a Teams verification message showing extracted financial figures.
// The PM reviews these before approving the full publish run.
// Env: TEAMS_WEBHOOK_URL, FINANCIAL_STATUS, FINANCIAL_BODY, FINANCIAL_CALLOUT, FINANCIAL_SUMMARY

const https = require('https');

const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
const status    = process.env.FINANCIAL_STATUS   || 'AMBER';
const body      = process.env.FINANCIAL_BODY     || '(not extracted)';
const callout   = process.env.FINANCIAL_CALLOUT  || '(not extracted)';
const summary   = process.env.FINANCIAL_SUMMARY  || '(no figures found)';
const pdfCount  = process.env.PDF_COUNT          || '?';

if (!webhookUrl) {
  console.error('❌ TEAMS_WEBHOOK_URL not set');
  process.exit(1);
}

const statusColors = { GREEN: '00AA55', AMBER: 'C8860A', RED: 'CC3333' };
const themeColor = statusColors[status] || 'C8860A';
const statusLabel = { GREEN: '✅ GREEN', AMBER: '⚠️ AMBER', RED: '🔴 RED' }[status] || status;

const summaryLines = summary
  .split('\n')
  .filter(l => l.trim())
  .map(l => ({ name: ' ', value: l.trim() }));

const payload = JSON.stringify({
  '@type': 'MessageCard',
  '@context': 'http://schema.org/extensions',
  themeColor,
  summary: 'Alya Tower — Financial Data Verification',
  sections: [
    {
      activityTitle: '🔍 ALYA TOWER — Financial Data Verification',
      activitySubtitle: `Review these figures before running the full report publish · ${pdfCount} PDF(s) read`,
      markdown: true
    },
    {
      title: `Financial Status: ${statusLabel}`,
      facts: [
        { name: 'Summary', value: body },
        { name: 'Key Action', value: callout }
      ],
      markdown: true
    },
    {
      title: '📋 Key Figures Extracted',
      facts: summaryLines.length ? summaryLines : [{ name: ' ', value: '(none found)' }],
      markdown: true
    },
    {
      title: '▶️ What to do next',
      text: 'If the figures above look **correct**, go to:\n\nGitHub → Actions → Monthly Report Generator → **Run workflow** → set action = **publish**\n\nIf something looks wrong, update the source PDFs in Dropbox and run **verify** again.',
      markdown: true
    }
  ]
});

const url = new URL(webhookUrl);
const req = https.request({
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Verification message sent to Teams');
    } else {
      console.error(`❌ Teams returned ${res.statusCode}: ${body}`);
      process.exit(1);
    }
  });
});

req.on('error', err => {
  console.error('❌ Teams send failed:', err.message);
  process.exit(1);
});

req.write(payload);
req.end();
