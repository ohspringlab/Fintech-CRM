import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function LandingPagesView() {
  const navigate = useNavigate();
  const [pages] = useState([
    { id: '1', name: 'Residential Loans', url: '/residential', status: 'active', views: 1250 },
    { id: '2', name: 'Commercial Loans', url: '/commercial', status: 'active', views: 890 },
  ]);

  const handleCreate = () => {
    // TODO: Navigate to create landing page form when route is created
    toast.info('Create Page', {
      description: 'Landing page creation form will be available soon',
    });
    // Alternative: navigate(`/admin/marketing/landing-pages/create`);
  };

  const handleView = (page: typeof pages[0]) => {
    // Open landing page in new tab
    const fullUrl = `${window.location.origin}${page.url}`;
    window.open(fullUrl, '_blank');
    toast.info(`Opening ${page.name}`, {
      description: `Viewing landing page: ${page.url}`,
    });
  };

  const handleEdit = (page: typeof pages[0]) => {
    // TODO: Navigate to edit landing page form when route is created
    toast.info(`Edit ${page.name}`, {
      description: `Editing landing page: ${page.url}`,
    });
    // Alternative: navigate(`/admin/marketing/landing-pages/${page.id}/edit`);
  };

  return (
    <div className="space-y-6">
      <Card className="relative bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border-slate-200/50 shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display font-semibold text-slate-900 flex items-center gap-2">
                <Globe className="w-6 h-6 text-blue-600" />
                Landing Pages
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Manage marketing landing pages
              </CardDescription>
            </div>
            <Button size="sm" className="bg-blue-600 text-white" onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Page
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pages.map((page) => (
          <Card key={page.id} className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{page.name}</CardTitle>
                <Badge className={page.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {page.status}
                </Badge>
              </div>
              <CardDescription>{page.url}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Views</span>
                  <span className="font-semibold">{page.views.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleView(page)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEdit(page)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

