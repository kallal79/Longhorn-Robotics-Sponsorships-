export type LeadStatus = 'top3' | 'watchlist' | 'cut';

export type SegmentFitScore = 'High' | 'Medium' | 'Low';

export interface OfferDefinition {
  projectName: string;
  whatYouOffer: string;
  whoYouServe: string;
  oneLiner: string;
  accentColor: string;
  senderPlaceholder: string;
  portfolioPlaceholder: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  estimatedSize: string;
  reachabilityReason: string;
  speedToReply: SegmentFitScore;
  channelAccess: string;
  isSelected: boolean;
}

export interface ClayFilterSpec {
  sculptorQuery: string;
  locationFilter: string;
  headcountFilter: string;
  industryNeighbors: string[];
  keywordsInclude: string[];
  exclusions: string[];
  trialNote: string;
}

export interface OutreachOpenerPair {
  angleALabel: string;
  angleAFactFirst: string;
  angleBLabel: string;
  angleBValueFirst: string;
  selectedAngle: 'A' | 'B';
  customEditedMessage: string;
}

export interface LeadCandidate {
  id: string;
  rank: number;
  name: string;
  domain: string;
  websiteUrl: string;
  neighborhood: string;
  address: string;
  category: string;
  estimatedEmployees: string;
  contactChannel: string;
  status: LeadStatus;
  cutReason?: string;
  unknownInfo: string;
  whyFit: string;
  verifiedFact?: string;
  factDate?: string;
  factSourceTitle?: string;
  factSourceUrl?: string;
  openers?: OutreachOpenerPair;
  outreachTracker?: {
    sentCount: number;
    replied: boolean;
    auditBooked: boolean;
    notes: string;
  };
}

export interface GtmMetricsTarget {
  primarySignal: string;
  weeklySendGoal: number;
  targetRepliesPerTen: number;
  targetAuditsBooked: number;
  whatUnknownPubliclySummary: string;
}

export interface ShowcaseSubmission {
  projectTitle: string;
  description: string;
  primaryTopCandidateId: string;
}

export interface GtmPlanState {
  offer: OfferDefinition;
  segments: CustomerSegment[];
  claySpec: ClayFilterSpec;
  leads: LeadCandidate[];
  metrics: GtmMetricsTarget;
  showcase: ShowcaseSubmission;
  activePrimaryOpenerLeadId: string;
}

export interface AuditCheckItem {
  id: string;
  phase: 'Phase I' | 'Phase II' | 'Phase III' | 'Showcase';
  label: string;
  passed: boolean;
  detail: string;
}

