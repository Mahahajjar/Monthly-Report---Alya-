#!/usr/bin/env node
/**
 * Posts a Teams notification with a link to the generated report.
 * Reads TEAMS_WEBHOOK_URL, REPORT_URL, REPORT_TITLE from environment.
 */

const https = require('https');

const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
const reportUrl = process.env.REPORT_URL;
const reportTitle = process.env.REPORT_TITLE || 'Alya Tower Monthly Report';
const reportDate = process.env.REPORT_DATE || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

if (!webhookUrl) {
  console.error('❌ TEAMS_WEBHOOK_URL is not set');
  process.exit(1);
}

const payload = JSON.stringify({
  '@type': 'MessageCard',
  '@context': 'http://schema.org/extensions',
  themeColor: '7A1143',
  summary: 'Alya Tower Monthly Report Ready',
  sections: [{
    activityTitle: '📊 Alya Tower — Monthly Report Ready',
    activitySubtitle: `${reportTitle} · Generated ${reportDate}`,
    facts: [
      { name: 'Project', value: 'Alya Tower — Corniche, Jeddah' },
      { name: 'Generated', value: reportDate },
      { name: 'Format', value: 'PDF — A4 Landscape' }
    ],
    markdown: true
  }],
  potentialAction: [{
    '@type': 'OpenUri',
    name: '⬇️ Download PDF Report',
    targets: [{ os: 'default', uri: reportUrl }]
  }]
});

const url = new URL(webhookUrl);
const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Teams notification sent successfully');
    } else {
      console.error(`❌ Teams returned ${res.statusCode}: ${body}`);
      process.exit(1);
    }
  });
});

req.on('error', err => {
  console.error('❌ Teams notification failed:', err.message);
  process.exit(1);
});

req.write(payload);
req.end();
