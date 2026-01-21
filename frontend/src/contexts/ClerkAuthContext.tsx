// Clerk-based authentication context
import { createContext, useContext, ReactNode } from 'react';
import { 
  ClerkProvider, 
  useUser, 
  useAuth as useClerkAuth,
  SignedIn,
  SignedOut,
  RedirectToSignIn
} from '@clerk/clerk-react';
import { User } from '@/lib/api';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

interface ClerkAuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  signOut: () => Promise<void>;
}

const ClerkAuthContext = createContext<ClerkAuthContextType | undefined>(undefined);

// Inner component that uses Clerk hooks
function ClerkAuthProviderInner({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerkAuth();

  const user: User | null = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    fullName: clerkUser.firstName && clerkUser.lastName 
      ? `${clerkUser.firstName} ${clerkUser.lastName}`
      : clerkUser.username || 'User',
    phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
    role: 'borrower', // Default role, can be synced from database
    email_verified: clerkUser.emailAddresses?.some(
      email => email.emailAddress === clerkUser.primaryEmailAddress?.emailAddress 
        && email.verification?.status === 'verified'
    ) || false,
  } : null;

  const isEmailVerified = clerkUser?.emailAddresses?.some(
    email => email.emailAddress === clerkUser.primaryEmailAddress?.emailAddress 
      && email.verification?.status === 'verified'
  ) || false;

  const signOut = async () => {
    await clerkSignOut();
  };

  return (
    <ClerkAuthContext.Provider
      value={{
        user,
        isLoading: !clerkLoaded,
        isAuthenticated: !!clerkUser,
        isEmailVerified,
        signOut,
      }}
    >
      {children}
    </ClerkAuthContext.Provider>
  );
}

// Main provider component
export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  if (!CLERK_PUBLISHABLE_KEY) {
    console.error('VITE_CLERK_PUBLISHABLE_KEY is not set');
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <ClerkAuthProviderInner>{children}</ClerkAuthProviderInner>
    </ClerkProvider>
  );
}

export function useClerkAuthContext() {
  const context = useContext(ClerkAuthContext);
  if (context === undefined) {
    throw new Error('useClerkAuthContext must be used within a ClerkAuthProvider');
  }
  return context;
}

// Protected route component
export function ClerkProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

