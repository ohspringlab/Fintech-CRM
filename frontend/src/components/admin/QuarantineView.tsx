import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  AlertTriangle,
  Search,
  RefreshCw,
  Calendar,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Shield,
} from "lucide-react";

interface QuarantinedLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  reason: string;
  quarantinedAt: string;
  quarantinedBy: string;
}

export function QuarantineView() {
  const [leads, setLeads] = useState<QuarantinedLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call when backend is ready
      const mockLeads: QuarantinedLead[] = [
        {
          id: '1',
          name: 'Suspicious User',
          email: 'spam@example.com',
          phone: '(555) 999-9999',
          reason: 'Spam submission detected',
          quarantinedAt: new Date().toISOString(),
          quarantinedBy: 'System'
        }
      ];
      
      let filteredLeads = mockLeads;
      if (searchQuery) {
        filteredLeads = filteredLeads.filter(lead => 
          lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setLeads(filteredLeads);
    } catch (error) {
      console.error('Failed to load quarantined leads:', error);
      toast.error('Failed to load quarantined leads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelease = async (id: string) => {
    try {
      // TODO: Implement release API call when backend is ready
      // For now, remove from local state
      setLeads(prev => prev.filter(lead => lead.id !== id));
      toast.success('Lead released from quarantine');
    } catch (error) {
      console.error('Failed to release lead:', error);
      toast.error('Failed to release lead');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this lead?')) return;
    try {
      // TODO: Implement delete API call when backend is ready
      // For now, remove from local state
      setLeads(prev => prev.filter(lead => lead.id !== id));
      toast.success('Lead deleted');
    } catch (error) {
      console.error('Failed to delete lead:', error);
      toast.error('Failed to delete lead');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative bg-gradient-to-br from-white/95 via-red-50/40 to-orange-50/30 backdrop-blur-xl border-red-200/50 shadow-xl rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-100/10 via-transparent to-orange-100/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-200/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-red-600" />
                Quarantine
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Review and manage quarantined leads
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-sm px-3 py-1">
                {leads.length} Quarantined
              </Badge>
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
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
              <Input
                placeholder="Search quarantined leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm border-slate-300/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quarantined Leads Table */}
      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="relative z-10">
          <CardTitle className="text-lg font-display font-semibold text-slate-900">Quarantined Leads</CardTitle>
          <CardDescription className="text-slate-600">{leads.length} lead{leads.length !== 1 ? 's' : ''} in quarantine</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No quarantined leads</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Contact</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Quarantined By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-red-100 text-red-700 text-xs font-semibold">
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
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-slate-700">{lead.reason}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-700">{lead.quarantinedBy}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(lead.quarantinedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleRelease(lead.id)}
                            className="text-green-700 border-green-200 hover:bg-green-50"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Release
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDelete(lead.id)}
                            className="text-red-700 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
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

