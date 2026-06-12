export interface DossierComplet {
  clientName: string;
  clientFirstName: string;
  clientPhone: string;
  clientEmail: string;
  siteAddress: string;
  city: string;
  postalCode: string;
  trade: string;
  projectType: string;
  budget: string;
  desiredTimeline: string;
  maturity: string;
  tradeAnswers: { question: string; answer: string }[];
  aiSummary: string;
  completenessScore: number;
  artisanId: string;
  source: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
