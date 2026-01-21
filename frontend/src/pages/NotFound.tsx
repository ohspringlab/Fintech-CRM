import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-blue-50/30 to-indigo-50/20">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold font-serif">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-slate-600 underline hover:text-slate-700">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
