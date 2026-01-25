import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Building2, Menu, X, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { authApi } from "@/lib/api";

interface NavbarProps {
  variant?: "light" | "dark";
}

export function Navbar({ variant = "light" }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const location = useLocation();
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const fetchRole = async () => {
      // Only fetch role if user is signed in, Clerk is loaded, and we have a token
      if (isSignedIn && isLoaded) {
        try {
          // Check if we actually have a token before making the API call
          const token = await getToken();
          if (!token) {
            setUserRole(null);
            return;
          }
          
          const response = await authApi.me();
          setUserRole(response.user.role);
        } catch (error: any) {
          // Silently handle 401 errors (user not authenticated)
          if (error?.status === 401 || error?.code === 'AUTH_REQUIRED') {
            setUserRole(null);
            return;
          }
          // Only log non-401 errors
          console.error('Failed to fetch user role:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    };
    
    // Only fetch if Clerk is loaded
    if (isLoaded) {
    fetchRole();
    }
  }, [isSignedIn, isLoaded, getToken]);

  useEffect(() => {
    const handleScroll = () => {
      // Hide navbar after scrolling past 80vh (roughly the hero section)
      if (window.scrollY > window.innerHeight * 0.8) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') as "light" | "dark" | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    
    // Apply dark class to html and body elements for Tailwind dark mode
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply dark class to html element for Tailwind dark mode
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  };

  const isLight = variant === "light";

  const navLinks = [
    { href: "/loan-programs", label: "Capital Programs" },
    { href: "/about", label: "Firm" },
    { href: "/contact", label: "Submit a Request" },
  ];

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
      !isVisible && "opacity-0 pointer-events-none -translate-y-full",
      isLight
        ? "bg-white/95 backdrop-blur-xl border-b border-border/60 shadow-sm"
        : "bg-transparent backdrop-blur-sm"
    )}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            {/* Logo Icon */}
            <img 
              src="/logo-icon.png" 
              alt="RPC Logo" 
              className={cn(
                "h-12 w-auto shadow-sm transition-all duration-300 group-hover:scale-110",
                isLight ? "shadow-md" : "shadow-lg"
              )}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "text-sm font-medium transition-all duration-300 relative",
                  "hover:-translate-y-0.5",
                  isLight
                    ? "text-[#4b5563] hover:text-[#111827]"
                    : "text-white/80 hover:text-white",
                  location.pathname === link.href && (isLight ? "text-[#111827] font-semibold" : "text-white font-semibold"),
                  location.pathname === link.href && "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#c4b5fd] after:rounded-full"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isLight 
                  ? "text-slate-400 hover:text-slate-600 hover:bg-slate-100" 
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {isSignedIn ? (
              <Link 
                to={
                  userRole === 'admin' ? '/admin' 
                  : userRole === 'operations' ? '/ops' 
                  : userRole === 'broker' ? '/broker' 
                  : userRole === 'investor' ? '/investor' 
                  : '/dashboard'
                }
                onClick={(e) => {
                  // Ensure navigation works even if role is not yet loaded
                  if (!userRole && isLoaded) {
                    // Allow navigation to dashboard - ProtectedRoute will handle role check
                  }
                }}
              >
                <Button size="sm" className="bg-slate-800 hover:bg-slate-900 text-white font-semibold">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/clerk-signin">
                  <span className={cn(
                    "text-sm font-medium cursor-pointer transition-colors",
                    isLight 
                      ? "text-slate-700 hover:text-slate-900" 
                      : "text-white/80 hover:text-white"
                  )}>
                    Log In
                  </span>
                </Link>
                <Link to="/clerk-signup">
                  <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-md">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              "md:hidden p-2 rounded-lg",
              isLight ? "text-[#0f0518]" : "text-white"
            )}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className={cn(
          "md:hidden absolute top-full left-0 right-0 p-4",
          isLight ? "bg-white shadow-lg" : "bg-[#1b0d35]/95 backdrop-blur-md"
        )}>
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isLight
                    ? "text-[#4b5563] hover:bg-gray-50"
                    : "text-white/80 hover:bg-white/10"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-border my-2 pt-2 flex flex-col gap-2">
              {isSignedIn ? (
                <Link 
                  to={
                    userRole === 'admin' ? '/admin' 
                    : userRole === 'operations' ? '/ops' 
                    : userRole === 'broker' ? '/broker' 
                    : userRole === 'investor' ? '/investor' 
                    : '/dashboard'
                  } 
                  onClick={() => setMobileOpen(false)}
                >
                  <Button className="w-full bg-slate-800 hover:bg-slate-900 text-white">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full">Log In</Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-slate-800 hover:bg-slate-900 text-white">Sign Up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
