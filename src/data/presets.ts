import { GtmPlanState, LeadCandidate } from '../types/gtm';
import { DEFAULT_GTM_PLAN } from './austinCoffeePlan';

export interface PlanPreset {
  id: string;
  label: string;
  badge: string;
  isWebVerified: boolean;
  description: string;
  buildState: () => GtmPlanState;
}

function makeStarterLeads(
  prefix: string,
  domainSuffix: string,
  city: string,
  category: string,
  sampleNames: string[],
): LeadCandidate[] {
  return sampleNames.map((name, idx) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const domain = `${slug}.${domainSuffix}`;
    const status = idx < 3 ? 'top3' : idx >= 16 ? 'cut' : 'watchlist';
    return {
      id: `${prefix}-${idx + 1}`,
      rank: idx + 1,
      name,
      domain,
      websiteUrl: `https://${domain}`,
      neighborhood: city,
      address: `${city} (verify address in Clay)`,
      category,
      estimatedEmployees: status === 'cut' ? '50+ / Out of Scope' : '5–25 (est.)',
      contactChannel: `Website contact / public inbox (verify on ${domain})`,
      status,
      cutReason:
        status === 'cut'
          ? 'Template cut example — replace with real Clay verification reason.'
          : undefined,
      unknownInfo: 'Verify exact headcount, owner name, and current public announcement.',
      whyFit: `Template ${category} prospect in ${city} — verify real fit in Clay.`,
      verifiedFact:
        idx < 3
          ? `[Verify real dated news, menu change, hire, or event on ${domain} before sending]`
          : undefined,
      factDate: idx < 3 ? 'Pending verification' : undefined,
      factSourceUrl: idx < 3 ? `https://${domain}` : undefined,
      openers:
        idx < 3
          ? {
              angleALabel: 'Angle A — Leads with the verified fact',
              angleAFactFirst: `Saw ${name}'s recent announcement in ${city}—wanted to reach out directly. Would a quick sample tailored to your team be helpful this week? — [Your Name]`,
              angleBLabel: 'Angle B — Leads with what I can do for them',
              angleBValueFirst: `Hi ${name} team — I help ${category.toLowerCase()} groups in ${city} solve a focused problem fast. Open to seeing a short 2-minute example this week? — [Your Name]`,
              selectedAngle: 'A',
              customEditedMessage: `Saw ${name}'s recent announcement in ${city}—wanted to reach out directly. Would a quick sample tailored to your team be helpful this week? — [Your Name]`,
            }
          : undefined,
    };
  });
}

