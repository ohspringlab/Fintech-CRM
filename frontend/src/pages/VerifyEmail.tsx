import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Mail, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'idle'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    setStatus('verifying');
    try {
      await authApi.verifyEmail(verificationToken);
      setStatus('success');
      toast.success('Email verified successfully!');
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to verify email. The link may have expired.');
      toast.error(error.message || 'Verification failed');
    }
  };

  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  const resendVerification = async () => {
    try {
      const result = await authApi.sendVerificationEmail() as any;
      toast.success('Verification email sent! Check your inbox.');
      
      // In development, show the verification URL if provided
      if (result?.verificationUrl) {
        setVerificationUrl(result.verificationUrl);
        console.log('Verification URL:', result.verificationUrl);
        toast.info(`Development Mode: Verification URL available below`, {
          duration: 5000,
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification email');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-50/30 to-slate-50/20">
      {isAuthenticated ? <AppNavbar variant="borrower" /> : <Navbar variant="light" />}
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-md mx-auto">
          <Card className="bg-white border-border shadow-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {status === 'verifying' && (
                  <Loader2 className="w-16 h-16 text-slate-600 animate-spin" />
                )}
                {status === 'success' && (
                  <CheckCircle2 className="w-16 h-16 text-green-600" />
                )}
                {status === 'error' && (
                  <XCircle className="w-16 h-16 text-destructive" />
                )}
                {status === 'idle' && (
                  <Mail className="w-16 h-16 text-slate-600" />
                )}
              </div>
              <CardTitle className="text-2xl font-serif font-bold">
                {status === 'verifying' && 'Verifying Your Email'}
                {status === 'success' && 'Email Verified!'}
                {status === 'error' && 'Verification Failed'}
                {status === 'idle' && 'Email Verification'}
              </CardTitle>
              <CardDescription>
                {status === 'verifying' && 'Please wait while we verify your email address...'}
                {status === 'success' && 'Your email has been successfully verified. Redirecting to dashboard...'}
                {status === 'error' && errorMessage}
                {status === 'idle' && 'Click the link in your email to verify your account'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status === 'error' && (
                <>
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  </div>
                  <div className="space-y-2">
                    <Button onClick={resendVerification} className="w-full bg-slate-700 hover:bg-slate-800 text-white">
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Verification Email
                    </Button>
                    <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
                      Go to Dashboard
                    </Button>
                  </div>
                </>
              )}
              
              {status === 'idle' && (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    We've sent a verification email to your inbox. Please click the link in the email to verify your account.
                  </p>
                  
                  {/* Development Mode - Show Verification URL */}
                  {(process.env.NODE_ENV === 'development' || verificationUrl) && (
                    <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-lg space-y-3">
                      <div className="flex items-start gap-2">
                        <Mail className="w-5 h-5 text-slate-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900 mb-2">
                            Development Mode: Verification Link
                          </p>
                          <p className="text-xs text-slate-700 mb-3">
                            Since emails aren't configured in development, use this link to verify your email:
                          </p>
                          {verificationUrl ? (
                            <div className="space-y-2">
                              <a 
                                href={verificationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-3 bg-white border-2 border-slate-400 rounded-lg hover:bg-slate-50 transition-colors break-all text-xs text-slate-900 font-mono"
                              >
                                {verificationUrl}
                              </a>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-slate-400 text-slate-700 hover:bg-slate-100"
                                onClick={() => {
                                  navigator.clipboard.writeText(verificationUrl);
                                  toast.success('Verification URL copied to clipboard!');
                                }}
                              >
                                Copy Verification Link
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-600 italic">
                              Click "Resend Verification Email" to generate a verification link.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Button onClick={resendVerification} className="w-full bg-slate-700 hover:bg-slate-800 text-white">
                      <Mail className="w-4 h-4 mr-2" />
                      {verificationUrl ? 'Regenerate Verification Link' : 'Resend Verification Email'}
                    </Button>
                    <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
                      Go to Dashboard
                    </Button>
                  </div>
                </>
              )}

              {status === 'success' && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    You can now submit loan requests and access all features.
                  </p>
                  <Button onClick={() => navigate('/dashboard')} className="w-full bg-slate-700 hover:bg-slate-800 text-white">
                    Continue to Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Need help? <Link to="/contact" className="text-primary hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

