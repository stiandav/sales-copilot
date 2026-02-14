// ========== AI Prospect — Simulated cold call conversation partner ==========
// Runs 100% in the browser. No server, no API keys.
// The prospect responds with realistic objections based on lead type and difficulty.

class ProspectAI {
  constructor(leadType, difficulty) {
    this.leadType = leadType || 'expired';
    this.difficulty = difficulty || 'medium'; // easy, medium, hard
    this.turnIndex = 0;
    this.maxTurns = difficulty === 'easy' ? 4 : difficulty === 'hard' ? 8 : 6;
    this.appointmentSet = false;
    this.hungUp = false;
    this.flow = this._buildFlow();
    this.prospectName = this._pickName();
  }

  // Get the opening line the prospect says when they pick up the phone
  getGreeting() {
    var greetings = PROSPECT_GREETINGS[this.leadType] || PROSPECT_GREETINGS.expired;
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Process what the agent said and return the prospect's next response
  respond(agentText) {
    if (this.hungUp || this.appointmentSet) return null;

    var lower = agentText.toLowerCase();
    this.turnIndex++;

    // Check if agent successfully closed
    if (this._detectClose(lower) && this.turnIndex >= 3) {
      if (this.difficulty === 'easy' || (this.difficulty === 'medium' && this.turnIndex >= 4) || this.turnIndex >= 6) {
        this.appointmentSet = true;
        return this._pickRandom(PROSPECT_CLOSES.agree);
      }
    }

    // Check if agent was rude or pushy
    if (this._detectPushy(lower)) {
      if (this.difficulty === 'hard' || Math.random() < 0.3) {
        this.hungUp = true;
        return this._pickRandom(PROSPECT_CLOSES.hangup);
      }
    }

    // Deliver next objection from the flow
    if (this.turnIndex >= this.maxTurns) {
      // Prospect runs out of patience
      if (this._detectClose(lower)) {
        this.appointmentSet = true;
        return this._pickRandom(PROSPECT_CLOSES.agree);
      }
      this.hungUp = true;
      return this._pickRandom(PROSPECT_CLOSES.end);
    }

    // Pick contextual response based on what agent said
    var contextual = this._getContextualResponse(lower);
    if (contextual) return contextual;

    // Fall back to flow-based objection
    var flowIdx = Math.min(this.turnIndex - 1, this.flow.length - 1);
    return this.flow[flowIdx];
  }

  getCallSummary() {
    return {
      result: this.appointmentSet ? 'appointment' : (this.hungUp ? 'hung_up' : 'ended'),
      turns: this.turnIndex,
      leadType: this.leadType,
      difficulty: this.difficulty,
      prospectName: this.prospectName,
    };
  }

  _detectClose(lower) {
    var closeKeywords = [
      'appointment', 'meet', 'come by', 'stop by', 'schedule',
      'what time', 'tomorrow', 'this week', 'when works',
      'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
      'morning', 'afternoon', 'evening', 'pm', 'am',
      'would that work', 'does that work', 'sound good',
      'can i come', 'quick visit', 'pop by', 'swing by',
      'fifteen minutes', '15 minutes', 'no obligation',
    ];
    return closeKeywords.some(function(k) { return lower.includes(k); });
  }

  _detectPushy(lower) {
    var pushyKeywords = [
      'you have to', 'you need to', 'you\'re making a mistake',
      'that\'s stupid', 'you\'re wrong', 'listen to me',
      'just shut', 'sign this', 'sign now', 'you must',
    ];
    return pushyKeywords.some(function(k) { return lower.includes(k); });
  }

  _getContextualResponse(lower) {
    // If agent mentions value/market analysis/free report
    if (/market analysis|home value|what your home|free report|no cost|complimentary/.test(lower)) {
      return this._pickRandom([
        "I mean, I guess that wouldn't hurt... but I'm not committing to anything.",
        "We actually already checked Zillow, we have a pretty good idea of what it's worth.",
        "I don't want to end up on some call list if I say yes to that.",
        "Okay, what would that involve? I don't want someone coming over and pressuring us.",
      ]);
    }

    // If agent mentions team experience / marketing budget
    if (/37 years|thirty.?seven|30.?000|thirty thousand|marketing/.test(lower)) {
      return this._pickRandom([
        "That's impressive, but every agent says they're the best. What makes you different?",
        "Okay, so you spend a lot on marketing. What does that actually mean for my home?",
        "I appreciate that, but we're still not sure we want to sell right now.",
      ]);
    }

    // If agent asks a question back
    if (/\?/.test(lower) && lower.length > 30) {
      return this._pickRandom([
        "I don't know... I'd have to talk to my spouse about it.",
        "I mean, maybe? I just don't want to waste anyone's time.",
        "That's a fair question. I guess I'm just nervous about the whole process.",
        "I suppose it couldn't hurt to hear what you have to say.",
      ]);
    }

    return null;
  }

  _buildFlow() {
    var flows = PROSPECT_FLOWS[this.leadType] || PROSPECT_FLOWS.expired;
    var diffFlows = flows[this.difficulty] || flows.medium;
    // Shuffle slightly for variety
    var result = diffFlows.slice();
    for (var i = result.length - 1; i > 0; i--) {
      if (Math.random() < 0.3) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = result[i];
        result[i] = result[j];
        result[j] = temp;
      }
    }
    return result;
  }

