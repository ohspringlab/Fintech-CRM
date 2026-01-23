// Use VITE_API_URL for backend API (frontend and backend are hosted separately)
const getApiBase = () => {
  // Use VITE_API_URL from environment, fallback to localhost for development
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  // Ensure it ends with /api
  return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
};

const API_BASE = getApiBase();

// Debug: Log the API base URL (only in development)
if (!import.meta.env.PROD) {
  console.log('🔧 API Base URL:', API_BASE);
}

// Helper to get base URL for static files (without /api)
// Returns the backend base URL without /api
export const getFileBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  return apiUrl.replace('/api', '');
};

// Store for Clerk token getter function
let clerkTokenGetter: (() => Promise<string | null>) | null = null;

// Set the Clerk token getter (called from App.tsx during initialization)
export function setClerkTokenGetter(getter: () => Promise<string | null>) {
  clerkTokenGetter = getter;
}

// Get auth token from localStorage (legacy) or Clerk
async function getToken(): Promise<string | null> {
  // Try Clerk first (new system)
  if (clerkTokenGetter) {
    try {
      const clerkToken = await clerkTokenGetter();
      console.log('🎫 Token fetch:', {
        hasClerkGetter: true,
        gotToken: !!clerkToken,
        tokenPrefix: clerkToken ? clerkToken.substring(0, 15) + '...' : 'none'
      });
      if (clerkToken) return clerkToken;
    } catch (error) {
      console.error('Failed to get Clerk token:', error);
    }
  } else {
    console.log('⚠️ No Clerk token getter available yet');
  }
  
  // Fallback to localStorage (legacy system)
  const legacyToken = localStorage.getItem('rpc_token');
  if (legacyToken) {
    console.log('📦 Using legacy token from localStorage');
  }
  return legacyToken;
}

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  
  // Debug: Log token info
  console.log('📤 API Request:', {
    endpoint,
    hasToken: !!token,
    tokenPrefix: token ? token.substring(0, 20) + '...' : 'none'
  });
  
  // Include current window location as frontend URL in headers so backend can use it
  const frontendUrl = window.location.origin;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Frontend-URL': frontendUrl,
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Build the full API URL
  const apiUrl = `${API_BASE}${endpoint}`;
  
  // Debug: Log the full URL being called (only in development)
  if (!import.meta.env.PROD) {
    console.log('🌐 Full API URL:', apiUrl);
  }

  const response = await fetch(apiUrl, {
    ...options,
    headers,
    credentials: 'include', // Important for cookies/auth
  });

  if (!response.ok) {
    // Handle 401 (Unauthorized) - auto logout
    if (response.status === 401) {
      console.warn('🔒 401 Unauthorized - Auto logging out...');
      
      // Clear legacy token
      localStorage.removeItem('rpc_token');
      
      // Dispatch custom event for components to handle logout
      // This allows Clerk-based components to sign out properly
      window.dispatchEvent(new CustomEvent('auth:logout', { 
        detail: { reason: 'unauthorized', message: 'Session expired. Please sign in again.' }
      }));
      
      // If we're in a protected route, redirect to sign in
      // Only redirect if we're not already on a public page
      const publicPaths = ['/', '/clerk-signin', '/clerk-signup', '/login', '/register'];
      const currentPath = window.location.pathname;
      if (!publicPaths.includes(currentPath)) {
        // Small delay to allow event handlers to process
        setTimeout(() => {
          window.location.href = '/clerk-signin';
        }, 100);
      }
    }
    
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const errorMessage = error.error || error.message || 'Request failed';
    
    // Create error with status code for better handling
    const apiError = new Error(errorMessage) as any;
    apiError.status = response.status;
    apiError.code = error.code; // Include error code from backend
    // Preserve eligibility errors and other error details
    if (error.eligibilityErrors) apiError.eligibilityErrors = error.eligibilityErrors;
    if (error.errors) apiError.errors = error.errors;
    if (error.requiresVerification) apiError.requiresVerification = error.requiresVerification;
    if (error.missingFields) apiError.missingFields = error.missingFields;
    if (error.details) apiError.details = error.details;
    if (error.declined) apiError.declined = error.declined;
    if (error.reason) apiError.reason = error.reason;
    throw apiError;
  }

  return response.json();
}

