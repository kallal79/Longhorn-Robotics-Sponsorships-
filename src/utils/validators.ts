import {
  AuditCheckItem,
  GtmPlanState,
  LeadCandidate,
  OfferDefinition,
  OutreachOpenerPair,
} from '../types/gtm';

export const MAX_OPENER_WORDS = 60;
export const MAX_SHOWCASE_CHARS = 500;
export const TARGET_LEAD_COUNT = 20;
export const TARGET_TOP3_COUNT = 3;

export function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned
    .split(/\s+/)
    .filter((token) => /[a-zA-Z0-9\u00C0-\u024F]/.test(token)).length;
}

export function isOpenerUnderLimit(text: string, limit = MAX_OPENER_WORDS): boolean {
  const words = countWords(text);
  return words > 0 && words < limit;
}

export function getActiveOpenerText(lead: LeadCandidate | undefined): string {
  if (!lead?.openers) return '';
  if (lead.openers.customEditedMessage.trim()) {
    return lead.openers.customEditedMessage.trim();
  }
  return lead.openers.selectedAngle === 'A'
    ? lead.openers.angleAFactFirst.trim()
    : lead.openers.angleBValueFirst.trim();
}

export interface OpenerQualityDiagnostic {
  wordCount: number;
  underWordLimit: boolean;
  hasHypeLanguage: boolean;
  hasFalseFamiliarity: boolean;
  mentionsCandidateOrDomain: boolean;
  warnings: string[];
}

const HYPE_PATTERN =
  /\b(guarantee|guaranteed|10x|100%|skyrocket|revolutionary|game[- ]changer|disrupt|best in the world|act fast|limited time)\b/i;
const FALSE_FAMILIARITY_PATTERN =
  /\b(following up|as we discussed|as discussed|great meeting you|circling back|touching base again|per our call)\b/i;

export function analyzeOpenerQuality(
  text: string,
  lead?: Pick<LeadCandidate, 'name' | 'domain'>,
): OpenerQualityDiagnostic {
  const wordCount = countWords(text);
  const underWordLimit = wordCount > 0 && wordCount < MAX_OPENER_WORDS;
  const hasHypeLanguage = HYPE_PATTERN.test(text) || /!{2,}/.test(text);
  const hasFalseFamiliarity = FALSE_FAMILIARITY_PATTERN.test(text);

  const firstWord = lead?.name?.split(/\s+/)[0]?.toLowerCase() ?? '';
  const domainRoot = lead?.domain?.split('.')[0]?.toLowerCase() ?? '';
  const lower = text.toLowerCase();
  const mentionsCandidateOrDomain = Boolean(
    (firstWord && firstWord.length > 2 && lower.includes(firstWord)) ||
      (domainRoot && domainRoot.length > 2 && lower.includes(domainRoot)),
  );

  const warnings: string[] = [];
  if (wordCount === 0) {
    warnings.push('Opener is empty.');
  } else if (!underWordLimit) {
    warnings.push(`Must stay under ${MAX_OPENER_WORDS} words (currently ${wordCount}).`);
  }
  if (hasHypeLanguage) {
    warnings.push('Avoid hype or exaggerated claims; write like a real person.');
  }
  if (hasFalseFamiliarity) {
    warnings.push('Do not pretend you have already met or spoken.');
  }
  if (lead && !mentionsCandidateOrDomain) {
    warnings.push(`Reference ${lead.name} or ${lead.domain} so the opener is clearly tailored.`);
  }

  return {
    wordCount,
    underWordLimit,
    hasHypeLanguage,
    hasFalseFamiliarity,
    mentionsCandidateOrDomain,
    warnings,
  };
}

export interface OfferDiagnostic {
  hasForConnector: boolean;
  hasSpecificWho: boolean;
  hasConcreteDeliverable: boolean;
  score: number;
  tips: string[];
}