  _pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  _pickName() {
    var names = [
      'Margaret', 'Robert', 'Linda', 'James', 'Patricia', 'Michael',
      'Barbara', 'William', 'Susan', 'David', 'Karen', 'Richard',
      'Nancy', 'Thomas', 'Betty', 'Daniel', 'Sandra', 'Paul',
      'Dorothy', 'George', 'Carol', 'Dennis', 'Maria', 'Frank',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }
}

// ==================== PROSPECT GREETINGS ====================
var PROSPECT_GREETINGS = {
  expired: [
    "Hello?",
    "Yeah, hello?",
    "Hi, who's this?",
    "Hello, who am I speaking with?",
    "Yes?",
  ],
  fsbo: [
    "Hello?",
    "Hi, is this about the house?",
    "Yeah, who's calling?",
    "Hello, what can I do for you?",
    "Yes, hello?",
  ],
  frbo: [
    "Hello?",
    "Hi, are you calling about the rental?",
    "Yeah?",
    "Hello, who is this?",
    "Yes, how can I help you?",
  ],
  'pre-foreclosure': [
    "Hello?",
    "Yeah, who's this?",
    "Hi... what's this about?",
    "Hello?",
    "Yes?",
  ],
};

// ==================== CONVERSATION FLOWS BY LEAD TYPE + DIFFICULTY ====================
var PROSPECT_FLOWS = {
  expired: {
    easy: [
      "Well, yeah, we tried listing it before but it didn't sell. Pretty frustrating honestly.",
      "I don't know, we kind of gave up on the idea. The whole thing was just stressful.",
      "I guess it couldn't hurt to know what it's worth now. What would that look like?",
      "Okay, I suppose we could do that. When were you thinking?",
    ],
    medium: [
      "Look, we already tried selling it and it sat on the market for six months. No offers.",
      "Yeah, and our last agent didn't do much of anything. Just put it on MLS and waited.",
      "I'm not really interested in going through all that again. It was a waste of time.",
      "I hear what you're saying, but how do I know it'll be any different this time?",
      "My wife and I talked about it and we're just not sure it's worth the hassle.",
      "Well... I guess if it's just a conversation, that might be okay. No pressure though.",
    ],
    hard: [
      "Oh great, another real estate agent calling me. You're the third one this week.",
      "Our listing expired because the market stinks, not because of anything my agent did or didn't do.",
      "I'm not interested in listing again. We've already decided to wait.",
      "Look, I've heard all the pitches before. You're going to tell me you're different, right?",
      "My neighbor listed with a 'top agent' and had to do two price reductions. No thanks.",
      "I don't care about your marketing budget. I care about results and I haven't seen any.",
      "You know what, let me think about it. And by that I mean probably not.",
      "Fine. You've got fifteen minutes. But if this is just a sales pitch, I'm done.",
    ],
  },
  fsbo: {
    easy: [
      "Well, we figured we'd try selling it ourselves first to save on the commission.",
      "I put it on Zillow and we've had a few showings but no serious offers yet.",
      "How much do you guys typically charge? That's really the main thing holding us back.",
      "Hmm, I guess it would help to at least know what an agent could do differently.",
    ],
    medium: [
      "We're selling it ourselves. We don't want to pay six percent to an agent.",
      "We've already got it listed on Zillow and Facebook marketplace. Getting plenty of views.",
      "I just don't see why I'd pay someone thousands of dollars to do what I can do myself.",
      "We've had a few people come look at it. I think we just need to be patient.",
      "My cousin sold his house by owner last year and saved like fifteen thousand dollars.",
      "I mean, if you could show me the numbers, maybe. But I'm pretty set on doing this ourselves.",
    ],
    hard: [
      "Why would I pay you six percent when I can sell it myself? That's like forty thousand dollars.",
      "I've done my research. I know what comparable homes are selling for. I don't need an agent for that.",
      "Every agent who calls me says the same thing. 'I can get you more money.' Prove it.",
      "We've already had an open house and got two offers. We're just negotiating right now.",
      "I used to work in sales. I know all the closing techniques. Don't try to sell me.",
      "Look, I appreciate the call but we've got this handled. Please take us off your list.",
      "I'm not paying commission. Period. If you can do it for one percent, maybe we talk.",
      "No. We're doing this ourselves. Thanks but no thanks.",
    ],
  },
  frbo: {
    easy: [
      "Oh, we're just renting it out for now. Not really thinking about selling.",
      "Being a landlord is more work than I expected honestly. The tenants are a handful.",
      "I mean, I've thought about selling but I don't know what the property is worth now.",
      "If you could tell me what it's worth, that might be interesting. No commitment though.",
    ],
    medium: [
      "We're renting it out. It's an investment property and we're not looking to sell.",
      "The rental income is decent but the maintenance costs are killing me lately.",
      "I've thought about selling but then what? I'd have to pay capital gains taxes on everything.",
      "My property manager handles most of it but yeah, it's been more headaches than I expected.",
      "I'm not sure this is the right time to sell. The rental market is pretty strong right now.",
      "Well, if you could show me what my options are, I guess that might be worth hearing.",
    ],
    hard: [
      "I'm not selling my rental property. It's passive income and I'm building wealth.",
      "I have a property manager. Everything is handled. I don't need to sell.",
      "Do you know what my cash flow is on this property? I'm not giving that up.",
      "Sell and do what? Put the money in the stock market? No thanks.",
      "I've been a landlord for twenty years. I think I know what I'm doing.",
      "You agents always want people to sell. That's how you make money. I make money by holding.",
      "Unless you're bringing me an all-cash buyer at full price, don't waste my time.",
      "I'll sell when I'm ready. And I'm not ready.",
    ],
  },
  'pre-foreclosure': {
    easy: [
      "Yeah... we've been having some trouble keeping up with the mortgage payments.",
      "It's been a rough year. I lost my job and we got behind on everything.",
      "I don't even know what our options are at this point. It all feels overwhelming.",
      "If you could help us figure out what to do, that would actually be really nice.",
    ],
    medium: [
      "Look, I know why you're calling. We got behind on payments. It's... it's been hard.",
      "We've been trying to work something out with the bank but they're not being very helpful.",
      "I don't want to sell our home. This is where my kids grew up.",
      "How do I even know you can help? And how much is this going to cost me?",
      "My brother-in-law says we should just file for bankruptcy. Is that better than selling?",
      "I guess I should at least know what the house is worth before things get worse.",
    ],
    hard: [
      "I don't know how you got my number and I don't appreciate people calling about this.",
      "This is a private matter between us and our bank. It's none of your business.",
      "We're not in foreclosure. We're just a little behind. We'll catch up.",
      "Every time I answer the phone it's someone trying to buy my house for pennies on the dollar.",
      "Are you one of those investors trying to lowball me? Because I'm not interested.",
      "We've already talked to a lawyer. We have options. We don't need a realtor.",
      "Look, this is really stressful and I don't need more people pressuring me.",
      "I'll deal with this on my own terms. Please don't call again.",
    ],
  },
};

// ==================== CLOSING RESPONSES ====================
var PROSPECT_CLOSES = {
  agree: [
    "Okay, you know what, fine. Let's set something up. When were you thinking?",
    "Alright, I'll give you fifteen minutes. When can you come by?",
    "I suppose it can't hurt to hear what you have to say. What does your schedule look like?",
    "Okay, let's do it. But if I feel pressured at all, I'm ending the conversation.",
    "My spouse will want to be there too. Can you do an evening appointment?",
    "Fine. But I'm holding you to the no-pressure thing. When works for you?",
  ],
  hangup: [
    "You know what, I'm done with this conversation. Don't call me again.",
    "I've heard enough. Take me off your list. Goodbye.",
    "This is exactly why people don't trust realtors. I'm hanging up now.",
  ],
  end: [
    "Look, I appreciate the call but I really need to go. Maybe another time.",
    "I've got to run. Send me your information and I'll think about it.",
    "Okay, I'll keep your number. But don't expect me to call back anytime soon.",
    "I need to talk to my spouse first. I'll call you if we're interested.",
  ],
};