// Auth API
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    propertyAddress: string;
    propertyCity: string;
    propertyState: string;
    propertyZip: string;
    propertyName?: string;
  }) => apiRequest<{ token: string; user: User; loan: { id: string; loanNumber: string }; verificationUrl?: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  login: (email: string, password: string) =>
    apiRequest<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiRequest<{ user: User; profile: any; loanCount: number }>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  sendVerificationEmail: () =>
    apiRequest<{ message: string; verificationUrl?: string }>('/auth/verify-email/send', {
      method: 'POST',
    }),

  verifyEmail: (token: string) =>
    apiRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
};

// Loans API
export const loansApi = {
  list: () => apiRequest<{ loans: Loan[] }>('/loans'),

  get: (id: string) => apiRequest<{ loan: Loan; statusHistory: any[]; needsList: any[]; documents: any[]; payments: any[] }>(`/loans/${id}`),

  create: (data: { propertyAddress: string; propertyCity: string; propertyState: string; propertyZip: string; propertyName?: string }) =>
    apiRequest<{ loan: Loan }>('/loans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<LoanRequestData>) =>
    apiRequest<{ loan: Loan }>(`/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  submit: (id: string) =>
    apiRequest(`/loans/${id}/submit`, { method: 'POST' }),

  creditAuth: (id: string) =>
    apiRequest(`/loans/${id}/credit-auth`, {
      method: 'POST',
      body: JSON.stringify({ consent: true }),
    }),

  generateQuote: (id: string) =>
    apiRequest<{ quote: SoftQuote; termSheetUrl: string }>(`/loans/${id}/soft-quote`, { method: 'POST' }),

  signTermSheet: (id: string) =>
    apiRequest(`/loans/${id}/sign-term-sheet`, { method: 'POST' }),

  completeNeedsList: (id: string) =>
    apiRequest(`/loans/${id}/complete-needs-list`, { method: 'POST' }),

  submitFullApplication: (id: string, applicationData: any) =>
    apiRequest(`/loans/${id}/full-application`, {
      method: 'POST',
      body: JSON.stringify({ applicationData }),
    }),

  getClosingChecklist: (id: string) =>
    apiRequest<{ checklist: any[] }>(`/loans/${id}/closing-checklist`),

  updateClosingChecklistItem: (loanId: string, itemId: string, data: { completed?: boolean; notes?: string }) =>
    apiRequest(`/loans/${loanId}/closing-checklist/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Documents API
export const documentsApi = {
  getForLoan: (loanId: string) =>
    apiRequest<{ documents: Document[]; folders: Folder[] }>(`/documents/loan/${loanId}`),

  getNeedsList: (loanId: string) =>
    apiRequest<{ needsList: NeedsListItem[] }>(`/documents/needs-list/${loanId}`),

  getFolders: (loanId: string) =>
    apiRequest<{ folders: FolderSummary[] }>(`/documents/folders/${loanId}`),

  upload: async (loanId: string, file: File, needsListItemId?: string, folderName?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('loanId', loanId);
    if (needsListItemId) formData.append('needsListItemId', needsListItemId);
    if (folderName) formData.append('folderName', folderName);

    const token = await getToken();
    const response = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  delete: (id: string) =>
    apiRequest(`/documents/${id}`, { method: 'DELETE' }),
};

// Payments API
export const paymentsApi = {
  getForLoan: (loanId: string) =>
    apiRequest<{ payments: Payment[] }>(`/payments/loan/${loanId}`),

  createAppraisalIntent: (loanId: string) =>
    apiRequest<{ clientSecret: string; amount: number }>('/payments/appraisal-intent', {
      method: 'POST',
      body: JSON.stringify({ loanId }),
    }),

  confirmPayment: (loanId: string, paymentIntentId: string) =>
    apiRequest('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({ loanId, paymentIntentId }),
    }),
};

// Profile API
export const profileApi = {
  get: () => apiRequest<{ profile: Profile }>('/profile'),

  update: (data: Partial<Profile>) =>
    apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getNotifications: () =>
    apiRequest<{ notifications: Notification[]; unreadCount: number }>('/profile/notifications'),

  markNotificationRead: (id: string) =>
    apiRequest(`/profile/notifications/${id}/read`, { method: 'PUT' }),

  markAllNotificationsRead: () =>
    apiRequest('/profile/notifications/read-all', { method: 'PUT' }),
};

// Operations API
export const opsApi = {
  getPipeline: (params?: { status?: string; search?: string; processor?: string; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.processor) searchParams.set('processor', params.processor);
    if (params?.page) searchParams.set('page', params.page.toString());
    return apiRequest<{ loans: Loan[]; total: number; page: number; totalPages: number }>(
      `/operations/pipeline?${searchParams}`
    );
  },

  getStats: () => apiRequest<PipelineStats>('/operations/stats'),

  getRecentClosings: (limit?: number) => {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest<{ closings: RecentClosing[] }>(`/operations/recent-closings${params}`);
  },

  getStatusOptions: () => apiRequest<{ statuses: StatusOption[] }>('/operations/status-options'),

  getLoan: (id: string) =>
    apiRequest<{ loan: Loan; statusHistory: any[]; needsList: any[]; documents: any[]; payments: any[]; statusOptions: StatusOption[] }>(
      `/operations/loan/${id}`
    ),

  updateStatus: (id: string, status: string, notes?: string) =>
    apiRequest(`/operations/loan/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    }),

  cleanupNeedsList: (loanId: string) =>
    apiRequest<{ message: string; removed: number }>(`/operations/loan/${loanId}/cleanup-needs-list`, {
      method: 'POST',
    }),

  approveQuote: (id: string) =>
    apiRequest<{ message: string; quote: any; termSheetUrl: string }>(`/operations/loan/${id}/approve-quote`, {
      method: 'POST',
    }),

  disapproveQuote: (id: string, reason?: string) =>
    apiRequest<{ message: string; reason: string }>(`/operations/loan/${id}/disapprove-quote`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  deleteLoan: (id: string) =>
    apiRequest<{ message: string; loanNumber: string }>(`/operations/loan/${id}`, {
      method: 'DELETE',
    }),

  assignProcessor: (id: string, processorId: string) =>
    apiRequest(`/operations/loan/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ processorId }),
    }),

  addNeedsListItem: (loanId: string, data: { documentType: string; folderName: string; description?: string; required?: boolean }) =>
    apiRequest(`/operations/loan/${loanId}/needs-list`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reviewDocument: (needsListItemId: string, status: 'reviewed' | 'rejected', notes?: string) =>
    apiRequest(`/operations/needs-list/${needsListItemId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    }),

  uploadCommitment: (loanId: string, commitmentLetterUrl: string, conditionalItems?: string) =>
    apiRequest(`/operations/loan/${loanId}/commitment`, {
      method: 'POST',
      body: JSON.stringify({ commitmentLetterUrl, conditionalItems }),
    }),

  scheduleClosing: (loanId: string, closingDate: string) =>
    apiRequest(`/operations/loan/${loanId}/schedule-closing`, {
      method: 'POST',
      body: JSON.stringify({ closingDate }),
    }),

  fundLoan: (loanId: string, fundedAmount: number) =>
    apiRequest(`/operations/loan/${loanId}/fund`, {
      method: 'POST',
      body: JSON.stringify({ fundedAmount }),
    }),

  searchCRM: (query: string) =>
    apiRequest<{ borrowers: any[] }>(`/operations/crm/search?q=${encodeURIComponent(query)}`),

  getBorrower: (id: string) =>
    apiRequest<{ borrower: any; loans: Loan[] }>(`/operations/crm/borrower/${id}`),

  getProcessors: () =>
    apiRequest<{ processors: { id: string; full_name: string; email: string }[] }>('/operations/processors'),

  // Closing Checklist
  getClosingChecklist: (loanId: string) =>
    apiRequest<{ checklist: any[] }>(`/operations/loan/${loanId}/closing-checklist`),

  addClosingChecklistItem: (loanId: string, data: { itemName: string; description?: string; category?: string; required?: boolean }) =>
    apiRequest(`/operations/loan/${loanId}/closing-checklist`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateClosingChecklistItem: (loanId: string, itemId: string, data: { completed?: boolean; notes?: string }) =>
    apiRequest(`/operations/loan/${loanId}/closing-checklist/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteClosingChecklistItem: (loanId: string, itemId: string) =>
    apiRequest(`/operations/loan/${loanId}/closing-checklist/${itemId}`, {
      method: 'DELETE',
    }),
};

// Contact API
export const contactApi = {
  submit: (data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    loanType?: string;
  }) =>
    apiRequest<{ message: string; contactId: string }>('/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'borrower' | 'operations' | 'admin';
  email_verified?: boolean;
}

export interface Loan {
  id: string;
  loan_number: string;
  user_id: string;
  property_address: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  property_name?: string;
  property_type: 'residential' | 'commercial';
  residential_units?: number;
  is_portfolio: boolean;
  portfolio_count?: number;
  commercial_type?: string;
  request_type: 'purchase' | 'refinance';
  transaction_type: string;
  borrower_type: 'owner_occupied' | 'investment';
  property_value: number;
  requested_ltv: number;
  loan_amount: number;
  documentation_type: string;
  dscr_ratio?: number;
  status: string;
  current_step: number;
  soft_quote_generated: boolean;
  soft_quote_data?: SoftQuote;
  term_sheet_url?: string;
  term_sheet_signed: boolean;
  credit_authorized: boolean;
  appraisal_paid: boolean;
  full_application_completed: boolean;
  commitment_letter_url?: string;
  closing_scheduled_date?: string;
  funded_date?: string;
  funded_amount?: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  borrower_name?: string;
  borrower_email?: string;
  borrower_phone?: string;
  processor_name?: string;
  days_in_status?: number;
}

export interface LoanRequestData {
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  propertyName?: string;
  propertyType?: 'residential' | 'commercial';
  residentialUnits?: number;
  isPortfolio?: boolean;
  portfolioCount?: number;
  commercialType?: string;
  requestType?: 'purchase' | 'refinance';
  transactionType?: string;
  borrowerType?: 'owner_occupied' | 'investment';
  propertyValue?: number;
  requestedLtv?: number;
  documentationType?: string;
  annualRentalIncome?: number;
  annualOperatingExpenses?: number;
  annualLoanPayments?: number;
}

export interface SoftQuote {
  approved: boolean;
  declineReason?: string;
  loanAmount: number;
  propertyValue: number;
  ltv: number;
  dscr?: number;
  interestRateMin: number;
  interestRateMax: number;
  rateRange: string;
  originationPoints: number;
  originationFee: number;
  processingFee: number;
  underwritingFee: number;
  appraisalFee: number;
  totalClosingCosts: number;
  estimatedMonthlyPayment: number;
  terms: { months: number; rateMin: number; rateMax: number; label?: string }[];
  disclaimer: string;
  generatedAt: string;
  validUntil: string;
}

export interface NeedsListItem {
  id: string;
  loan_id: string;
  document_type: string;
  folder_name: string;
  description: string;
  status: 'pending' | 'uploaded' | 'reviewed' | 'rejected';
  required: boolean;
  document_count: number;
  last_upload?: string;
  folder_color: 'tan' | 'blue' | 'red';
}

export interface Document {
  id: string;
  loan_id: string;
  needs_list_item_id?: string;
  folder_name: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface Folder {
  name: string;
  documents: Document[];
  color: 'tan' | 'blue' | 'red';
  hasNewUploads: boolean;
}

export interface FolderSummary {
  folder_name: string;
  items_count: number;
  documents_count: number;
  last_upload?: string;
  pending_count: number;
  uploaded_count: number;
  reviewed_count: number;
  color: 'tan' | 'blue' | 'red';
}

export interface Payment {
  id: string;
  loan_id: string;
  payment_type: string;
  description?: string;
  amount: number;
  status: string;
  paid_at?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  date_of_birth?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  employment_status?: string;
  annual_income?: number;
  credit_score?: number;
  fico_score?: number;
  kyc_verified: boolean;
}

export interface Notification {
  id: string;
  loan_id?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface PipelineStats {
  byStatus: { status: string; count: number; total_amount: number }[];
  totalLoans: number;
  fundedLoans: number;
  fundedAmount: number;
  staleLoans: number;
  recentUploads: number;
  monthlyFunded: number;
  monthlyVolume: number;
  pipelineProfit?: {
    totalPotential: number;
    weightedProfit: number;
    openDeals: number;
    avgProfitPerDeal: number;
    wonThisMonth: number;
    dealsWonThisMonth: number;
  };
  forecast?: {
    thisQuarter: number;
    pipeline: number;
    expectedProfit: number;
  };
  needsAttention?: {
    staleLoans: number;
    pendingDocs: number;
    pendingQuotes: number;
    total: number;
  };
  recentActivity?: Array<{
    id: string;
    loanNumber: string;
    type: string;
    description: string;
    timestamp: string;
    borrowerName: string;
    property: string;
  }>;
}

export interface StatusOption {
  value: string;
  label: string;
  step: number;
}

export interface RecentClosing {
  loan_number: string;
  property_address: string;
  property_city: string;
  property_state: string;
  loan_amount: number;
  funded_amount: number;
  funded_date: string;
  borrower_name: string;
  property_type: string;
  transaction_type: string;
}
