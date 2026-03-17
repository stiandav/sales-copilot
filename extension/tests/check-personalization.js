#!/usr/bin/env node
// Automated tests for the Sales Copilot Chrome extension.
// Run:  npm test   (or)   node extension/tests/check-personalization.js

const fs = require('fs');
const path = require('path');

const EXT_DIR = path.join(__dirname, '..');
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    \x1b[33m${e.message}\x1b[0m`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// Collect all JS files in the extension (excluding tests/)
function getJsFiles(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'tests' || entry.name === 'node_modules') continue;
    if (entry.isDirectory()) files = files.concat(getJsFiles(full));
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

// Extract string literal contents from JS source
function extractStrings(src) {
  const results = [];
  const regex = /(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/gs;
  let m;
  while ((m = regex.exec(src)) !== null) {
    const text = m[1] || m[2] || m[3] || '';
    if (text.length > 10) results.push(text); // skip tiny strings
  }
  return results;
}

// Find line number for a character offset
function lineOf(src, offset) {
  return src.substring(0, offset).split('\n').length;
}

// ── Forbidden patterns ──────────────────────────────────────────
const FORBIDDEN = [
  { pattern: /San Diego/gi,    label: '"San Diego"' },
  { pattern: /\$30[,.]?000/g,  label: '"$30,000"' },
  { pattern: /37 years/gi,     label: '"37 years"' },
];

// ── Per-file string checks ──────────────────────────────────────
console.log('\n── Forbidden hardcoded values in JS files ──────\n');

const jsFiles = getJsFiles(EXT_DIR);

for (const file of jsFiles) {
  const rel = path.relative(EXT_DIR, file);
  const src = fs.readFileSync(file, 'utf8');
  const strings = extractStrings(src);

  for (const fb of FORBIDDEN) {
    // Find all offending strings in this file
    const hits = [];
    for (const s of strings) {
      fb.pattern.lastIndex = 0;
      if (fb.pattern.test(s)) {
        hits.push(s.substring(0, 60).replace(/\n/g, ' '));
      }
    }

    test(`${rel}: no ${fb.label}`, () => {
      assert(hits.length === 0,
        `${hits.length} occurrence(s) — e.g. "${hits[0]}…"`);
    });
  }
}

// ── HTML checks ─────────────────────────────────────────────────
console.log('\n── HTML checks ────────────────────────────────\n');

const htmlFile = path.join(EXT_DIR, 'sidepanel', 'sidepanel.html');
if (fs.existsSync(htmlFile)) {
  const html = fs.readFileSync(htmlFile, 'utf8');

  test('sidepanel.html: has onboarding overlay', () => {
    assert(
      html.includes('onboarding') || html.includes('setup-overlay') || html.includes('onboard'),
      'No onboarding element found — users will see hardcoded defaults'
    );
  });

  for (const fb of FORBIDDEN) {
    fb.pattern.lastIndex = 0;
    test(`sidepanel.html: no ${fb.label}`, () => {
      assert(!fb.pattern.test(html), `Found ${fb.label} in HTML`);
    });
  }
}

// ── Key structural checks ───────────────────────────────────────
console.log('\n── Structural checks ──────────────────────────\n');

const scriptsFile = path.join(EXT_DIR, 'sidepanel', 'data', 'scripts-data.js');
if (fs.existsSync(scriptsFile)) {
  const src = fs.readFileSync(scriptsFile, 'utf8');

  test('scripts-data.js: SCRIPTS_DB uses placeholder for market area', () => {
    assert(!/San Diego/i.test(src),
      'Still contains hardcoded "San Diego" — use a placeholder like {marketArea}');
  });

  test('scripts-data.js: OPENING_SCRIPTS uses placeholder for market area', () => {
    const section = src.substring(src.indexOf('OPENING_SCRIPTS'));
    assert(!/San Diego/i.test(section), 'OPENING_SCRIPTS still has "San Diego"');
  });
}

const engineFile = path.join(EXT_DIR, 'sidepanel', 'engine', 'objection-engine.js');
if (fs.existsSync(engineFile)) {
  const src = fs.readFileSync(engineFile, 'utf8');

  test('objection-engine.js: no "San Diego" in bridge scripts', () => {
    assert(!/San Diego/i.test(src), 'Bridge scripts still have "San Diego"');
  });

  test('objection-engine.js: no "$30,000" in bridge scripts', () => {
    assert(!/\$30[,.]?000/.test(src), 'Bridge scripts still have "$30,000"');
  });

  test('objection-engine.js: no "37 years" in bridge scripts', () => {
    assert(!/37 years/i.test(src), 'Bridge scripts still have "37 years"');
  });
}

// ── Summary ─────────────────────────────────────────────────────
console.log('\n───────────────────────────────────────────────');
console.log(`  \x1b[${failed ? 31 : 32}m${passed} passed, ${failed} failed\x1b[0m`);
if (failed > 0) {
  console.log('');
  process.exit(1);
} else {
  console.log('  All checks passed!\n');
}
