import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Clerk sign-in page
    navigate("/clerk-signin", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-blue-50/30 to-indigo-50/20">
      <div className="text-foreground">Redirecting to sign in...</div>
    </div>
  );
}
