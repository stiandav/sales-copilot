// Client-side objection detection engine — no server, no API calls
class ObjectionEngine {
  detect(text) {
    if (!text || text.trim().length < 5) return null;

    const lower = text.toLowerCase();

    // Pass 1: Exact pattern matching (most reliable)
    let bestMatch = null;
    let bestPriority = -1;

    for (const script of SCRIPTS_DB) {
      for (const pattern of script.patterns) {
        if (lower.includes(pattern)) {
          if (!bestMatch || script.priority > bestPriority) {
            bestMatch = {
              script: script,
              matchedPattern: pattern,
              triggerText: text,
              matchType: 'exact',
            };
            bestPriority = script.priority;
          }
        }
      }
    }

    if (bestMatch) return bestMatch;

    // Pass 2: Keyword scoring — count how many keywords from each script's patterns
    // appear as individual words in the input
    const inputWords = lower.split(/\s+/).filter(w => w.length > 2);
    let topScore = 0;
    let topScript = null;

    for (const script of SCRIPTS_DB) {
      let score = 0;
      let matchedWords = [];
      // Build a set of keywords from all patterns
      const keywords = new Set();
      for (const pattern of script.patterns) {
        for (const word of pattern.split(/\s+/)) {
          if (word.length > 2) keywords.add(word);
        }
      }
      for (const word of inputWords) {
        if (keywords.has(word)) {
          score++;
          matchedWords.push(word);
        }
      }
      if (score > topScore) {
        topScore = score;
        topScript = { script, matchedWords };
      }
    }

    // Require at least 2 keyword matches for a fuzzy hit
    if (topScore >= 2 && topScript) {
      return {
        script: topScript.script,
        matchedPattern: topScript.matchedWords.join(', '),
        triggerText: text,
        matchType: 'keyword',
      };
    }

    // Pass 3: No match — return a universal bridge response
    return {
      script: this._buildBridgeScript(text),
      matchedPattern: null,
      triggerText: text,
      matchType: 'bridge',
    };
  }

  _buildBridgeScript(text) {
    // Analyze the tone/intent to pick the best universal response
    const lower = text.toLowerCase();

    // Negative / resistant tone
    const isNegative = /no|not|don't|won't|can't|never|stop|quit|leave|hate|angry|upset|annoyed|frustrated/.test(lower);
    // Question / curious tone
    const isQuestion = /\?|how|what|why|when|where|who|which|could you|can you|tell me|explain/.test(lower);
    // Stalling / uncertain
    const isStalling = /maybe|think about|let me|need to|have to|give me|send me|i'll get back|we'll see|not sure|i don't know/.test(lower);

    if (isQuestion) {
      return {
        id: 'bridge-question',
        category: 'BRIDGE',
        label: 'Prospect Question',
        script: "That's a great question — and I appreciate you asking. Here's what I can tell you: our team has deep experience in your local market, and we invest heavily in marketing to get our listings maximum exposure. But rather than just talk about it, what if I put together a custom report for your specific property? That way you can see real numbers and make the best decision for your situation. Would that be helpful?"
      };
    }

    if (isStalling) {
      return {
        id: 'bridge-stalling',
        category: 'BRIDGE',
        label: 'Needs Time',
        script: "I totally understand wanting to think it over — this is a big decision. Here's what I'd suggest: let me send you a free, no-obligation market analysis for your home. That way when you're ready to revisit this, you'll have real data in front of you — not just guesses. There's zero pressure and nothing to sign. What email address works best for you?"
      };
    }

    if (isNegative) {
      return {
        id: 'bridge-negative',
        category: 'BRIDGE',
        label: 'Resistant',
        script: "I completely respect that, and the last thing I want is to waste your time. I'm not your typical agent making a cold call — our team has years of experience right here in your area, and we invest heavily in marketing because we're serious about getting results. Would it be fair if I just sent you a quick home valuation? If the number doesn't excite you, I promise I won't bug you again."
      };
    }

    // Default universal bridge
    return {
      id: 'bridge-universal',
      category: 'BRIDGE',
      label: 'General Response',
      script: "I hear you — and I appreciate your honesty. Let me ask you this: if I could show you, with real data, exactly what your home would sell for in today's market — and if that number made sense for your family — would you be open to at least having that conversation? I'm not asking for a commitment, just 5 minutes and some real numbers. Our team has deep local experience and we invest heavily in marketing to make sure our clients get top dollar. What do you think?"
    };
  }

  getScriptsForLeadType(leadType) {
    if (!leadType) return SCRIPTS_DB;
    return SCRIPTS_DB.filter(
      (s) => !s.leadTypes || s.leadTypes.length === 0 || s.leadTypes.includes(leadType)
    );
  }

  getScenariosForLeadType(leadType) {
    return SCENARIOS[leadType || ""] || SCENARIOS[""];
  }
}