export const PLAN_PRESETS: PlanPreset[] = [
  {
    id: 'austin-web-ai',
    label: 'Austin Indie Coffee & Bakeries — Web & AI Studio',
    badge: 'Live Web-Verified (20 Real Companies)',
    isWebVerified: true,
    description:
      'Your active Freelance Web & AI Automation GTM plan with 20 verified Austin companies, 6 documented cuts, and dated 2025/2026 Top-3 facts.',
    buildState: () => structuredClone(DEFAULT_GTM_PLAN),
  },
  {
    id: 'mugs-coffee-shops',
    label: 'Hand-Thrown Ceramic Mugs — Etsy / Craft Studio',
    badge: 'Mission Example Template',
    isWebVerified: false,
    description:
      'Starter template based on the mission’s "Hand-thrown mugs for coffee shops that stock local makers" example. Replace sample rows with your real Clay export.',
    buildState: () => {
      const leads = makeStarterLeads(
        'mug',
        'example.com',
        'Austin, TX',
        'Independent Coffee Shop',
        Array.from({ length: 20 }, (_, i) => `Sample Indie Coffee Shop ${i + 1}`),
      );
      return {
        ...structuredClone(DEFAULT_GTM_PLAN),
        offer: {
          projectName: 'Kiln & Pour Ceramics',
          whatYouOffer: 'Hand-thrown stoneware mugs',
          whoYouServe: 'independent coffee shops that stock local makers in Austin, TX',
          oneLiner:
            'Hand-thrown stoneware mugs for independent coffee shops that stock local makers in Austin, TX.',
          accentColor: '#C2410C',
          senderPlaceholder: '[Your Name]',
          portfolioPlaceholder: '[Etsy / Lookbook URL]',
        },
        segments: [
          {
            id: 'seg-mugs-1',
            name: 'Independent neighborhood coffee shops with retail shelves (<25 staff)',
            estimatedSize: '40–60 shops',
            reachabilityReason:
              "I'm starting with independent coffee shops that stock local makers because I can drop off a physical sample mug and email their retail buyer directly.",
            speedToReply: 'High',
            channelAccess: 'Storefront retail buyer & shop email',
            isSelected: true,
          },
          {
            id: 'seg-mugs-2',
            name: 'Boutique neighborhood gift shops',
            estimatedSize: '30–45 shops',
            reachabilityReason: 'Good retail margins, though quarterly buying cycles move slower.',
            speedToReply: 'Medium',
            channelAccess: 'Wholesale buyer contact form',
            isSelected: false,
          },
          {
            id: 'seg-mugs-3',
            name: 'Independent tasting rooms & bottle shops',
            estimatedSize: '20–35 venues',
            reachabilityReason: 'Loyal weekend locals, though seasonal drinkware budgets compete with barware.',
            speedToReply: 'Low',
            channelAccess: 'General info inbox & taproom manager',
            isSelected: false,
          },
        ],
        claySpec: {
          sculptorQuery:
            'independent coffee shops in Austin, Texas with fewer than 50 employees that feature local makers',
          locationFilter: 'Austin, Texas, United States',
          headcountFilter: '1–10 and 11–50 employees',
          industryNeighbors: ['Food and Beverage Services', 'Retail', 'Restaurants'],
          keywordsInclude: ['coffee', 'espresso', 'local makers', 'merch', 'retail'],
          exclusions: ['Starbucks', 'Dutch Bros', 'Peet’s Coffee'],
          trialNote: 'Verify each coffee shop’s retail shelf before outreach.',
        },
        leads,
        activePrimaryOpenerLeadId: leads[0].id,
        metrics: {
          primarySignal:
            'Replies and sample-mug drop-off requests per 10 messages sent (target: >= 3 replies / 10).',
          weeklySendGoal: 10,
          targetRepliesPerTen: 3,
          targetAuditsBooked: 2,
          whatUnknownPubliclySummary:
            'Template: verify shelf space availability, wholesale margin split, and buyer contact email.',
        },
        showcase: {
          projectTitle: 'Kiln & Pour Ceramics — One-Page GTM Plan',
          description:
            'Template: replace with your one-line offer, 1 verified opening fact from your final three, which of the 20 you cut, and what you could not find publicly.',
          primaryTopCandidateId: leads[0].id,
        },
      };
    },
  },
  {
    id: 'stats-tutoring',
    label: 'Statistics Tutoring — Club Sports & Student Athletes',
    badge: 'Mission Example Template',
    isWebVerified: false,
    description:
      'Starter template based on "Statistics tutoring for club sports programs at big state schools". Replace sample rows with your Clay program list.',
    buildState: () => {
      const leads = makeStarterLeads(
        'tutor',
        'edu.example.org',
        'State Campus Area',
        'Club Sports / Academic Support',
        Array.from({ length: 20 }, (_, i) => `Sample Club Sports Program ${i + 1}`),
      );
      return {
        ...structuredClone(DEFAULT_GTM_PLAN),
        offer: {
          projectName: 'Varsity Stats Lab',
          whatYouOffer: 'Weekly exam-prep statistics tutoring',
          whoYouServe: 'club sports programs and student-athlete study groups at big state schools',
          oneLiner:
            'Weekly exam-prep statistics tutoring for club sports programs and student-athlete study groups at big state schools.',
          accentColor: '#1D4ED8',
          senderPlaceholder: '[Your Name]',
          portfolioPlaceholder: '[Tutoring Schedule Link]',
        },
        segments: [
          {
            id: 'seg-tutor-1',
            name: 'University club sports teams & campus study coordinators',
            estimatedSize: '30–50 clubs',
            reachabilityReason:
              "I'm starting with club sports teams on campus because captains publish officer emails on club directories and need flexible evening review blocks around travel.",
            speedToReply: 'High',
            channelAccess: 'Club captain email & campus org directory',
            isSelected: true,
          },
          {
            id: 'seg-tutor-2',
            name: 'Off-campus test-prep centers',
            estimatedSize: '15–25 centers',
            reachabilityReason: 'Larger contracts, but slower hiring approval than student clubs.',
            speedToReply: 'Medium',
            channelAccess: 'Center director email',
            isSelected: false,
          },
          {
            id: 'seg-tutor-3',
            name: 'First-year nursing & health-science cohorts',
            estimatedSize: '10–18 study groups',
            reachabilityReason: 'Urgent biostats coursework demand, though clinical lab schedules delay replies.',
            speedToReply: 'Low',
            channelAccess: 'Cohort Discord & peer mentor inbox',
            isSelected: false,
          },
        ],
        claySpec: {
          sculptorQuery:
            'university athletic clubs, campus recreation programs, and local test-prep centers near Austin, Texas',
          locationFilter: 'Campus & Metro Area',
          headcountFilter: '1–50 staff / club officers',
          industryNeighbors: ['Higher Education', 'Sports Teams and Clubs', 'Education Management'],
          keywordsInclude: ['club sports', 'athletic', 'tutoring', 'test prep'],
          exclusions: ['National Test Prep Chains'],
          trialNote: 'Search places where student athletes already gather (athletic clubs & prep centers).',
        },
        leads,
        activePrimaryOpenerLeadId: leads[0].id,
        metrics: {
          primarySignal:
            'Trial study-session bookings per 10 outreach messages sent (target: >= 3 / 10).',
          weeklySendGoal: 10,
          targetRepliesPerTen: 3,
          targetAuditsBooked: 2,
          whatUnknownPubliclySummary:
            'Template: verify travel schedule conflicts, GPA study requirements, and officer email.',
        },
        showcase: {
          projectTitle: 'Varsity Stats Lab — One-Page GTM Plan',
          description:
            'Template: replace with your one-line offer, 1 verified opening fact from your final three, which of the 20 you cut, and what you could not find publicly.',
          primaryTopCandidateId: leads[0].id,
        },
      };
    },
  },
  {
    id: 'robotics-sponsors',
    label: 'Robotics Club Sponsorships — Hardware Engineering Firms',
    badge: 'Mission Example Template',
    isWebVerified: false,
    description:
      'Starter template based on "Sponsorships for our robotics club from hardware companies that hire engineers".',
    buildState: () => {
      const leads = makeStarterLeads(
        'robo',
        'hardware.example.com',
        'Austin Metro',
        'Hardware & Robotics Engineering',
        Array.from({ length: 20 }, (_, i) => `Sample Hardware Co ${i + 1}`),
      );
      return {
        ...structuredClone(DEFAULT_GTM_PLAN),
        offer: {
          projectName: 'Longhorn Robotics Sponsorships',
          whatYouOffer: 'Recruiting & competition sponsorship packages',
          whoYouServe: 'regional hardware and embedded systems companies hiring junior engineers',
          oneLiner:
            'Recruiting & competition sponsorship packages for regional hardware and embedded systems companies hiring junior engineers.',
          accentColor: '#0F766E',
          senderPlaceholder: '[Club Officer Name]',
          portfolioPlaceholder: '[Sponsor Deck URL]',
        },
        segments: [
          {
            id: 'seg-robo-1',
            name: 'Local hardware & robotics companies (10–100 employees) hiring engineers',
            estimatedSize: '50–80 companies',
            reachabilityReason:
              "I'm starting with mid-sized regional hardware teams because their engineering leads directly attend demo days and value early recruiting pipelines over formal corporate grants.",
            speedToReply: 'High',
            channelAccess: 'Engineering careers page & university relations contacts',
            isSelected: true,
          },
          {
            id: 'seg-robo-2',
            name: 'Fortune 500 semiconductor enterprises',
            estimatedSize: '10–15 firms',
            reachabilityReason: 'Larger checks, though annual foundation budget cycles take months.',
            speedToReply: 'Low',
            channelAccess: 'Corporate CSR portal',
            isSelected: false,
          },
          {
            id: 'seg-robo-3',
            name: 'Regional CNC & industrial automation shops',
            estimatedSize: '25–40 facilities',
            reachabilityReason: 'High affinity for hands-on CAD/machining talent, though quotes go via front office.',
            speedToReply: 'Medium',
            channelAccess: 'Shop manager email & front desk inquiry',
            isSelected: false,
          },
        ],
        claySpec: {
          sculptorQuery:
            'hardware, robotics, and embedded electronics companies in Texas with 10 to 100 employees hiring engineers',
          locationFilter: 'Austin / Central Texas',
          headcountFilter: '11–50 and 51–200 employees',
          industryNeighbors: ['Robotics Engineering', 'Appliances, Electrical, and Electronics Manufacturing', 'Automation Machinery'],
          keywordsInclude: ['robotics', 'PCB', 'embedded', 'hardware', 'hiring'],
          exclusions: ['Software-only SaaS', 'Staffing Agencies'],
          trialNote: 'Verify active engineering job postings before drafting sponsor outreach.',
        },
        leads,
        activePrimaryOpenerLeadId: leads[0].id,
        metrics: {
          primarySignal:
            'Intro calls or campus lab visit confirmations per 10 outreach messages (target: >= 2 / 10).',
          weeklySendGoal: 10,
          targetRepliesPerTen: 2,
          targetAuditsBooked: 2,
          whatUnknownPubliclySummary:
            'Template: verify annual university-recruiting budget cycle and hardware mentorship interest.',
        },
        showcase: {
          projectTitle: 'Robotics Club Sponsor Plan — One-Page GTM Plan',
          description:
            'Template: replace with your one-line offer, 1 verified opening fact from your final three, which of the 20 you cut, and what you could not find publicly.',
          primaryTopCandidateId: leads[0].id,
        },
      };
    },
  },
];