export function analyzeOfferOneLiner(oneLiner: string): OfferDiagnostic {
  const trimmed = oneLiner.trim();
  const hasForConnector = /\s+for\s+/i.test(trimmed);
  const parts = trimmed.split(/\s+for\s+/i);
  const offerSide = parts[0]?.trim() ?? '';
  const whoSide = parts.slice(1).join(' for ').trim();

  const hasConcreteDeliverable = offerSide.length >= 12;
  const hasSpecificWho =
    whoSide.length >= 18 &&
    (/\b(in|at|under|<\s*50|fewer than|independent|local|neighborhood|club|shop|shops|bakery|bakeries)\b/i.test(
      whoSide,
    ) ||
      whoSide.split(/\s+/).length >= 4);

  const tips: string[] = [];
  if (!hasForConnector) {
    tips.push('Use the exact mission shape: "[what you offer] for [who]".');
  }
  if (!hasConcreteDeliverable) {
    tips.push(
      'Make the deliverable concrete rather than generic (e.g., "mobile menu sites and catering intake").',
    );
  }
  if (!hasSpecificWho) {
    tips.push(
      'Tighten the "who" with geography, niche, or size so it could not describe 100 unrelated sellers.',
    );
  }

  const score =
    (hasForConnector ? 35 : 0) + (hasConcreteDeliverable ? 30 : 0) + (hasSpecificWho ? 35 : 0);

  return {
    hasForConnector,
    hasSpecificWho,
    hasConcreteDeliverable,
    score,
    tips,
  };
}

export function detectPotentialPii(text: string): string[] {
  const warnings: string[] = [];
  if (/(?:\(\d{3}\)|\b\d{3})[-.\s]*\d{3}[-.\s]+\d{4}\b/.test(text)) {
    warnings.push(
      'Contains a phone number pattern — verify it is not personal PII before publishing.',
    );
  }
  if (
    /[a-zA-Z0-9._%+-]+@(gmail|yahoo|hotmail|icloud|outlook|live|aol|protonmail|me|msn)\.(com|net)|[a-zA-Z0-9._%+-]+@proton\.me/i.test(
      text,
    )
  ) {
    warnings.push(
      'Contains a personal webmail address — replace private emails with generic placeholders.',
    );
  }
  return warnings;
}

export function runMissionReadinessAudit(plan: GtmPlanState): AuditCheckItem[] {
  const selectedSegment = plan.segments.find((s) => s.isSelected);
  const top3Leads = plan.leads.filter((l) => l.status === 'top3');
  const cutLeads = plan.leads.filter((l) => l.status === 'cut');
  const primaryLead =
    top3Leads.find((l) => l.id === plan.activePrimaryOpenerLeadId) ?? top3Leads[0];

  const allTop3HaveFacts =
    top3Leads.length === TARGET_TOP3_COUNT &&
    top3Leads.every(
      (l) =>
        Boolean(l.verifiedFact?.trim()) &&
        Boolean(l.factDate?.trim()) &&
        Boolean(l.factSourceUrl?.trim()),
    );

  const allOpenersValid =
    top3Leads.length === TARGET_TOP3_COUNT &&
    top3Leads.every((l) => {
      if (!l.openers) return false;
      const diagA = analyzeOpenerQuality(l.openers.angleAFactFirst, l);
      const diagB = analyzeOpenerQuality(l.openers.angleBValueFirst, l);
      const diagFinal = analyzeOpenerQuality(getActiveOpenerText(l), l);
      return (
        diagA.underWordLimit &&
        diagB.underWordLimit &&
        diagFinal.underWordLimit &&
        !diagFinal.hasHypeLanguage &&
        !diagFinal.hasFalseFamiliarity
      );
    });

  const offerDiag = analyzeOfferOneLiner(plan.offer.oneLiner);
  const showcaseLen = plan.showcase.description.trim().length;
  const piiWarnings = [
    ...detectPotentialPii(plan.showcase.description),
    ...detectPotentialPii(getActiveOpenerText(primaryLead)),
  ];

  return [
    {
      id: 'offer-shape',
      phase: 'Phase I',
      label: 'Offer follows tight "[what you offer] for [who]" shape',
      passed: offerDiag.score === 100,
      detail:
        offerDiag.score === 100
          ? 'Clear deliverable + tightly bounded niche, reachability context & size.'
          : offerDiag.tips.join(' '),
    },
    {
      id: 'segment-choice',
      phase: 'Phase I',
      label: '2–3 segments compared with 1 explicit Week-1 choice',
      passed: plan.segments.length >= 2 && Boolean(selectedSegment?.reachabilityReason.trim()),
      detail: selectedSegment
        ? `Selected: ${selectedSegment.name}`
        : 'Select one reachable segment for Week 1.',
    },
    {
      id: 'clay-20-list',
      phase: 'Phase II',
      label: '20 real potential customers listed with Clay Sculptor query & filters',
      passed:
        plan.leads.length >= TARGET_LEAD_COUNT && Boolean(plan.claySpec.sculptorQuery.trim()),
      detail: `${plan.leads.length} leads loaded (${top3Leads.length} Top 3, ${cutLeads.length} cut).`,
    },
    {
      id: 'cut-transparency',
      phase: 'Phase II',
      label: 'Disqualified leads documented with specific cut reasons & unknowns',
      passed:
        cutLeads.length > 0 &&
        cutLeads.every((l) => Boolean(l.cutReason?.trim())) &&
        plan.leads.every((l) => Boolean(l.unknownInfo.trim())),
      detail: `${cutLeads.length} leads cut with transparent verification notes.`,
    },
    {
      id: 'top3-verified-facts',
      phase: 'Phase III',
      label: 'Top 3 candidates each have a dated, specific fact + direct source URL',
      passed: allTop3HaveFacts,
      detail: allTop3HaveFacts
        ? 'All 3 Top candidates include verified dates and public URLs.'
        : 'Ensure exactly 3 Top candidates have verified facts, dates, and URLs.',
    },
    {
      id: 'openers-under-60',
      phase: 'Phase III',
      label: 'All Angle A & B openers < 60 words with zero hype or false familiarity',
      passed: allOpenersValid,
      detail: allOpenersValid
        ? 'All 6 opener angles and selected messages pass word-count & tone checks.'
        : 'Check opener word counts (<60) and remove hype or false familiarity.',
    },
    {
      id: 'metrics-signal',
      phase: 'Phase III',
      label: 'Clear "What I\'ll watch" Week-1 metric defined',
      passed: Boolean(plan.metrics.primarySignal.trim()) && plan.metrics.weeklySendGoal > 0,
      detail: `Tracking replies per ${plan.metrics.weeklySendGoal} messages (target: ${plan.metrics.targetRepliesPerTen}).`,
    },
    {
      id: 'showcase-description',
      phase: 'Showcase',
      label: 'Handshake Showcase description <= 500 chars and privacy-safe',
      passed: showcaseLen > 50 && showcaseLen <= MAX_SHOWCASE_CHARS && piiWarnings.length === 0,
      detail:
        piiWarnings.length > 0
          ? piiWarnings.join(' ')
          : `${showcaseLen} / ${MAX_SHOWCASE_CHARS} characters used.`,
    },
  ];
}

