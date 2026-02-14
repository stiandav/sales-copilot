// Client-side objection detection engine — no server, no API calls
class ObjectionEngine {
  detect(text) {
    if (!text || text.trim().length < 10) return null;

    const lower = text.toLowerCase();
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
            };
            bestPriority = script.priority;
          }
        }
      }
    }

    return bestMatch;
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
