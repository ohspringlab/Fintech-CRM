import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Bell, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { authApi } from "@/lib/api";

interface AppNavbarProps {
  variant?: "borrower" | "operations" | "admin";
  notifications?: any[];
  unreadCount?: number;
}

export function AppNavbar({ variant = "borrower", notifications = [], unreadCount = 0 }: AppNavbarProps) {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      if (clerkUser) {
        try {
          const response = await authApi.me();
          setUserRole(response.user.role);
        } catch (error) {
          console.error('Failed to fetch user role:', error);
        }
      }
    };
    fetchRole();
  }, [clerkUser]);

  const handleLogout = async () => {
    await signOut();
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
              {/* Logo - Add logo.png to public folder, falls back to icon */}
              <div className={
                isOperations || isAdmin
                  ? "w-14 h-14 rounded-sm bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm group-hover:shadow transition-all duration-300 group-hover:scale-105"
                  : "w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110"
              }>
                <img 
                  src="/logo.png" 
                  alt="RPC Logo" 
                  className="w-full h-full object-contain p-2 hidden"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  onLoad={(e) => { e.currentTarget.classList.remove('hidden'); }}
                />
                <Building2 className={
                  isOperations || isAdmin
                    ? "w-8 h-8 text-slate-700 transition-transform duration-300 group-hover:scale-110"
                    : "w-8 h-8 text-slate-200 transition-transform duration-300 group-hover:scale-110"
                } />
              </div>
              <span className={
                isOperations || isAdmin
                  ? "font-display text-2xl font-semibold text-foreground group-hover:text-foreground/80 transition-colors duration-300"
                  : "font-display text-2xl font-bold text-foreground group-hover:text-foreground/80 transition-colors duration-300"
              }>
                RPC
              </span>
            </Link>
            {(isOperations || isAdmin) && (
              <Badge variant="outline" className="border-slate-200 text-muted-foreground">
                {isAdmin ? "Admin Portal" : "Operations Portal"}
              </Badge>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {clerkUser ? (
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
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={
                          isOperations || isAdmin
                            ? "bg-slate-700 text-white text-sm font-semibold"
                            : "bg-slate-800 text-white text-sm"
                        }>
                          {getInitials(clerkUser.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "hidden md:block text-sm font-medium",
                        isOperations || isAdmin ? "text-foreground" : ""
                      )}>{clerkUser.fullName}</span>
                      {(isOperations || isAdmin) && <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      {isAdmin ? "Admin Account" : isOperations ? "Operations Team" : "My Account"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="w-4 h-4 mr-2" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
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
