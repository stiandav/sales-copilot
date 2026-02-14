// All objection scripts and patterns — runs entirely in the browser, no server needed
const SCRIPTS_DB = [
  {
    id: "not-interested-generic",
    category: "NOT_INTERESTED",
    variant: "generic",
    label: "Not Interested",
    priority: 1,
    patterns: [
      "not interested", "no thanks", "no thank you", "don't want", "not looking",
      "not for me", "pass on that", "i'll pass", "no need", "we're good",
      "we're fine", "not for us"
    ],
    script: "I totally get that \u2014 and honestly, most homeowners I call in San Diego feel the same way at first. I'm not calling to pressure you into anything. I actually specialize in your area and I've been tracking your neighborhood closely. Would it be fair if I just shared what your home could realistically sell for in today's market? If the number doesn't excite you, I promise I won't call again."
  },
  {
    id: "not-interested-firm",
    category: "NOT_INTERESTED",
    variant: "firm",
    label: "Not Interested (Firm)",
    priority: 2,
    patterns: [
      "absolutely not", "definitely not interested", "not interested at all",
      "please don't call", "not now not ever", "hell no", "no way"
    ],
    script: "I hear you and I respect that completely. Before I go \u2014 I'm the neighborhood specialist for your area and I put together a complimentary home valuation report. There's absolutely no strings attached and no follow-up unless you want it. Can I email that over? You'll have my number if anything ever changes."
  },
  {
    id: "expired-frustration",
    category: "NOT_INTERESTED",
    variant: "expired",
    label: "Expired Listing Frustration",
    priority: 3,
    leadTypes: ["expired"],
    patterns: [
      "already tried", "didn't sell", "listing expired", "was on the market",
      "took it off", "agent couldn't sell", "waste of time", "tried that already",
      "been through this", "sat on the market", "no offers", "bad experience"
    ],
    script: "I completely understand your frustration \u2014 having your home sit on the market with no results is one of the worst experiences. And I'm not going to sit here and badmouth your previous agent. But here's what I can tell you: there are really only three reasons a home doesn't sell \u2014 price, condition, or marketing. Our team invests over $30,000 a month in marketing alone, and we have a dedicated listing specialist who manages every detail. What if we did a quick analysis to show you exactly what went wrong last time and what we'd do differently? No commitment \u2014 just information."
  },
  {
    id: "already-have-agent",
    category: "ALREADY_HAVE_AGENT",
    label: "Already Has Agent",
    priority: 1,
    patterns: [
      "already have an agent", "already working with", "have a realtor",
      "got an agent", "my agent", "already listed", "using someone",
      "friend is an agent", "family member is", "sister is a realtor",
      "brother is a realtor", "know someone in real estate",
      "neighbor is an agent", "have someone"
    ],
    script: "That's great you have someone you trust \u2014 that's actually smart. Quick question though: are you under a signed listing agreement right now, or is it more of a casual relationship? I only ask because a lot of homeowners in San Diego have found that getting a second pricing opinion actually helped them and their agent get a better result. Our team spends over $30,000 a month in marketing and we have a dedicated listing specialist \u2014 sometimes a fresh set of eyes on the pricing strategy makes a real difference."
  },
  {
    id: "bad-timing",
    category: "BAD_TIMING",
    label: "Bad Timing",
    priority: 1,
    patterns: [
      "bad time", "not a good time", "call back later", "busy right now",
      "in a meeting", "at work", "driving", "in the middle of",
      "can't talk", "call me back", "another time", "maybe later",
      "eating dinner", "with my family"
    ],
    script: "I totally get it, I caught you at a bad moment. I'll keep it to literally 10 seconds: I'm a local real estate specialist and homes in your San Diego neighborhood are selling for more than most owners expect right now. Can I call you back tomorrow? What time works best \u2014 mornings or evenings?"
  },
  {
    id: "not-selling-general",
    category: "NOT_SELLING",
    variant: "general",
    label: "Not Selling",
    priority: 1,
    patterns: [
      "not selling", "not planning to sell", "happy where we are",
      "love our home", "not moving", "staying put", "no plans to move",
      "we're staying", "not going anywhere", "like our neighborhood",
      "love this area"
    ],
    script: "That makes total sense \u2014 most people I talk to aren't looking to sell right now. The only reason I'm reaching out is that San Diego inventory is extremely low and buyer demand in your neighborhood has pushed values up significantly. Would you be open to just knowing what your home is worth? No commitment, no pressure. A lot of homeowners use it for financial planning, refinancing, or even challenging their property tax assessment."
  },
  {
    id: "not-selling-just-bought",
    category: "NOT_SELLING",
    variant: "just_bought",
    label: "Just Bought",
    priority: 2,
    patterns: [
      "just bought", "just moved in", "just closed", "just signed",
      "just purchased", "just got this house", "just settled",
      "recently moved", "new homeowner"
    ],
    script: "Congratulations on the new place! I'm not calling to get you to sell \u2014 I actually reach out to new homeowners in the area to introduce myself as the neighborhood specialist. I track all the sales in your area and I'd love to just be a resource for you. Can I send you a quick annual equity update? It's free and it's great for tracking your investment. And if you ever need a contractor recommendation or anything local, I'm your guy."
  },
  {
    id: "price-concern",
    category: "PRICE_CONCERN",
    label: "Price / Market Concern",
    priority: 1,
    patterns: [
      "market is down", "prices are dropping", "not worth it",
      "won't get enough", "not the right market", "waiting for prices",
      "market crash", "housing bubble", "market is bad",
      "interest rates", "rates are too high", "values are dropping",
      "prices going down"
    ],
    script: "That's a really smart thing to be thinking about. Here's what's actually happening in San Diego County right now \u2014 despite what the national headlines say, our local market is different. Inventory is still tight and well-priced homes are still moving fast, many with multiple offers. What if I put together a custom market analysis for your home specifically? Real numbers, not Zillow estimates. That way you can make a decision based on facts, not headlines. Would that be helpful?"
  },
  {
    id: "do-not-call",
    category: "DO_NOT_CALL",
    label: "Do Not Call",
    priority: 1,
    patterns: [
      "do not call", "take me off", "remove my number", "don't call again",
      "stop calling", "how did you get my number", "on the do not call list",
      "reporting you", "this is harassment", "calling the police",
      "suing you", "illegal"
    ],
    script: "I sincerely apologize for the inconvenience. I'm removing your number from our list right now \u2014 you won't receive any more calls from us. I hope you have a great rest of your day."
  },
  {
    id: "commission-objection",
    category: "COMMISSION_OBJECTION",
    label: "Commission Concern",
    priority: 1,
    leadTypes: ["fsbo"],
    patterns: [
      "commission", "fees are too high", "too much commission",
      "percentage", "six percent", "five percent", "how much do you charge",
      "too expensive to list", "save money by selling",
      "not paying an agent", "agent fees", "why would i pay"
    ],
    script: "I totally understand wanting to save on commission \u2014 that's smart business thinking. Here's something I share with a lot of FSBO sellers in San Diego: on average, agent-listed homes sell for significantly more than FSBO homes, even after commission. Our team spends $30,000 a month on marketing to get your home in front of qualified buyers \u2014 that's exposure you can't replicate on Zillow alone. What if I showed you, with real numbers from your neighborhood, how listing with us could actually net you more money even after our fee? No pressure \u2014 just the math."
  },
  {
    id: "want-to-try-myself",
    category: "WANT_TO_TRY_MYSELF",
    label: "Wants to Sell Solo",
    priority: 1,
    leadTypes: ["fsbo"],
    patterns: [
      "do it myself", "try it myself", "sell it myself",
      "don't need an agent", "list it myself", "sell it on my own",
      "going to try", "handle it ourselves", "we can do it",
      "for sale by owner", "fsbo"
    ],
    script: "I respect that 100% \u2014 you clearly know your home better than anyone. Here's what I'd suggest: give it a shot, and I'll be a resource for you either way. In the meantime, I can send you a free market analysis showing what comparable homes in your San Diego neighborhood actually sold for \u2014 not just what they listed for. That way you're pricing it right from day one. And if you decide you want help down the road, you'll already have my number."
  },
  {
    id: "tenant-issues",
    category: "TENANT_ISSUES",
    label: "Tenant / Landlord Issues",
    priority: 1,
    leadTypes: ["frbo"],
    patterns: [
      "dealing with tenants", "bad tenants", "tenant problems",
      "tired of being a landlord", "don't want to be a landlord",
      "property management", "renting it out", "renters",
      "tenant won't leave", "tenant not paying", "rental headache",
      "landlord"
    ],
    script: "I hear you \u2014 being a landlord in San Diego isn't getting any easier with the new tenant protection laws and rising maintenance costs. A lot of rental property owners I work with have been surprised to learn just how much their property has appreciated. Have you thought about what you could do with that equity? Whether it's a 1031 exchange into something more passive or just cashing out at the top, I can show you the numbers. Would a free property valuation be useful?"
  },
  {
    id: "financial-distress",
    category: "FINANCIAL_DISTRESS",
    label: "Financial Hardship",
    priority: 1,
    leadTypes: ["pre-foreclosure"],
    patterns: [
      "behind on payments", "foreclosure", "can't afford the mortgage",
      "underwater", "owe more than", "struggling to pay",
      "late on mortgage", "bank is threatening", "notice of default",
      "can't make payments", "falling behind", "financial trouble",
      "need to sell fast"
    ],
    script: "I appreciate you taking my call, and I want you to know I'm reaching out to help, not to pressure you. I specialize in helping San Diego homeowners explore their options before things get more complicated. The good news is that San Diego property values have risen significantly \u2014 most homeowners in your situation actually have a lot more equity than they realize. Sometimes selling and walking away with cash in hand is the best path. Sometimes there are other options. Would it help to have a confidential conversation about what your home is worth and what options are available? Everything stays between us."
  }
];

