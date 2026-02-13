export interface ObjectionScript {
  id: string;
  category: ObjectionCategory;
  variant?: string;
  label: string;
  patterns: string[];
  script: string;
  priority: number;
  leadTypes?: LeadType[];
}

export type ObjectionCategory =
  | 'NOT_INTERESTED'
  | 'ALREADY_HAVE_AGENT'
  | 'BAD_TIMING'
  | 'NOT_SELLING'
  | 'PRICE_CONCERN'
  | 'DO_NOT_CALL'
  | 'COMMISSION_OBJECTION'
  | 'WANT_TO_TRY_MYSELF'
  | 'TENANT_ISSUES'
  | 'FINANCIAL_DISTRESS';

export type LeadType = 'expired' | 'fsbo' | 'frbo' | 'pre-foreclosure';

export interface DetectedObjection {
  category: ObjectionCategory;
  variant?: string;
  confidence: number;
  matchedPattern: string;
  triggerText: string;
}

export interface ScriptMatch {
  script: ObjectionScript;
  objection: DetectedObjection;
}
