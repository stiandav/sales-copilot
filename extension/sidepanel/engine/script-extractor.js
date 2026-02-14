// ScriptExtractor — parses pasted/uploaded text to extract objection handlers and scripts.
// Runs 100% in the browser, no server needed.

var ScriptExtractor = (function () {

  // Keywords for auto-categorizing extracted scripts
  var CATEGORY_KEYWORDS = {
    not_interested: ['not interested', 'no thanks', 'don\'t want', 'not looking', 'pass', 'not for me', 'no need'],
    has_agent: ['have an agent', 'already working with', 'have a realtor', 'got an agent', 'my agent', 'friend is', 'family member', 'already listed'],
    bad_timing: ['bad time', 'busy', 'call back', 'can\'t talk', 'not a good time', 'at work', 'in a meeting', 'driving'],
    not_selling: ['not selling', 'not moving', 'love our home', 'staying put', 'not planning', 'happy here', 'not going anywhere'],
    price_concern: ['market is down', 'prices dropping', 'not worth it', 'interest rates', 'market crash', 'bubble', 'values dropping'],
    commission: ['commission', 'fees', 'too expensive', 'percentage', 'six percent', 'five percent', 'how much do you charge'],
    fsbo: ['sell it myself', 'by owner', 'don\'t need agent', 'fsbo', 'do it myself', 'list it myself', 'sell it on my own'],
    expired: ['tried before', 'didn\'t sell', 'sat on market', 'expired', 'listing expired', 'took it off', 'no offers'],
    tenant: ['tenant', 'landlord', 'renting', 'rental', 'property management', 'renters', 'landlording'],
    foreclosure: ['foreclosure', 'behind on payments', 'can\'t afford', 'bank is threatening', 'notice of default', 'short sale', 'underwater'],
    spouse: ['spouse', 'husband', 'wife', 'partner', 'need to talk to', 'need to discuss'],
    do_not_call: ['do not call', 'stop calling', 'take me off', 'don\'t call', 'remove my number', 'how did you get'],
  };

  var CATEGORY_LABELS = {
    not_interested: 'Not Interested',
    has_agent: 'Has Agent',
    bad_timing: 'Bad Timing',
    not_selling: 'Not Selling',
    price_concern: 'Price / Market',
    commission: 'Commission',
    fsbo: 'FSBO / DIY',
    expired: 'Expired',
    tenant: 'Tenant / Landlord',
    foreclosure: 'Foreclosure',
    spouse: 'Need Spouse',
    do_not_call: 'Do Not Call',
    general: 'General',
  };

  // Detect which category a piece of text belongs to
  function detectCategory(text) {
    var lower = text.toLowerCase();
    var bestCategory = 'general';
    var bestScore = 0;

    Object.keys(CATEGORY_KEYWORDS).forEach(function (cat) {
      var score = 0;
      CATEGORY_KEYWORDS[cat].forEach(function (kw) {
        if (lower.indexOf(kw) !== -1) score++;
      });
      if (score > bestScore) {
        bestScore = score;
        bestCategory = cat;
      }
    });

    return bestCategory;
  }

  // Generate a short label from an objection text
  function makeLabel(text) {
    // Take first meaningful words, max ~25 chars
    var cleaned = text.replace(/^["'\s]+|["'\s]+$/g, '').replace(/[.!?]+$/, '');
    if (cleaned.length <= 25) return cleaned;
    var words = cleaned.split(/\s+/);
    var label = '';
    for (var i = 0; i < words.length && label.length < 22; i++) {
      label += (i > 0 ? ' ' : '') + words[i];
    }
    return label + (label.length < cleaned.length ? '...' : '');
  }

  // ---- Extraction strategies ----

  // Strategy 1: Explicit objection/response pairs
  // Patterns: "Objection: X" / "Response: Y", "If they say: X" / "Say: Y"
  function extractPairs(text) {
    var scripts = [];
    var pairRegex = /(?:objection|if they say|when they say|prospect says?|they might say|when someone says?|if someone says?)[:\s]*[""]?([^"""\n]+)[""]?\s*\n\s*(?:response|say this|you say|your response|say|script|answer|reply|you should say|then say)[:\s]*[""]?([^"""\n](?:[^\n]*(?:\n(?!(?:objection|if they say|when they say|prospect|they might)).[^\n]*)*)?)[""]?/gi;

    var match;
    while ((match = pairRegex.exec(text)) !== null) {
      var objection = match[1].trim();
      var script = match[2].trim();
      if (objection.length > 5 && script.length > 10) {
        scripts.push({
          label: makeLabel(objection),
          category: detectCategory(objection + ' ' + script),
          objection: objection,
          script: script,
          source: 'extracted',
        });
      }
    }

    return scripts;
  }

  // Strategy 2: ALL CAPS headers followed by paragraphs
  function extractHeaders(text) {
    var scripts = [];
    var sections = text.split(/\n(?=[A-Z][A-Z\s/&]{3,}(?:\n|:))/);

    for (var i = 0; i < sections.length; i++) {
      var lines = sections[i].trim().split('\n');
      if (lines.length < 2) continue;

      var header = lines[0].replace(/[:\s]+$/, '').trim();
      var body = lines.slice(1).join('\n').trim();

      // Must be a real header (mostly uppercase) with a body
      if (header.length < 3 || header.length > 80) continue;
      var upperCount = (header.match(/[A-Z]/g) || []).length;
      if (upperCount / header.length < 0.5) continue;
      if (body.length < 15) continue;

      // Clean up body — remove leading quotes, dashes, etc.
      body = body.replace(/^[""\-–—•*\s]+/, '').replace(/[""\s]+$/, '');

      scripts.push({
        label: header.charAt(0).toUpperCase() + header.slice(1).toLowerCase(),
        category: detectCategory(header + ' ' + body),
        objection: header,
        script: body,
        source: 'extracted',
      });
    }

    return scripts;
  }

  // Strategy 3: Numbered lists — "1. Label" or "1) Label" followed by text
  function extractNumbered(text) {
    var scripts = [];
    var parts = text.split(/\n(?=\d{1,2}[.)]\s)/);

    for (var i = 0; i < parts.length; i++) {
      var section = parts[i].trim();
      var numMatch = section.match(/^\d{1,2}[.)]\s*(.+)/);
      if (!numMatch) continue;

      var lines = section.split('\n');
      var titleLine = lines[0].replace(/^\d{1,2}[.)]\s*/, '').trim();
      var body = lines.slice(1).join('\n').trim();

      // Sometimes the script is on the same line after a colon or dash
      var colonSplit = titleLine.split(/[:–—-]\s*/);
      if (colonSplit.length >= 2 && colonSplit[1].length > 20) {
        titleLine = colonSplit[0].trim();
        body = colonSplit.slice(1).join(' ').trim() + (body ? '\n' + body : '');
      }

      if (body.length < 15) continue;
      body = body.replace(/^[""\-–—•*\s]+/, '').replace(/[""\s]+$/, '');

      scripts.push({
        label: makeLabel(titleLine),
        category: detectCategory(titleLine + ' ' + body),
        objection: titleLine,
        script: body,
        source: 'extracted',
      });
    }

    return scripts;
  }

  // Strategy 4: Double-newline separated blocks with first line as label
  function extractBlocks(text) {
    var scripts = [];
    var blocks = text.split(/\n\s*\n/);

    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i].trim();
      if (!block || block.length < 30) continue;

      var lines = block.split('\n');
      if (lines.length < 2) continue;

      var firstLine = lines[0].replace(/^[-–—•*#]+\s*/, '').replace(/[:\s]+$/, '').trim();
      var rest = lines.slice(1).join('\n').trim();

      // First line should be short (label), rest should be longer (script)
      if (firstLine.length > 60 || firstLine.length < 3) continue;
      if (rest.length < 20) continue;

      rest = rest.replace(/^[""\-–—•*\s]+/, '').replace(/[""\s]+$/, '');

      scripts.push({
        label: makeLabel(firstLine),
        category: detectCategory(firstLine + ' ' + rest),
        objection: firstLine,
        script: rest,
        source: 'extracted',
      });
    }

    return scripts;
  }

  // Strategy 5: Bullet/dash lists — "- Label: Script" or "• Label — Script"
  function extractBullets(text) {
    var scripts = [];
    var bulletRegex = /^[\-–—•*]\s*(.+?)\s*[:–—-]\s*[""]?(.{20,})[""]?\s*$/gm;

    var match;
    while ((match = bulletRegex.exec(text)) !== null) {
      var label = match[1].trim();
      var script = match[2].trim();
      if (label.length < 3 || label.length > 60) continue;

      scripts.push({
        label: makeLabel(label),
        category: detectCategory(label + ' ' + script),
        objection: label,
        script: script,
        source: 'extracted',
      });
    }

    return scripts;
  }

  // ---- Main extraction function ----
  function extract(rawText) {
    if (!rawText || rawText.trim().length < 20) return [];

    var text = rawText.trim();

    // Try all strategies and pick the one that extracts the most
    var results = [
      extractPairs(text),
      extractHeaders(text),
      extractNumbered(text),
      extractBullets(text),
      extractBlocks(text),
    ];

    // Use the strategy that got the most results
    var best = [];
    for (var i = 0; i < results.length; i++) {
      if (results[i].length > best.length) {
        best = results[i];
      }
    }

    // If the best strategy only got a few, merge unique ones from other strategies
    if (best.length < 3) {
      var seen = {};
      best.forEach(function (s) { seen[s.label.toLowerCase()] = true; });

      for (var j = 0; j < results.length; j++) {
        results[j].forEach(function (s) {
          var key = s.label.toLowerCase();
          if (!seen[key]) {
            seen[key] = true;
            best.push(s);
          }
        });
      }
    }

    // Deduplicate by script content similarity
    var deduped = [];
    var scriptKeys = {};
    best.forEach(function (s) {
      var key = s.script.toLowerCase().substring(0, 60);
      if (!scriptKeys[key]) {
        scriptKeys[key] = true;
        deduped.push(s);
      }
    });

    return deduped;
  }

  // ---- Extract agent profile details from text ----
  function extractProfile(text) {
    var profile = {};
    var lower = text.toLowerCase();

    // Try to find name
    var nameMatch = text.match(/(?:my name is|i'm|i am|agent name|name)\s*[:=]?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
    if (nameMatch) profile.name = nameMatch[1].trim();

    // Try to find team/brokerage
    var teamMatch = text.match(/(?:team|brokerage|company|with)\s*[:=]?\s*([A-Z][\w\s&.']+?)(?:\.|,|\n|$)/i);
    if (teamMatch && teamMatch[1].length < 60) profile.team = teamMatch[1].trim();

    // Try to find market area
    var areaMatch = text.match(/(?:market|area|territory|specialize in|cover)\s*[:=]?\s*([A-Z][\w\s,]+(?:County|city|area|region|metro))/i);
    if (areaMatch) profile.area = areaMatch[1].trim();

    return profile;
  }

  return {
    extract: extract,
    extractProfile: extractProfile,
    detectCategory: detectCategory,
    CATEGORY_LABELS: CATEGORY_LABELS,
  };
})();
