import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatarImage } from "@/components/user/UserAvatarImage";
import { opsApi } from "@/lib/api";
import { toast } from "sonner";
import {
  Users,
  Search,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Eye,
  FileText,
} from "lucide-react";

export function PeopleView() {
  const navigate = useNavigate();
  const [people, setPeople] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Fetch from pipeline to get borrowers
      const pipelineRes = await opsApi.getPipeline();
      
      // Group loans by user_id and count them
      const peopleMap = new Map<string, {
        id: string;
        name: string;
        email: string;
        phone?: string;
        loansCount: number;
      }>();
      
      pipelineRes.loans.forEach(loan => {
        if (!loan.user_id) return;
        
        if (peopleMap.has(loan.user_id)) {
          const person = peopleMap.get(loan.user_id)!;
          person.loansCount += 1;
        } else {
          peopleMap.set(loan.user_id, {
            id: loan.user_id,
            name: loan.borrower_name || 'Unknown',
            email: loan.borrower_email || '',
            phone: loan.borrower_phone,
            loansCount: 1
          });
        }
      });
      
      let filteredPeople = Array.from(peopleMap.values());
      
      // Apply search filter
      if (searchQuery) {
        filteredPeople = filteredPeople.filter(person => 
          person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setPeople(filteredPeople);
    } catch (error) {
      console.error('Failed to load people:', error);
      toast.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  return (
    <div className="space-y-6">
      <Card className="relative bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border-slate-200/50 shadow-xl rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/10 via-transparent to-indigo-100/10" />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                People
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Manage all contacts and borrowers
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} className="bg-white/80 backdrop-blur-sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
        <CardContent className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
          <CardDescription>{people.length} contact{people.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
          ) : people.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No contacts found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Loans</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <UserAvatarImage userId={person.id} />
                          <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{person.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {person.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {person.email}
                          </div>
                        )}
                        {person.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {person.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{person.loansCount || 0} loan{person.loansCount !== 1 ? 's' : ''}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          // Navigate to operations dashboard filtered by borrower
                          navigate(`/ops?borrower=${person.id}`);
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

