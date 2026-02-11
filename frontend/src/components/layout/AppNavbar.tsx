import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Building2, Bell, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface AppNavbarProps {
  variant?: "borrower" | "operations" | "admin";
  notifications?: any[];
  unreadCount?: number;
}

export function AppNavbar({ variant = "borrower", notifications = [], unreadCount = 0 }: AppNavbarProps) {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState(0);

  // Get profile image URL from user object
  useEffect(() => {
    if (user) {
      const imageUrl = user.image_url || user.profile_image_url;
      console.log('AppNavbar: User object changed, imageUrl:', imageUrl);
      if (imageUrl) {
        // Construct full URL if needed
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
        const fullUrl = imageUrl.startsWith('http') 
          ? imageUrl 
          : `${baseUrl}${imageUrl}`;
        // Add cache-busting with timestamp
        const separator = fullUrl.includes('?') ? '&' : '?';
        const urlWithCache = `${fullUrl}${separator}t=${Date.now()}`;
        console.log('AppNavbar: Setting profile image URL from user object:', urlWithCache);
        setProfileImageUrl(urlWithCache);
        // Update avatar key to force re-render
        setAvatarKey(prev => prev + 1);
      } else {
        console.log('AppNavbar: No image URL in user object');
        setProfileImageUrl(null);
        setAvatarKey(prev => prev + 1);
      }
    } else {
      setProfileImageUrl(null);
    }
  }, [user]);

  // Listen for profile image updates
  useEffect(() => {
    const handleImageUpdate = async (event: CustomEvent) => {
      console.log('AppNavbar: profileImageUpdated event received', event.detail);
      if (event.detail?.userId === user?.id) {
        // Force refresh user object first to get latest data
        try {
          await refreshUser();
        } catch (error) {
          console.error('Failed to refresh user:', error);
        }
        
        // Also update immediately from event data
        const imageUrl = event.detail.fullImageUrl || event.detail.imageUrl;
        if (imageUrl) {
          const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
          const fullUrl = imageUrl.startsWith('http') 
            ? imageUrl 
            : `${baseUrl}${imageUrl}`;
          // Add cache-busting with timestamp
          const separator = fullUrl.includes('?') ? '&' : '?';
          const urlWithCache = `${fullUrl}${separator}t=${Date.now()}`;
          console.log('AppNavbar: Setting profile image URL:', urlWithCache);
          setProfileImageUrl(urlWithCache);
          // Force avatar re-render by updating key
          setAvatarKey(prev => prev + 1);
        }
      }
    };

    window.addEventListener('profileImageUpdated', handleImageUpdate as EventListener);
    return () => {
      window.removeEventListener('profileImageUpdated', handleImageUpdate as EventListener);
    };
  }, [user, refreshUser]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isOperations = variant === "operations";
  const isAdmin = variant === "admin";

  return (
    <header className={
      isOperations || isAdmin 
        ? "bg-white/98 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm" 
        : "bg-white/98 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50 shadow-elegant"
    }>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 group">
              {/* Logo Icon */}
              <img 
                src="/logo-icon.png" 
                alt="RPC Logo" 
                className={
                  isOperations || isAdmin
                    ? "h-8 w-auto shadow-sm group-hover:shadow transition-all duration-300 group-hover:scale-105"
                    : "h-8 w-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110"
                }
              />
            </Link>
            {(isOperations || isAdmin) && (
              <Badge variant="outline" className="border-slate-200 text-muted-foreground">
                {isAdmin ? "Admin Portal" : "Operations Portal"}
              </Badge>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Notifications */}
                {!isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={
                        isOperations
                          ? "relative p-2 rounded-lg hover:bg-slate-50 transition-colors text-foreground"
                          : "relative p-2 rounded-lg hover:bg-muted transition-colors"
                      }>
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                          <span className={
                            isOperations
                              ? "absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"
                              : "absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"
                          } />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {notifications.length > 0 ? (
                        notifications.slice(0, 5).map((notif) => (
                          <DropdownMenuItem key={notif.id} className="flex flex-col items-start p-3 cursor-pointer">
                            <div className="flex items-center gap-2 w-full">
                              <span className="font-medium">{notif.title}</span>
                              {!notif.read && <Badge variant="default" className="ml-auto text-xs">New</Badge>}
                            </div>
                            <span className="text-sm text-muted-foreground">{notif.message}</span>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No notifications
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={
                      isOperations || isAdmin
                        ? "flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors text-foreground"
                        : "flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
                    }>
                      <Avatar className="w-8 h-8" key={`avatar-${user?.id}-${avatarKey}-${profileImageUrl || 'no-image'}`}>
                        {profileImageUrl && (
                          <AvatarImage 
                            key={`img-${profileImageUrl}-${avatarKey}`}
                            src={profileImageUrl}
                            alt={user.fullName || 'User'}
                            onError={() => {
                              console.error('Failed to load profile image:', profileImageUrl);
                              setProfileImageUrl(null);
                            }}
                          />
                        )}
                        <AvatarFallback className={
                          isOperations || isAdmin
                            ? "bg-slate-700 text-white text-sm font-semibold"
                            : "bg-slate-800 text-white text-sm"
                        }>
                          {getInitials(user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "hidden md:block text-sm font-medium",
                        isOperations || isAdmin ? "text-foreground" : ""
                      )}>{user.fullName}</span>
                      {(isOperations || isAdmin) && <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      {isAdmin ? "Admin Account" : isOperations ? "Operations Team" : "My Account"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        // Navigate to dashboard profile tab
                        if (isAdmin) {
                          navigate('/admin');
                        } else if (isOperations) {
                          navigate('/ops');
                        } else {
                          navigate('/dashboard?tab=profile');
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-2" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        // Navigate to dashboard settings (or profile for now)
                        if (isAdmin) {
                          navigate('/admin');
                        } else if (isOperations) {
                          navigate('/ops');
                        } else {
                          navigate('/dashboard?tab=profile');
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <Settings className="w-4 h-4 mr-2" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="gold" size="sm">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