function compactWords(text: string | undefined, maxWords: number, fallback: string): string {
  const normalized = text?.trim().replace(/\s+/g, ' ') ?? '';
  if (!normalized) return fallback;
  const words = normalized.split(' ');
  const sliced = words.slice(0, maxWords).join(' ').replace(/[.,;:—-]+$/, '');
  return sliced || fallback;
}

function toMidSentencePhrase(phrase: string): string {
  if (/^[A-Z][a-z]/.test(phrase)) {
    return phrase.charAt(0).toLowerCase() + phrase.slice(1);
  }
  return phrase;
}

export function createDefaultOpenersForLead(
  lead: Pick<LeadCandidate, 'name' | 'domain' | 'neighborhood' | 'category' | 'verifiedFact'>,
  offer?: Partial<Pick<OfferDefinition, 'whatYouOffer' | 'senderPlaceholder'>>,
): OutreachOpenerPair {
  const sender = offer?.senderPlaceholder?.trim() || '[Your Name]';
  const leadName = compactWords(lead.name, 5, 'your team');
  const domain = lead.domain?.trim() || 'your site';
  const deliverable = toMidSentencePhrase(
    compactWords(offer?.whatYouOffer, 9, 'a lightweight digital workflow sample'),
  );
  const place = compactWords(lead.neighborhood, 4, compactWords(lead.category, 4, 'your area'));
  const groupLabel = compactWords(lead.category, 5, 'teams like yours');

  const factRaw = lead.verifiedFact?.trim();
  const angleAFactFirst = factRaw
    ? `Saw ${leadName}'s public update (${compactWords(factRaw, 11, 'recent activity')}). Would ${deliverable} be useful for ${domain}? Happy to share a brief sample with zero pressure. — ${sender}`
    : `Noticed ${leadName}'s work around ${place} (${domain}). Would ${deliverable} save your team time this week? Happy to share a brief sample. — ${sender}`;

  const angleBValueFirst = `Hi ${leadName} team — I build ${deliverable} tailored for ${groupLabel}. Would a quick, zero-pressure sample for ${domain} be helpful this week? — ${sender}`;

  return {
    angleALabel: 'Angle A — Leads with the verified fact',
    angleAFactFirst,
    angleBLabel: 'Angle B — Leads with what I can do for them',
    angleBValueFirst,
    selectedAngle: 'A',
    customEditedMessage: angleAFactFirst,
  };
}

function isNonNullRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidGtmPlanState(candidate: unknown): candidate is GtmPlanState {
  if (!isNonNullRecord(candidate)) return false;

  const { offer, segments, claySpec, leads, metrics, showcase, activePrimaryOpenerLeadId } =
    candidate;

  if (!isNonNullRecord(offer)) return false;
  if (
    typeof offer.projectName !== 'string' ||
    typeof offer.whatYouOffer !== 'string' ||
    typeof offer.whoYouServe !== 'string' ||
    typeof offer.oneLiner !== 'string' ||
    typeof offer.accentColor !== 'string'
  ) {
    return false;
  }

  if (!Array.isArray(segments) || segments.length === 0) return false;
  if (!segments.every((seg) => isNonNullRecord(seg) && typeof seg.id === 'string' && typeof seg.name === 'string')) {
    return false;
  }

  if (!isNonNullRecord(claySpec)) return false;
  if (
    typeof claySpec.sculptorQuery !== 'string' ||
    !Array.isArray(claySpec.industryNeighbors) ||
    !Array.isArray(claySpec.keywordsInclude) ||
    !Array.isArray(claySpec.exclusions)
  ) {
    return false;
  }

  if (!Array.isArray(leads) || leads.length === 0) return false;
  if (
    !leads.every(
      (lead) =>
        isNonNullRecord(lead) &&
        typeof lead.id === 'string' &&
        typeof lead.name === 'string' &&
        (lead.status === 'top3' || lead.status === 'watchlist' || lead.status === 'cut'),
    )
  ) {
    return false;
  }

  if (!isNonNullRecord(metrics)) return false;
  if (
    typeof metrics.primarySignal !== 'string' ||
    typeof metrics.weeklySendGoal !== 'number' ||
    !Number.isFinite(metrics.weeklySendGoal)
  ) {
    return false;
  }

  if (!isNonNullRecord(showcase)) return false;
  if (typeof showcase.projectTitle !== 'string' || typeof showcase.description !== 'string') {
    return false;
  }

  return typeof activePrimaryOpenerLeadId === 'string';
}

export function toSafeHttpUrl(rawUrl: string | undefined, fallbackDomain?: string): string {
  const trimmed = rawUrl?.trim() ?? '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }
  const cleanDomain = fallbackDomain?.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  return cleanDomain ? `https://${cleanDomain}` : 'https://example.com';
}

export function formatStudioEmail(projectName: string): string {
  const rawSlug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const withoutDupSuffix = rawSlug.replace(/-studio$/, '');
  const domainLabel = withoutDupSuffix || rawSlug || 'studio';
  return `hello@${domainLabel}.studio`;
}

export interface CadenceTouches {
  touch1Opener: string;
  touch2Bump: string;
  touch3Closeout: string;
}

export function generateCadenceTouches(
  lead: LeadCandidate,
  senderPlaceholder = '[Your Name]',
): CadenceTouches {
  const shortName = lead.name.split(/\s+/)[0] || lead.name;
  const touch1 = getActiveOpenerText(lead);

  const isBakery = /bakery|bakeshop|sugarwolf|cake|pastry|croissant/i.test(
    `${lead.name} ${lead.category}`,
  );
  const isCoffee = /coffee|roast|espresso|desnudo|cafe/i.test(`${lead.name} ${lead.category}`);
  const contextSubject = isBakery
    ? 'catering pre-order'
    : isCoffee
      ? 'mobile beverage bar intake'
      : 'intake workflow';

  const touch2Bump = `Hi ${shortName} team — floating this back to the top of your inbox. Happy to share that quick 2-minute ${contextSubject} mockup whenever convenient. — ${senderPlaceholder}`;

  const touch3Closeout = `Hi ${shortName} team — following up one last time before closing the loop. If your ${contextSubject} flow is already all set, no worries at all! Best, — ${senderPlaceholder}`;

  return {
    touch1Opener: touch1,
    touch2Bump,
    touch3Closeout,
  };
}
