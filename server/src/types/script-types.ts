export interface ObjectionScript {
  id: string;
  category: ObjectionCategory;
  variant?: string;
  label: string;
  patterns: string[];
  script: string;
  priority: number;
}

export type ObjectionCategory =
  | 'NOT_INTERESTED'
  | 'ALREADY_HAVE_AGENT'
  | 'BAD_TIMING'
  | 'NOT_SELLING'
  | 'PRICE_CONCERN'
  | 'DO_NOT_CALL';

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