// Preset practice scenarios by lead type
const SCENARIOS = {
  "": [
    { text: "We're not interested in selling right now", label: "Not Interested" },
    { text: "We already have an agent we're working with", label: "Has Agent" },
    { text: "This is really not a good time for me right now", label: "Bad Timing" },
    { text: "We love our home and we're not planning to move", label: "Not Selling" },
    { text: "I think the market is down right now, prices are dropping", label: "Market Concern" },
    { text: "Please take me off your list, don't call again", label: "Do Not Call" },
  ],
  expired: [
    { text: "We already tried selling and it sat on the market for months", label: "Tried Before" },
    { text: "Our last agent couldn't sell it, I doubt you can either", label: "Agent Failed" },
    { text: "We had a bad experience listing, not interested in doing that again", label: "Bad Experience" },
    { text: "It was on the market for 6 months with no offers, waste of time", label: "No Offers" },
    { text: "We're not interested in listing again, it didn't work last time", label: "Not Interested" },
    { text: "We already have someone we're thinking about using", label: "Has Agent" },
  ],
  fsbo: [
    { text: "We're going to try selling it ourselves to save on commission", label: "Sell Solo" },
    { text: "I don't want to pay an agent six percent commission", label: "Commission" },
    { text: "Why would I pay you when I can list on Zillow myself", label: "DIY" },
    { text: "We don't need an agent, we can handle it ourselves", label: "No Agent" },
    { text: "Not interested, we're doing for sale by owner", label: "FSBO" },
    { text: "The commission fees are too high, I'd rather save that money", label: "Fees" },
  ],
  frbo: [
    { text: "We're just renting it out, not looking to sell right now", label: "Just Renting" },
    { text: "I'm tired of dealing with tenants and property management issues", label: "Tenant Issues" },
    { text: "The rental headaches aren't worth it anymore honestly", label: "Fed Up" },
    { text: "We're not looking to sell our rental property right now", label: "Not Selling" },
    { text: "We already have an agent for when we decide to sell", label: "Has Agent" },
    { text: "I don't think the market is good enough to sell right now", label: "Market Timing" },
  ],
  "pre-foreclosure": [
    { text: "We're behind on payments but we're trying to work it out with the bank", label: "Behind" },
    { text: "The bank is threatening foreclosure and we don't know what to do", label: "Foreclosure" },
    { text: "We can't afford the mortgage anymore, everything is tight", label: "Can't Afford" },
    { text: "We need to sell fast before things get worse with the bank", label: "Urgent" },
    { text: "We're not interested, please don't call about this", label: "Not Interested" },
    { text: "We're falling behind on payments and struggling to catch up", label: "Falling Behind" },
  ],
};

