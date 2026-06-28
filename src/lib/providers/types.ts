/**
 * Common types shared by the production and demo provider implementations.
 * These types describe the SHAPE of data/actions/routes regardless of mode —
 * production is the source of truth; demo providers must return data
 * compatible with these same shapes so prod UI components can be reused as-is.
 */

export type AppMode = 'production' | 'demo';

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export interface RouteProvider {
  dashboard: string;
  settings: string;
  login: string;
  projectDetail: (projectId: string) => string;
  projectQuoteNew: (projectId: string) => string;
  projectQuoteDetail: (projectId: string, quoteId: string) => string;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  /** True when the action was intercepted/simulated instead of hitting a real backend. */
  simulated?: boolean;
}

export interface BookAppointmentInput {
  projectId: string;
  date: string;
  notes?: string;
}

export interface CreateQuoteInput {
  projectId: string;
  [key: string]: unknown;
}

export interface UpdateQuoteInput {
  quoteId: string;
  [key: string]: unknown;
}

export interface UploadFileInput {
  kind: 'logo' | 'photo' | 'document';
  file: File | Blob;
  projectId?: string;
}

/**
 * Every mutation surfaced by the prod UI must go through this interface.
 * Production implements each method with the real fetch/Supabase/Stripe call.
 * Demo implements each method with a local state mutation (via DemoModeContext)
 * and/or a "Action simulée" toast — never a real network call.
 */
export interface ActionProvider {
  updateProject: (id: string, data: Record<string, unknown>) => Promise<ActionResult>;
  updateProjectStatus: (id: string, status: string) => Promise<ActionResult>;
  saveProjectNote: (id: string, note: string) => Promise<ActionResult>;
  saveCallback: (id: string, date: string | null) => Promise<ActionResult>;
  createQuote: (input: CreateQuoteInput) => Promise<ActionResult>;
  updateQuote: (input: UpdateQuoteInput) => Promise<ActionResult>;
  sendQuote: (quoteId: string) => Promise<ActionResult>;
  followUpQuote: (quoteId: string) => Promise<ActionResult>;
  exportProjectPdf: (projectId: string) => Promise<ActionResult<{ html?: string; url?: string }>>;
  bookAppointment: (input: BookAppointmentInput) => Promise<ActionResult>;
  saveSettings: (section: string, data: Record<string, unknown>) => Promise<ActionResult>;
  openBillingPortal: () => Promise<ActionResult<{ url?: string }>>;
  uploadFile: (input: UploadFileInput) => Promise<ActionResult<{ url?: string }>>;
  showSimulatedActionToast: (message?: string) => void;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export interface DataProvider {
  getProjects: (params?: { status?: string; trade?: string; search?: string }) => Promise<unknown[]>;
  getProject: (id: string) => Promise<unknown>;
  getProjectActivity: (id: string) => Promise<unknown[]>;
  getQuotes: (projectId: string) => Promise<unknown[]>;
  getAppointment: (projectId: string) => Promise<unknown | null>;
  getSettings: () => Promise<Record<string, unknown>>;
  getUsage: () => Promise<unknown>;
  getCatalogue: () => Promise<unknown[]>;
  getWidgetConfig: () => Promise<unknown>;
  getPhotos: (projectId: string) => Promise<unknown[]>;
  getDocuments: (projectId: string) => Promise<unknown[]>;
  getTravelCost: (projectId: string) => Promise<unknown | null>;
  getServiceMatches: (projectId: string) => Promise<unknown[]>;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export interface AppProviders {
  mode: AppMode;
  routes: RouteProvider;
  actions: ActionProvider;
  data: DataProvider;
}
