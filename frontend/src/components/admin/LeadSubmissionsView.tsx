import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatarImage } from "@/components/user/UserAvatarImage";
import { contactApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FileText,
  Search,
  RefreshCw,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  propertyType?: string;
  loanAmount?: number;
  createdAt: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
}

export function LeadSubmissionsView() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call when backend is ready
      // For now, using mock data
      const mockLeads: Lead[] = [
        {
          id: '1',
          name: 'John Smith',
          email: 'john.smith@email.com',
          phone: '(555) 123-4567',
          message: 'Interested in commercial property loan',
          propertyType: 'Commercial',
          loanAmount: 2500000,
          createdAt: new Date().toISOString(),
          status: 'new'
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah.j@email.com',
          phone: '(555) 234-5678',
          message: 'Looking for residential investment property financing',
          propertyType: 'Residential',
          loanAmount: 750000,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'contacted'
        }
      ];
      
      let filteredLeads = mockLeads;
      if (searchQuery) {
        filteredLeads = filteredLeads.filter(lead => 
          lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      if (statusFilter !== 'all') {
        filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
      }
      
      setLeads(filteredLeads);
    } catch (error) {
      console.error('Failed to load leads:', error);
      toast.error('Failed to load lead submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      new: { label: 'New', className: 'bg-blue-100 text-blue-700' },
      contacted: { label: 'Contacted', className: 'bg-yellow-100 text-yellow-700' },
      qualified: { label: 'Qualified', className: 'bg-green-100 text-green-700' },
      converted: { label: 'Converted', className: 'bg-emerald-100 text-emerald-700' },
      rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return <Badge className={cn("text-xs", config.className)}>{config.label}</Badge>;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border-slate-200/50 shadow-xl rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/10 via-transparent to-indigo-100/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Lead Submissions
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Manage and track all lead submissions
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="bg-white/80 backdrop-blur-sm border-slate-300/50 shadow-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <CardContent className="relative z-10 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm border-slate-300/50"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/80 backdrop-blur-sm border-slate-300/50">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        <CardHeader className="relative z-10">
          <CardTitle className="text-lg font-display font-semibold text-slate-900">All Leads</CardTitle>
          <CardDescription className="text-slate-600">{leads.length} lead{leads.length !== 1 ? 's' : ''} found</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No leads found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Contact</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Property Type</TableHead>
                    <TableHead>Loan Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-slate-700 text-white text-xs font-semibold">
                              {getInitials(lead.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-900">{lead.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </div>
                            {lead.phone && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-700 max-w-xs truncate">{lead.message || 'No message'}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-700">{lead.propertyType || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-slate-900">
                          {lead.loanAmount ? formatCurrency(lead.loanAmount) : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(lead.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            // TODO: Navigate to lead detail page when route is created
                            // For now, show lead details in a toast/alert
                            toast.info(`Viewing lead: ${lead.name}`, {
                              description: `${lead.email} - ${lead.message || 'No message'}`,
                            });
                            // Alternative: navigate to operations dashboard filtered by lead
                            // navigate(`/ops?lead=${lead.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