const CATEGORY_COLORS = {
  NOT_INTERESTED: { bg: "rgba(234,67,53,0.15)", text: "#f87171" },
  ALREADY_HAVE_AGENT: { bg: "rgba(249,171,0,0.15)", text: "#fbbf24" },
  BAD_TIMING: { bg: "rgba(77,158,246,0.15)", text: "#60a5fa" },
  NOT_SELLING: { bg: "rgba(168,85,247,0.15)", text: "#c084fc" },
  PRICE_CONCERN: { bg: "rgba(249,171,0,0.15)", text: "#fbbf24" },
  DO_NOT_CALL: { bg: "rgba(234,67,53,0.2)", text: "#f87171" },
  COMMISSION_OBJECTION: { bg: "rgba(249,115,22,0.15)", text: "#fb923c" },
  WANT_TO_TRY_MYSELF: { bg: "rgba(249,115,22,0.15)", text: "#fb923c" },
  TENANT_ISSUES: { bg: "rgba(52,168,83,0.15)", text: "#4ade80" },
  FINANCIAL_DISTRESS: { bg: "rgba(234,67,53,0.15)", text: "#f87171" },
  BRIDGE: { bg: "rgba(168,85,247,0.15)", text: "#c084fc" },
};

const LEAD_TYPE_LABELS = {
  "": "All Types",
  expired: "Expired Listing",
  fsbo: "FSBO",
  frbo: "FRBO (Landlord)",
  "pre-foreclosure": "Pre-Foreclosure",
};

