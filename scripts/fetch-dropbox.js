#!/usr/bin/env node
// Downloads all PDFs from a Dropbox folder via Dropbox API v2
// Env: DROPBOX_ACCESS_TOKEN, DROPBOX_FOLDER_PATH
// Outputs to GITHUB_OUTPUT: pdf_paths (comma-separated), pdf_count

const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DROPBOX_ACCESS_TOKEN;
const FOLDER_PATH = process.env.DROPBOX_FOLDER_PATH || '';
const TEMP_DIR = path.join(__dirname, '..', 'reports', '_dropbox_pdfs');

if (!TOKEN) { console.error('❌ DROPBOX_ACCESS_TOKEN not set'); process.exit(1); }
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function apiPost(hostname, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      hostname,
      path: urlPath,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) {
          reject(new Error(`Dropbox API ${res.statusCode}: ${raw.slice(0, 300)}`));
        } else {
          resolve(JSON.parse(raw));
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function downloadFile(dropboxPath, destPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'content.dropboxapi.com',
      path: '/2/files/download',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Dropbox-API-Arg': JSON.stringify({ path: dropboxPath }),
        'Content-Type': 'text/plain',
        'Content-Length': 0
      }
    }, res => {
      if (res.statusCode >= 400) {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => reject(new Error(`Download failed ${res.statusCode}: ${Buffer.concat(chunks).toString().slice(0, 200)}`)));
        return;
      }
      const out = fs.createWriteStream(destPath);
      res.pipe(out);
      out.on('finish', resolve);
      out.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

async function listAllFiles(folderPath) {
  const entries = [];
  const authHeaders = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  };

  let result = await apiPost('api.dropboxapi.com', '/2/files/list_folder', authHeaders, {
    path: folderPath,
    recursive: false
  });
  entries.push(...result.entries);

  while (result.has_more) {
    result = await apiPost('api.dropboxapi.com', '/2/files/list_folder/continue', authHeaders, {
      cursor: result.cursor
    });
    entries.push(...result.entries);
  }

  return entries;
}

async function main() {
  console.log(`📁 Scanning Dropbox folder: ${FOLDER_PATH || '(root)'}`);

  const entries = await listAllFiles(FOLDER_PATH);
  const pdfs = entries.filter(e => e['.tag'] === 'file' && e.name.toLowerCase().endsWith('.pdf'));

  if (!pdfs.length) {
    console.error('❌ No PDF files found in the specified Dropbox folder');
    console.error('   Check that DROPBOX_FOLDER_PATH is correct and the folder contains .pdf files');
    process.exit(1);
  }

  console.log(`📄 Found ${pdfs.length} PDF file(s):`);
  pdfs.forEach(p => console.log(`   • ${p.name} (${(p.size / 1024).toFixed(0)} KB)`));

  const localPaths = [];
  for (const pdf of pdfs) {
    const safeName = pdf.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
    const destPath = path.join(TEMP_DIR, safeName);
    process.stdout.write(`  ⬇️  Downloading: ${pdf.name} ... `);
    await downloadFile(pdf.path_display, destPath);
    console.log('done');
    localPaths.push(destPath);
  }

  console.log(`✅ All ${localPaths.length} PDFs downloaded`);

  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput) {
    fs.appendFileSync(ghOutput, `pdf_paths=${localPaths.join(',')}\n`);
    fs.appendFileSync(ghOutput, `pdf_count=${localPaths.length}\n`);
  }
}

main().catch(err => {
  console.error('❌ Dropbox fetch failed:', err.message);
  process.exit(1);
});
