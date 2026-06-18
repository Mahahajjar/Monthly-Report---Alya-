#!/usr/bin/env node
/**
 * Downloads the report Excel file from SharePoint via Microsoft Graph API.
 * Uses client credentials flow (service principal) — no user login required.
 *
 * Required environment variables:
 *   AZURE_TENANT_ID        — from your Azure AD app registration
 *   AZURE_CLIENT_ID        — from your Azure AD app registration
 *   AZURE_CLIENT_SECRET    — from your Azure AD app registration
 *   SHAREPOINT_HOSTNAME    — e.g. tashyid.sharepoint.com
 *   SHAREPOINT_SITE_PATH   — e.g. /sites/ProjectManagement
 *   SHAREPOINT_FILE_PATH   — e.g. /Shared Documents/Alya Tower/Report.xlsx
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

function httpsPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = typeof body === 'string' ? body : new URLSearchParams(body).toString();
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Length': Buffer.byteLength(payload), ...headers }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'GET', headers }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function getAccessToken() {
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error('Missing Azure credentials (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)');
  }

  const res = await httpsPost(
    `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      grant_type: 'client_credentials',
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default'
    },
    { 'Content-Type': 'application/x-www-form-urlencoded' }
  );

  const json = JSON.parse(res.body);
  if (!json.access_token) throw new Error(`Token request failed: ${res.body}`);
  return json.access_token;
}

async function downloadExcel(token) {
  const { SHAREPOINT_HOSTNAME, SHAREPOINT_SITE_PATH, SHAREPOINT_FILE_PATH } = process.env;
  if (!SHAREPOINT_HOSTNAME || !SHAREPOINT_SITE_PATH || !SHAREPOINT_FILE_PATH) {
    throw new Error('Missing SharePoint config (SHAREPOINT_HOSTNAME, SHAREPOINT_SITE_PATH, SHAREPOINT_FILE_PATH)');
  }

  // Graph API: /sites/{hostname}:{site-path}:/drive/root:{file-path}:/content
  const fileUrl = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_HOSTNAME}:${SHAREPOINT_SITE_PATH}:/drive/root:${SHAREPOINT_FILE_PATH}:/content`;
  console.log(`📥 Downloading from SharePoint: ${SHAREPOINT_FILE_PATH}`);

  let res = await httpsGet(fileUrl, { Authorization: `Bearer ${token}` });

  // Graph API returns a redirect to the actual download URL
  if (res.status === 302 || res.status === 301) {
    const location = res.headers.location;
    console.log(`↪️  Following redirect...`);
    res = await httpsGet(location, {});
  }

  if (res.status !== 200) {
    throw new Error(`Failed to download Excel (HTTP ${res.status}): ${res.body.toString().slice(0, 200)}`);
  }

  const outputPath = path.join(REPORTS_DIR, '_source.xlsx');
  fs.writeFileSync(outputPath, res.body);
  console.log(`✅ Excel saved to: ${path.relative(path.join(__dirname, '..'), outputPath)}`);
  return outputPath;
}

async function main() {
  const token = await getAccessToken();
  const xlsxPath = await downloadExcel(token);

  // Output path for use by generate-report.js
  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput) fs.appendFileSync(ghOutput, `xlsx_path=${xlsxPath}\n`);

  return xlsxPath;
}

main().catch(err => {
  console.error('❌ Excel fetch failed:', err.message);
  process.exit(1);
});

module.exports = { main };
