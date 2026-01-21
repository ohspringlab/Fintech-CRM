// Clerk API helper functions
import { useAuth } from "@clerk/clerk-react";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Make an authenticated API request using Clerk session token
 * Use this hook in your components to make API calls with Clerk authentication
 * 
 * Example usage:
 * ```tsx
 * const { clerkApiRequest } = useClerkApi();
 * const data = await clerkApiRequest('/loans', { method: 'GET' });
 * ```
 */
export function useClerkApi() {
  const { getToken } = useAuth();

  const clerkApiRequest = async <T,>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    // Get Clerk session token
    const token = await getToken();
    
    const frontendUrl = window.location.origin;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Frontend-URL': frontendUrl,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      const errorMessage = error.error || error.message || 'Request failed';
      
      const apiError = new Error(errorMessage) as any;
      apiError.status = response.status;
      if (error.eligibilityErrors) apiError.eligibilityErrors = error.eligibilityErrors;
      if (error.errors) apiError.errors = error.errors;
      if (error.requiresVerification) apiError.requiresVerification = error.requiresVerification;
      throw apiError;
    }

    return response.json();
  };

  return { clerkApiRequest };
}

/**
 * Standalone function to make Clerk API requests (for use outside of React components)
 * Note: This requires the token to be passed in manually
 */
export async function clerkApiRequest<T>(
  endpoint: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const frontendUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Frontend-URL': frontendUrl,
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const errorMessage = error.error || error.message || 'Request failed';
    
    const apiError = new Error(errorMessage) as any;
    apiError.status = response.status;
    if (error.eligibilityErrors) apiError.eligibilityErrors = error.eligibilityErrors;
    if (error.errors) apiError.errors = error.errors;
    if (error.requiresVerification) apiError.requiresVerification = error.requiresVerification;
    throw apiError;
  }

  return response.json();
}
