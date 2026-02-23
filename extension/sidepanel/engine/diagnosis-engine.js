// ========== Real-Time Diagnosis Engine ==========
// Analyzes prospect speech and returns structured coaching:
//   - Signal detection (what's really going on)
//   - Multiple response options ranked by effectiveness
//   - "Why" reasoning for each option
//   - Battle cards when competitors / alternatives are mentioned

var DiagnosisEngine = (function () {

  // ==================== SIGNAL PATTERNS ====================
  var SIGNALS = [
    {
      id: 'timeline_concern',
      label: 'Timeline Concern',
      icon: 'clock',
      patterns: [/not the right time|bad time|not ready|maybe later|few months|next year|spring|waiting|down the road|not yet|after the holidays/i],
    },
    {
      id: 'trust_deficit',
      label: 'Trust Issue',
      icon: 'shield',
      patterns: [/don't trust|don't believe|how do i know|prove it|every agent says|heard that before|all the same|scam|too good/i],
    },
    {
      id: 'price_resistance',
      label: 'Price / Value Concern',
      icon: 'dollar',
      patterns: [/too expensive|commission|fees|not worth|how much|what do you charge|percentage|cost me|six percent|save money/i],
    },
    {
      id: 'competitor_mention',
      label: 'Competitor Mentioned',
      icon: 'flag',
      patterns: [/zillow|redfin|opendoor|offerpad|realtor\.com|other agent|friend.*(agent|realtor)|family.*(agent|realtor)|neighbor.*agent|already.*agent|working with someone/i],
    },
    {
      id: 'emotional_resistance',
      label: 'Emotional Resistance',
      icon: 'heart',
      patterns: [/love (our|this|my) home|kids grew up|memories|sentimental|hard to leave|attached|not ready to let go|been here.*years/i],
    },
    {
      id: 'authority_gap',
      label: 'Needs Spouse / Partner',
      icon: 'users',
      patterns: [/talk to (my|the) (wife|husband|spouse|partner)|we need to discuss|not just my decision|both need to agree|other half/i],
    },
    {
      id: 'information_seeking',
      label: 'Information Seeking',
      icon: 'search',
      patterns: [/how (does|do|would)|what (would|does|is)|can you (explain|tell)|how much is|what's the process|how long/i],
    },
    {
      id: 'past_negative',
      label: 'Bad Past Experience',
      icon: 'alert',
      patterns: [/last agent|previous agent|bad experience|didn't sell|sat on market|expired|waste of time|burned before|let us down|never again/i],
    },
    {
      id: 'financial_stress',
      label: 'Financial Pressure',
      icon: 'alert',
      patterns: [/behind on|can't afford|foreclosure|struggling|underwater|owe more|lost.*job|medical bills|divorce|need money/i],
    },
    {
      id: 'diy_preference',
      label: 'DIY / Self-Sell',
      icon: 'tool',
      patterns: [/do it (myself|ourselves)|sell it (myself|ourselves)|by owner|fsbo|don't need.*agent|handle it|figure it out|own.*research/i],
    },
  ];

  // ==================== BATTLE CARDS ====================
  var BATTLE_CARDS = [
    {
      trigger: /zillow/i,
      competitor: 'Zillow',
      angles: [
        { title: 'Zestimate Accuracy', text: 'Zillow\'s Zestimate has a median error of 6.9% — on a $800K San Diego home, that\'s $55,000 off. Our CMAs use actual closed sales, not algorithms.' },
        { title: 'Exposure Gap', text: 'Zillow listings get views but not qualified buyers. Our $30K/month marketing targets active, pre-approved buyers in your price range.' },
        { title: 'Negotiation', text: 'Zillow can\'t negotiate for you. Our team has 37 years of experience getting top dollar at the negotiating table.' },
      ],
    },
    {
      trigger: /redfin/i,
      competitor: 'Redfin',
      angles: [
        { title: 'Discount = Discount Service', text: 'Redfin agents handle 3x more listings — that means less attention on your home. Our listing specialist is dedicated to your property.' },
        { title: 'Local Expertise', text: 'Redfin assigns agents by availability, not neighborhood. We specialize in San Diego County — your specific streets, schools, and buyer pool.' },
        { title: 'Marketing Investment', text: 'Redfin saves on marketing. We invest $30,000/month in targeted campaigns, professional photography, and staging.' },
      ],
    },
    {
      trigger: /opendoor|offerpad|instant offer|ibuyer|cash offer/i,
      competitor: 'iBuyer / Cash Offer',
      angles: [
        { title: 'Net Proceeds', text: 'iBuyers offer 10-15% below market to cover their profit margin. Our clients typically net significantly more even after commission.' },
        { title: 'Hidden Fees', text: 'Cash offers come with service fees of 5-8% PLUS repair deductions they control. It\'s often a worse deal than a traditional sale.' },
        { title: 'Market Conditions', text: 'In San Diego\'s low-inventory market, open market sales with competition drive prices UP. An instant offer skips that entirely.' },
      ],
    },
    {
      trigger: /other agent|friend.*(agent|realtor)|family.*(agent|realtor)|neighbor.*agent|already.*agent|working with someone|have.*realtor/i,
      competitor: 'Their Current Agent',
      angles: [
        { title: 'Second Opinion', text: 'Getting a second pricing opinion is smart — it either confirms their price or reveals an opportunity. Either way, you win.' },
        { title: 'Marketing Difference', text: 'Ask what their agent\'s marketing plan is. Our team invests $30K/month and has a dedicated listing specialist. Not all agents offer that.' },
        { title: 'Track Record', text: '37 years in San Diego real estate. We can show you exactly how our listings perform — average days on market, list-to-sale ratio, everything.' },
      ],
    },
    {
      trigger: /for sale by owner|fsbo|sell it (myself|ourselves)|do it (myself|ourselves)|don't need.*agent/i,
      competitor: 'FSBO (Self-Sell)',
      angles: [
        { title: 'Price Gap', text: 'NAR data shows FSBO homes sell for a median of $100K less than agent-listed homes. The commission pays for itself and then some.' },
        { title: 'Liability Risk', text: 'Real estate contracts in California have major legal exposure. One disclosure mistake can cost tens of thousands in a lawsuit.' },
        { title: 'Buyer Pool', text: 'FSBO listings only reach a fraction of buyers. Our MLS listing + $30K marketing reach every qualified buyer in the market.' },
      ],
    },
  ];

  // ==================== RESPONSE OPTIONS ====================
  // Each signal has multiple response strategies the agent can choose from
  var RESPONSE_OPTIONS = {
    timeline_concern: {
      diagnosis: 'The prospect isn\'t saying no — they\'re saying not now. The goal is to stay relevant and plant a seed.',
      options: [
        {
          label: 'Anchor to Market Data',
          script: 'I totally understand the timing. Here\'s what I\'d want you to know though — San Diego inventory is at historic lows right now and your home\'s value may be at its peak. What if I sent you a quick market snapshot so you can track it? That way when the timing is right, you\'ll have real data to work with.',
          why: 'Creates urgency without pressure. Positions you as an advisor, not a salesperson.',
        },
        {
          label: 'Future Value Play',
          script: 'That makes total sense. A lot of homeowners I work with in your area just like having the information. What if I put together a complimentary home valuation? No commitment — you\'ll just know exactly where you stand financially. Would that be helpful?',
          why: 'Low-commitment ask that keeps the door open and builds trust.',
        },
        {
          label: 'Soft Close to Appointment',
          script: 'I hear you. My only ask is this — would it make sense for me to pop by for 15 minutes, just to see the property and give you a realistic number? That way when you ARE ready, you won\'t be starting from scratch. No pressure, no listing agreement — just information.',
          why: 'Moves toward a face-to-face meeting which dramatically increases conversion.',
        },
      ],
    },
    trust_deficit: {
      diagnosis: 'They\'ve been burned or they don\'t differentiate between agents. You need proof, not promises.',
      options: [
        {
          label: 'Proof Over Claims',
          script: 'I completely understand that skepticism — honestly, if I were you, I\'d feel the same way. Rather than tell you we\'re different, what if I showed you? I can send you our actual track record — average sale price vs. list price, days on market, client reviews. Real numbers, not marketing fluff.',
          why: 'Acknowledges their skepticism and offers evidence instead of more claims.',
        },
        {
          label: 'Risk Reversal',
          script: 'That\'s fair. Here\'s what I can offer: a no-obligation, no-strings market analysis. If after seeing it you think I\'m just another agent, you never have to hear from me again. But if the numbers surprise you — and they might — you\'ll be glad you took the call.',
          why: 'Removes all risk from the prospect\'s side. Makes saying yes easy.',
        },
        {
          label: 'Social Proof',
          script: 'I respect that. You know what convinced most of my clients to work with us? Not anything I said — it was talking to our past clients. I can connect you with homeowners in your neighborhood who we\'ve helped. Would hearing from someone in your shoes be helpful?',
          why: 'Third-party validation is more powerful than self-promotion.',
        },
      ],
    },
    price_resistance: {
      diagnosis: 'Commission objection = they don\'t see the value yet. The play is to reframe cost as investment.',
      options: [
        {
          label: 'Net Proceeds Reframe',
          script: 'That\'s a smart question and I\'m glad you brought it up. Here\'s the math: agent-listed homes in San Diego sell for an average of 15-20% more than FSBO. On your home, that difference likely covers our fee several times over. What if I ran the actual numbers for your property so you can see the comparison?',
          why: 'Shifts the conversation from cost to net outcome. Data beats emotion.',
        },
        {
          label: 'Marketing Value Breakdown',
          script: 'I understand wanting to keep costs down — that\'s good business sense. Here\'s what our fee covers: $30,000 a month in marketing, professional photography, staging consultation, a dedicated listing specialist, and access to our network of qualified buyers. What would it cost you to replicate that on your own?',
          why: 'Makes the fee tangible by showing what it buys.',
        },
        {
          label: 'Competitive Pricing',
          script: 'I appreciate you being upfront about that. Let me ask you this — if I could show you, with real numbers from your neighborhood, that working with us would put MORE money in your pocket even after commission, would that be worth a 15-minute conversation?',
          why: 'Conditional close — gets agreement to meet IF you prove the value.',
        },
      ],
    },
    competitor_mention: {
      diagnosis: 'They have alternatives. Don\'t trash the competition — differentiate on specifics.',
      options: [
        {
          label: 'Differentiate on Service',
          script: 'I think it\'s smart that you\'re comparing options — that\'s exactly what a savvy homeowner should do. What I\'d ask is this: when you compare, look at the actual marketing plan, the team behind it, and the track record in your specific neighborhood. We\'ve been doing this in San Diego for 37 years. Want me to send over our approach side by side?',
          why: 'Encourages comparison without being defensive. Confidence sells.',
        },
        {
          label: 'Ask What Matters Most',
          script: 'That\'s great that you\'re doing your homework. What matters most to you in choosing an agent — is it the price, the marketing, or having someone who really knows your neighborhood? I want to make sure I\'m focused on what\'s important to you.',
          why: 'Discovery question that lets you tailor your pitch to their priorities.',
        },
      ],
    },
    emotional_resistance: {
      diagnosis: 'This is personal, not logical. Lead with empathy before any business talk.',
      options: [
        {
          label: 'Empathy First',
          script: 'I can hear how much your home means to you, and honestly, that\'s something I respect. The best homeowners are the ones who truly love where they live. I\'m absolutely not here to push you to do anything. Would it be okay if I just stayed in touch? Markets change, and when or if you\'re ever curious, I\'ll be here as a resource.',
          why: 'Pure relationship building. No ask, no pressure. Creates long-term trust.',
        },
        {
          label: 'Legacy Framing',
          script: 'That completely makes sense — a home isn\'t just a building, it\'s where life happened. When homeowners do eventually decide to sell, the ones who get the best outcome are the ones who planned ahead. What if I sent you an annual equity update? Just so you always know where you stand. No commitment at all.',
          why: 'Respects the emotion while planting a practical seed.',
        },
      ],
    },
    authority_gap: {
      diagnosis: 'They can\'t decide alone. The goal is to get in front of BOTH decision-makers.',
      options: [
        {
          label: 'Include the Partner',
          script: 'Absolutely — this is definitely a decision you should make together. What if I put together a quick market report and you can review it together? And if you both have questions, I\'d be happy to jump on a quick call with both of you. When would work best for you two?',
          why: 'Positions the next step as including the partner, not going around them.',
        },
        {
          label: 'Send the Info',
          script: 'That makes total sense. Here\'s what I\'d suggest: let me email you a home valuation and some market data for your area. That way you can go over it together on your own time. No pressure at all. What\'s the best email for you?',
          why: 'Gets contact info and gives them something tangible to discuss together.',
        },
      ],
    },
    information_seeking: {
      diagnosis: 'Positive signal — they\'re engaged and asking questions. Answer clearly and move to next step.',
      options: [
        {
          label: 'Answer + Next Step',
          script: 'Great question. The short answer is [address their specific question]. But honestly, every home is different and I\'d love to give you a more specific answer for your situation. The best way to do that is a quick 15-minute walkthrough. Would [day] or [day] work better for you?',
          why: 'Questions = interest. Answer briefly, then convert to a meeting.',
        },
        {
          label: 'Educate + Build Trust',
          script: 'I\'m glad you asked that. With 37 years in San Diego real estate, here\'s what I can tell you: [address question]. What other questions do you have? I\'d rather you have all the information you need to make a confident decision.',
          why: 'Positions you as an educator/advisor. Ask for more questions to deepen engagement.',
        },
      ],
    },
    past_negative: {
      diagnosis: 'They were let down before. Acknowledge it, don\'t dismiss it. Show how you\'re specifically different.',
      options: [
        {
          label: 'Acknowledge + Diagnose',
          script: 'That sounds really frustrating, and I\'m sorry you went through that. I\'m not going to badmouth your previous agent, but I can tell you there are really only three reasons a home doesn\'t sell: price, condition, or marketing. Our team invests $30,000 a month in marketing and we have a dedicated listing specialist. Would you be open to hearing what we\'d do differently?',
          why: 'Validates their experience, then provides a framework that implies a fixable problem.',
        },
        {
          label: 'Results Guarantee',
          script: 'I hear you — that\'s a terrible experience and you have every right to be cautious. Here\'s what I can promise: before you sign anything, I\'ll show you exactly what went wrong, what we\'d do differently, and what you can realistically expect. If you\'re not convinced, no hard feelings. Fair enough?',
          why: 'Removes risk by offering transparency before commitment.',
        },
      ],
    },
    financial_stress: {
      diagnosis: 'Sensitive situation. Lead with genuine help, not sales. This is about their wellbeing first.',
      options: [
        {
          label: 'Compassion + Options',
          script: 'I appreciate you sharing that with me, and I want you to know I\'m reaching out to help, not to pressure you. The good news is San Diego property values have gone up significantly — you likely have more equity than you think. Would it help to have a confidential conversation about your options? Sometimes just knowing the numbers takes a lot of the stress away.',
          why: 'Empathy first. The equity revelation is genuinely helpful and creates hope.',
        },
        {
          label: 'Urgency Without Pressure',
          script: 'I completely understand, and I\'ve helped several families in similar situations in San Diego County. The most important thing is that you have options — and the sooner you know what they are, the more options you\'ll have. Can I put together a confidential property valuation? Everything stays between us.',
          why: 'Creates productive urgency while maintaining trust and confidentiality.',
        },
      ],
    },
    diy_preference: {
      diagnosis: 'They value independence. Don\'t fight it — offer yourself as a backup resource.',
      options: [
        {
          label: 'Respect + Data',
          script: 'I respect that 100% — you clearly know your property well. Here\'s what I\'d suggest: let me send you a free comparative market analysis showing what similar homes actually closed for — not listed for, but sold for. That way you\'re pricing from day one with real data. And if you ever want a second opinion, you\'ll have my number.',
          why: 'Respects their autonomy while providing genuinely useful data they\'ll appreciate.',
        },
        {
          label: 'Plant the Seed',
          script: 'That makes sense, and a lot of FSBO sellers in San Diego feel the same way. Here\'s a quick stat though: NAR data shows agent-listed homes sell for significantly more on average, even after commission. Give it a shot on your own — I\'m rooting for you. But if you hit a wall or want to compare notes, I\'m here.',
          why: 'Non-threatening, supportive. Plants the seed that they may need you later.',
        },
      ],
    },
  };

  // Default response when no specific signal is detected
  var DEFAULT_RESPONSE = {
    diagnosis: 'No specific objection pattern detected. Stay curious, ask questions, and guide toward a next step.',
    options: [
      {
        label: 'Discovery Question',
        script: 'That\'s really helpful to hear. Let me ask you — if everything aligned perfectly, what would need to be true for you to consider selling in the next 6-12 months?',
        why: 'Open-ended discovery question that reveals their real motivations and timeline.',
      },
      {
        label: 'Value Offer',
        script: 'I appreciate you taking the time to talk. What if I put together a complimentary home valuation for your property? Real data, real comparables, and absolutely no obligation. Would that be useful?',
        why: 'Low-commitment offer that provides genuine value and keeps the relationship alive.',
      },
      {
        label: 'Appointment Push',
        script: 'Here\'s what I\'d suggest: let me stop by for just 15 minutes. I\'ll bring a market report for your neighborhood and give you an honest assessment. No listing agreement, no pressure — just information so you can make the best decision. Would tomorrow or the day after work better?',
        why: 'Direct close to a face-to-face meeting with a time constraint to reduce perceived commitment.',
      },
    ],
  };

  // ==================== PUBLIC API ====================
  function diagnose(text) {
    if (!text || text.trim().length < 5) return null;

    var lower = text.toLowerCase();

    // Detect signal
    var detectedSignal = null;
    for (var i = 0; i < SIGNALS.length; i++) {
      for (var j = 0; j < SIGNALS[i].patterns.length; j++) {
        if (SIGNALS[i].patterns[j].test(lower)) {
          detectedSignal = SIGNALS[i];
          break;
        }
      }
      if (detectedSignal) break;
    }

    // Check for battle card
    var battleCard = null;
    for (var k = 0; k < BATTLE_CARDS.length; k++) {
      if (BATTLE_CARDS[k].trigger.test(lower)) {
        battleCard = BATTLE_CARDS[k];
        break;
      }
    }

    // Get response options
    var responseData = detectedSignal
      ? (RESPONSE_OPTIONS[detectedSignal.id] || DEFAULT_RESPONSE)
      : DEFAULT_RESPONSE;

    return {
      signal: detectedSignal ? {
        id: detectedSignal.id,
        label: detectedSignal.label,
        icon: detectedSignal.icon,
      } : null,
      diagnosis: responseData.diagnosis,
      options: responseData.options,
      battleCard: battleCard ? {
        competitor: battleCard.competitor,
        angles: battleCard.angles,
      } : null,
      prospectText: text,
    };
  }

  function getOpeningScript(leadType) {
    if (typeof OPENING_SCRIPTS === 'undefined') return null;
    return OPENING_SCRIPTS[leadType] || OPENING_SCRIPTS[''] || null;
  }

  function getCloseScript(index) {
    if (typeof CLOSE_SCRIPTS === 'undefined') return null;
    var idx = index || 0;
    return CLOSE_SCRIPTS[Math.min(idx, CLOSE_SCRIPTS.length - 1)] || null;
  }

  // Detect if prospect is warming up / showing buying signals
  // Patterns must be specific phrases — bare words like "maybe", "fine", "okay"
  // appear in objections and cause false positives.
  function detectBuyingSignal(text) {
    if (!text) return false;
    var lower = text.toLowerCase();
    var buyingPatterns = [
      /what would that look like|how would that work|tell me more about/i,
      /when (would|could|can) you (come|stop|swing|drop|visit)|what's your (schedule|availability)/i,
      /send me (the|your|that|a) (info|report|data|analysis|valuation|details)/i,
      /email me (the|your|that)|give me your (card|number|info|email)/i,
      /let's do it|let's set (it|that) up|go ahead and|sounds (good|great|like a plan)/i,
      /i'm (in|interested|down for)|why not|couldn't hurt|might as well/i,
      /worth a (shot|try|look)|i suppose (we|i) could/i,
      /yeah,? (let's|go ahead|set|send|come)|ok(ay)?,? (let's|go ahead|set|send|come)/i,
    ];
    return buyingPatterns.some(function (p) { return p.test(lower); });
  }

  return {
    diagnose: diagnose,
    getOpeningScript: getOpeningScript,
    getCloseScript: getCloseScript,
    detectBuyingSignal: detectBuyingSignal,
  };
})();
