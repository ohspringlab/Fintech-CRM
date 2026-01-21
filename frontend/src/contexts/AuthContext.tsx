import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ loanId: string; loanNumber: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('rpc_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch (error: any) {
      // Clear invalid token
      localStorage.removeItem('rpc_token');
      setUser(null);
      // Don't redirect here - let the route protection handle it
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password);
    localStorage.setItem('rpc_token', token);
    setUser(user);
  };

  const register = async (data: RegisterData) => {
    const result: any = await authApi.register(data);
    const { token, user, loan, verificationUrl } = result;
    localStorage.setItem('rpc_token', token);
    setUser(user);
    return { 
      loanId: loan.id, 
      loanNumber: loan.loanNumber,
      ...(verificationUrl && { verificationUrl })
    };
  };

  const logout = () => {
    localStorage.removeItem('rpc_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch (error: any) {
      // If it's a 401, logout and clear state
      if (error?.status === 401) {
        logout();
      } else {
        // For other errors, just logout to be safe
        logout();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
