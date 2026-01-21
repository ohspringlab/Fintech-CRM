import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  UserCheck,
  Briefcase,
  DollarSign,
  CheckCircle2,
  Globe,
  BookOpen,
  ChevronDown,
  ArrowRight,
  Link2,
  PenTool,
  FolderOpen,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdminSidebar() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className="border-r border-slate-200 bg-white text-foreground">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-slate-700" />
          </div>
          <span className="font-display font-semibold text-lg text-foreground">RPC</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/admin")}
                  className={cn(
                    "text-muted-foreground hover:text-foreground hover:bg-slate-50",
                    isActive("/admin") && "bg-slate-100 text-foreground font-medium"
                  )}
                >
                  <Link to="/admin">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="text-muted-foreground hover:text-foreground hover:bg-slate-50"
                >
                  <Link to="/admin/deals">
                    <Briefcase className="w-4 h-4" />
                    <span>Deals CRM</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="text-muted-foreground hover:text-foreground hover:bg-slate-50"
                >
                  <Link to="/admin/reports">
                    <BarChart3 className="w-4 h-4" />
                    <span>Reports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroupLabel>
              <CollapsibleTrigger className="text-muted-foreground hover:text-foreground cursor-pointer w-full flex items-center justify-between font-semibold text-xs uppercase tracking-wider">
                <span>LEADS</span>
                <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isActive("/admin/leads/submissions")}
                      className="text-muted-foreground hover:text-foreground hover:bg-slate-50"
                    >
                      <Link to="/admin/leads/submissions">
                        <span>Lead Submissions</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isActive("/admin/leads/quarantine")}
                      className="text-muted-foreground hover:text-foreground hover:bg-slate-50"
                    >
                      <Link to="/admin/leads/quarantine" className="flex items-center justify-between w-full">
                        <span>Quarantine</span>
                        <Badge variant="destructive" className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs">
                          1
                        </Badge>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroupLabel>
              <CollapsibleTrigger className="text-muted-foreground hover:text-foreground cursor-pointer w-full flex items-center justify-between font-semibold text-xs uppercase tracking-wider">
                <span>CONTACTS</span>
                <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton asChild isActive={isActive("/admin/contacts/people")} className="text-muted-foreground hover:text-foreground hover:bg-slate-50">
                      <Link to="/admin/contacts/people">
                        <Users className="w-4 h-4" />
                        <span>People</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton asChild isActive={isActive("/admin/contacts/agents")} className="text-muted-foreground hover:text-foreground hover:bg-slate-50">
                      <Link to="/admin/contacts/agents">
                        <UserCheck className="w-4 h-4" />
                        <span>Agents</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton asChild isActive={isActive("/admin/contacts/companies")} className="text-muted-foreground hover:text-foreground hover:bg-slate-50">
                      <Link to="/admin/contacts/companies">
                        <Building2 className="w-4 h-4" />
                        <span>Companies</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroupLabel>
              <CollapsibleTrigger className="text-muted-foreground hover:text-foreground cursor-pointer w-full flex items-center justify-between font-semibold text-xs uppercase tracking-wider">
                <span>PRICING</span>
                <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton asChild isActive={isActive("/admin/pricing/loans")} className="text-muted-foreground hover:text-foreground hover:bg-slate-50">
                      <Link to="/admin/pricing/loans">
                        <DollarSign className="w-4 h-4" />
                        <span>Loan Pricing</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton asChild isActive={isActive("/admin/pricing/approval")} className="text-muted-foreground hover:text-foreground hover:bg-slate-50">
                      <Link to="/admin/pricing/approval">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Quote Approval</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroupLabel>
              <CollapsibleTrigger className="text-muted-foreground hover:text-foreground cursor-pointer w-full flex items-center justify-between font-semibold text-xs uppercase tracking-wider">
                <span>MARKETING</span>
                <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing/landing-pages")} className="text-muted-foreground hover:text-foreground hover:bg-slate-50">
                      <Link to="/admin/marketing/landing-pages">
                        <Globe className="w-4 h-4" />
                        <span>Landing Pages</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing/reachout")} className="text-muted-foreground hover:text-foreground hover:bg-slate-50">
                      <Link to="/admin/marketing/reachout">
                        <ArrowRight className="w-4 h-4" />
                        <span>Reachout</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton asChild isActive={isActive("/admin/marketing/short-links")} className="text-muted-foreground hover:text-foreground hover:bg-slate-50">
                      <Link to="/admin/marketing/short-links">
                        <Link2 className="w-4 h-4" />
                        <span>Short Links</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroupLabel>
              <CollapsibleTrigger className="text-muted-foreground hover:text-foreground cursor-pointer w-full flex items-center justify-between font-semibold text-xs uppercase tracking-wider">
                <span>CONTENT</span>
                <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton asChild isActive={isActive("/admin/content/ai-articles")} className="text-muted-foreground hover:text-foreground hover:bg-slate-50">
                      <Link to="/admin/content/ai-articles">
                        <PenTool className="w-4 h-4" />
                        <span>AI Articles</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton asChild isActive={isActive("/admin/content/resources")} className="text-muted-foreground hover:text-foreground hover:bg-slate-50">
                      <Link to="/admin/content/resources">
                        <FolderOpen className="w-4 h-4" />
                        <span>Resources</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSubButton asChild isActive={isActive("/admin/content/case-studies")} className="text-muted-foreground hover:text-foreground hover:bg-slate-50">
                      <Link to="/admin/content/case-studies">
                        <FileText className="w-4 h-4" />
                        <span>Case Studies</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-200">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="text-muted-foreground hover:text-foreground hover:bg-slate-50"
            >
              <Link to="/" target="_blank">
                <Globe className="w-4 h-4" />
                <span>View Website</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="text-muted-foreground hover:text-foreground hover:bg-slate-50"
            >
              <Link to="/admin/manual">
                <BookOpen className="w-4 h-4" />
                <span>User Manual</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

