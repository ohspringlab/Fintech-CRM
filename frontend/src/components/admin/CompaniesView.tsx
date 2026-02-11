import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Building2,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Plus,
  Eye,
  MapPin,
} from "lucide-react";

export function CompaniesView() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      const mockCompanies = [
        {
          id: '1',
          name: 'ABC Real Estate Group',
          email: 'contact@abcrealestate.com',
          phone: '(555) 333-4444',
          address: '123 Main St, City, State',
          type: 'Real Estate',
          contacts: 3,
          deals: 12
        }
      ];
      setCompanies(mockCompanies);
    } catch (error) {
      console.error('Failed to load companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="relative bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border-slate-200/50 shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                Companies
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Manage company contacts and partnerships
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData} className="bg-white/80 backdrop-blur-sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" className="bg-blue-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
        <CardContent className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
          <CardDescription>{companies.length} compan{companies.length !== 1 ? 'ies' : 'y'}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No companies found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Deals</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <span className="font-medium">{company.name}</span>
                          {company.address && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3" />
                              {company.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {company.email}
                        </div>
                        {company.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {company.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{company.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{company.contacts || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{company.deals || 0}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/admin/contacts/companies/${company.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

