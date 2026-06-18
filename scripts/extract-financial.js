#!/usr/bin/env node
// Extracts text from payment PDFs and synthesizes financial data using Claude AI.
// Args: comma-separated list of PDF file paths
// Env: ANTHROPIC_API_KEY
// Saves: reports/_financial.json
// Outputs to GITHUB_OUTPUT: financial_status, financial_body, financial_callout, financial_summary

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const Anthropic = require('@anthropic-ai/sdk');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const client = new Anthropic();

async function extractText(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await pdfParse(buffer);
    return { text: result.text, pages: result.numpages, ok: true };
  } catch (err) {
    console.warn(`  ⚠️  Could not parse ${path.basename(filePath)}: ${err.message}`);
    return { text: '', pages: 0, ok: false };
  }
}

async function synthesize(texts, fileNames) {
  const sections = texts
    .map((t, i) => `=== DOCUMENT: ${fileNames[i]} ===\n${t.text.trim()}`)
    .join('\n\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are reviewing financial payment documents for ALYA TOWER, a 30-floor luxury residential project in Corniche, Jeddah, Saudi Arabia.

Below are payment update documents extracted from PDFs. Analyze them and return a JSON object.

${sections}

Return ONLY a valid JSON object with exactly these fields:
{
  "financial_status": "GREEN" | "AMBER" | "RED",
  "financial_body": "2–3 sentences summarizing the current financial position. Use specific figures (SAR amounts, percentages, dates, contractor names) wherever available. Be factual and precise.",
  "financial_callout": "One sentence: the single most urgent financial matter or next action required.",
  "financial_summary": "Bullet-point list of all key figures found (payments made, amounts, dates, contractors, outstanding items). One item per line starting with •"
}

Rules:
- GREEN = payments on track, no outstanding issues
- AMBER = minor delays or pending items requiring attention
- RED = significant payment issues, overdue amounts, or disputes
- If figures are unclear or documents are incomplete, say so honestly in the body.`
    }]
  });

  const raw = response.content[0].text.trim();
  // Strip markdown code fences if model wrapped in them
  const jsonStr = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(jsonStr);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const pdfPaths = (process.argv[2] || '').split(',').filter(Boolean);
  if (!pdfPaths.length) {
    console.error('❌ No PDF paths provided as argument');
    process.exit(1);
  }

  console.log(`📄 Extracting text from ${pdfPaths.length} PDF(s)...`);

  const extracted = [];
  for (const p of pdfPaths) {
    process.stdout.write(`  📖 ${path.basename(p)} ... `);
    const result = await extractText(p);
    console.log(result.ok ? `${result.pages} pages, ${result.text.length} chars` : 'FAILED (skipped)');
    extracted.push(result);
  }

  const usable = extracted.filter(e => e.ok && e.text.trim().length > 50);
  if (!usable.length) {
    console.error('❌ No usable text could be extracted from any PDF');
    console.error('   PDFs may be scanned images — they require OCR which is not supported');
    process.exit(1);
  }

  const usableNames = pdfPaths
    .filter((_, i) => extracted[i].ok && extracted[i].text.trim().length > 50)
    .map(p => path.basename(p));

  console.log(`\n🤖 Synthesizing financial data from ${usable.length} document(s)...`);
  const financial = await synthesize(usable, usableNames);

  // Validate required fields
  const required = ['financial_status', 'financial_body', 'financial_callout', 'financial_summary'];
  for (const field of required) {
    if (!financial[field]) throw new Error(`AI response missing field: ${field}`);
  }
  if (!['GREEN', 'AMBER', 'RED'].includes(financial.financial_status)) {
    financial.financial_status = 'AMBER'; // safe default
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 EXTRACTED FINANCIAL DATA — review before publishing');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Status  : ${financial.financial_status}`);
  console.log(`\nBody    : ${financial.financial_body}`);
  console.log(`\nCallout : ${financial.financial_callout}`);
  console.log(`\nFigures :\n${financial.financial_summary}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORTS_DIR, '_financial.json'), JSON.stringify(financial, null, 2));
  console.log('✅ Saved to reports/_financial.json');

  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput) {
    const delim = `EOF_${Date.now()}`;
    fs.appendFileSync(ghOutput, `financial_status=${financial.financial_status}\n`);
    fs.appendFileSync(ghOutput, `financial_body<<${delim}\n${financial.financial_body}\n${delim}\n`);
    fs.appendFileSync(ghOutput, `financial_callout<<${delim}\n${financial.financial_callout}\n${delim}\n`);
    fs.appendFileSync(ghOutput, `financial_summary<<${delim}\n${financial.financial_summary}\n${delim}\n`);
  }
}

main().catch(err => {
  console.error('❌ Financial extraction failed:', err.message);
  process.exit(1);
});