// Opening scripts — what to say when the prospect picks up the phone
const OPENING_SCRIPTS = {
  "": {
    script: "Hi, is this ___? Hey ___, my name is ___ and I work with a real estate team here in San Diego County. The reason for my call — I've been tracking homes in your neighborhood and I noticed something I wanted to share with you. Do you have just two minutes?",
    followUp: "Great. So here's the thing — inventory in your area is really low right now, which means homes like yours are in high demand. Buyers are competing for properties. I put together a quick analysis on your home and I think you'd be surprised at what it could sell for. Would you be open to hearing those numbers?",
  },
  expired: {
    script: "Hi, is this ___? Hey ___, my name is ___ and I'm with a real estate team here in San Diego. I'm calling because I noticed your home was on the market and the listing has expired. I specialize in helping homeowners in your situation and I wanted to reach out. Are you still thinking about selling?",
    followUp: "I understand. Here's why I'm calling though — the market has shifted since your listing expired and homes in your neighborhood are actually selling faster now. Our team has a dedicated listing specialist and we invest over $30,000 a month in marketing. What if I could show you exactly what went wrong last time and a plan to get it sold this time? No commitment at all.",
  },
  fsbo: {
    script: "Hi, is this ___? Hey ___, my name is ___ with a real estate team here in San Diego. I saw that you're selling your home on your own and I respect that. I'm calling because I work with a lot of buyers in your area and I wanted to see if you'd be open to hearing what a partnership could look like?",
    followUp: "I totally get wanting to save on commission — that's smart. Here's what I can offer: our team spends $30,000 a month on marketing and we have access to every qualified buyer in the MLS. What if I showed you the numbers — what your home would likely sell for with us versus on your own? If the math doesn't make sense, I'll be the first to tell you to keep doing what you're doing.",
  },
  frbo: {
    script: "Hi, is this ___? Hey ___, my name is ___ with a real estate team here in San Diego. I noticed you have a rental property in the area and I wanted to reach out. With the way San Diego property values have gone up, a lot of landlords I talk to are surprised at how much equity they're sitting on. Is that something you've thought about?",
    followUp: "I hear that. A lot of landlords feel the same way. Here's what I've been seeing though — between rising maintenance costs, the new tenant protection laws, and property values near historic highs, many owners are finding they can take their equity and put it into something more passive. What if I ran the numbers for your property? Just so you know exactly where you stand.",
  },
  "pre-foreclosure": {
    script: "Hi, is this ___? Hey ___, my name is ___ with a real estate team here in San Diego. I'm reaching out because I help homeowners explore their options during challenging situations. This is a completely confidential call. I've helped several families in your area navigate this and come out in a much better position. Would you be open to a quick conversation?",
    followUp: "I completely understand, and I want you to know I'm not here to pressure you. The good news is San Diego property values have gone up significantly — you likely have more equity than you realize, which means you have options. What if I put together a confidential property valuation? Everything stays between us, and you'll have real numbers to work with.",
  },
};

// Close scripts — what to say to book the appointment
const CLOSE_SCRIPTS = [
  {
    label: "Soft Close",
    script: "What I'd love to do is stop by for just 15 minutes, take a quick look at the home, and share some real numbers with you. No listing agreement, no commitment — just information so you can make the best decision. Would tomorrow or the day after work better for you?",
  },
  {
    label: "Calendar Close",
    script: "Great, let me get something on the calendar. I've got availability this week — what works better for you, morning or afternoon? It'll be just 15 minutes, I promise.",
  },
  {
    label: "Confirm Appointment",
    script: "Perfect. So I've got you down for ___ at ___. I'll bring a custom market analysis for your home with real comparable sales. Just 15 minutes — no pressure, no listing agreement. You'll have all the info you need to make a confident decision. Sound good?",
  },
];

