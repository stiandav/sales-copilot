const OBJECTION_LABELS = {
  NOT_INTERESTED: 'Not Interested',
  ALREADY_HAVE_AGENT: 'Has Agent',
  BAD_TIMING: 'Bad Timing',
  NOT_SELLING: 'Not Selling',
  PRICE_CONCERN: 'Price Concern',
  DO_NOT_CALL: 'Do Not Call',
};

class ObjectionBadge {
  static create(category) {
    const badge = document.createElement('span');
    badge.className = 'objection-badge objection-badge--' + category;
    badge.textContent = OBJECTION_LABELS[category] || category;
    return badge;
  }

  static getLabel(category) {
    return OBJECTION_LABELS[category] || category;
  }
}