// Quick-tap categories for instant objection coaching during live calls — per lead type
const QUICK_TAPS = {
  "": [
    { label: "Not Interested", text: "We're not interested in selling right now" },
    { label: "Has Agent", text: "We already have an agent we're working with" },
    { label: "Bad Timing", text: "This isn't a good time, I'm busy right now" },
    { label: "Price / Fees", text: "I don't want to pay agent commission fees, too expensive" },
    { label: "DIY / FSBO", text: "We want to sell it ourselves, don't need an agent" },
    { label: "Zillow/Redfin", text: "We're just going to use Zillow or Redfin instead" },
    { label: "Need Spouse", text: "I need to talk to my wife or husband about this first" },
    { label: "Not Selling", text: "We love our home, we're not planning to move at all" },
    { label: "Bad Experience", text: "We had a bad experience with our last agent, it didn't sell" },
    { label: "Market Concern", text: "I think the market is down right now, prices are dropping" },
    { label: "Financial", text: "We're struggling with payments and things are tight right now" },
    { label: "Do Not Call", text: "Please take me off your list, don't call me again" },
  ],
  expired: [
    { label: "Tried Before", text: "We already tried selling and it sat on the market for months" },
    { label: "Agent Failed", text: "Our last agent couldn't sell it, I doubt you can either" },
    { label: "Bad Experience", text: "We had a bad experience listing, not doing that again" },
    { label: "No Offers", text: "It was on the market with no offers, total waste of time" },
    { label: "Not Relisting", text: "We're not interested in listing again, it didn't work" },
    { label: "Overpriced", text: "Agents always overpromise on price to get the listing" },
    { label: "Has Agent", text: "We're already talking to another agent about relisting" },
    { label: "Not Interested", text: "Not interested, we took it off the market on purpose" },
    { label: "Market Concern", text: "The market is worse now than when we listed before" },
    { label: "Need Spouse", text: "I need to talk to my spouse before we consider relisting" },
    { label: "Bad Timing", text: "This isn't a good time, maybe in the spring" },
    { label: "Do Not Call", text: "Please stop calling about our expired listing" },
  ],
  fsbo: [
    { label: "Commission", text: "I don't want to pay six percent commission to an agent" },
    { label: "Sell Myself", text: "We're going to try selling it ourselves to save money" },
    { label: "No Agent Needed", text: "We don't need an agent, we can handle this ourselves" },
    { label: "Zillow/Redfin", text: "We're just going to list it on Zillow ourselves" },
    { label: "Have Buyers", text: "We already have interested buyers looking at our home" },
    { label: "Fees Too High", text: "Agent fees are way too high, not worth it" },
    { label: "Open House OK", text: "Our open houses are going well, getting good traffic" },
    { label: "Friend Agent", text: "My friend is an agent, I'll use them if I need help" },
    { label: "Not Interested", text: "Not interested in hiring an agent right now" },
    { label: "Know the Area", text: "I know my neighborhood, I can price it myself" },
    { label: "Need Spouse", text: "I need to talk to my husband or wife about using an agent" },
    { label: "Do Not Call", text: "Please don't call me about listing with an agent" },
  ],
  frbo: [
    { label: "Just Renting", text: "We're just renting it out, not looking to sell" },
    { label: "Tenant Issues", text: "I'm tired of dealing with tenants and property management" },
    { label: "Good Investment", text: "It's a good investment property, I'm keeping it" },
    { label: "Rental Income", text: "The rental income is good, no reason to sell" },
    { label: "Not the Time", text: "It's not the right time to sell a rental property" },
    { label: "Has Agent", text: "I already have an agent for when I decide to sell" },
    { label: "1031 Exchange", text: "If I sell I'd need a 1031 exchange and that's complicated" },
    { label: "Tenant Lease", text: "My tenant has a lease, I can't sell right now" },
    { label: "Market Timing", text: "I don't think the market is good enough to sell rentals" },
    { label: "Need Spouse", text: "I need to discuss selling the rental with my spouse" },
    { label: "Not Interested", text: "Not interested in selling any of my properties right now" },
    { label: "Do Not Call", text: "Please don't call me about selling my rental" },
  ],
  "pre-foreclosure": [
    { label: "Working w/ Bank", text: "We're working it out with the bank, don't need help" },
    { label: "Not That Bad", text: "It's not that bad yet, we're catching up on payments" },
    { label: "Don't Want Sell", text: "We don't want to sell our home, we'll figure it out" },
    { label: "Embarrassed", text: "I don't really want to talk about our financial situation" },
    { label: "Have Attorney", text: "We already have an attorney helping us with this" },
    { label: "Short Sale", text: "We owe more than it's worth, a short sale won't help us" },
    { label: "Need Time", text: "We just need more time, things will get better" },
    { label: "Loan Mod", text: "We're applying for a loan modification with our lender" },
    { label: "Scam Concern", text: "How do I know this isn't a scam, people keep calling us" },
    { label: "Need Spouse", text: "I need to talk to my spouse before making any decisions" },
    { label: "Can't Afford", text: "We can't afford to move even if we sell the house" },
    { label: "Do Not Call", text: "Please stop calling us about our mortgage situation" },
  ],
};
