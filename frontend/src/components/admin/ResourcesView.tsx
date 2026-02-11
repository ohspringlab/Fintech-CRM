import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Plus, Download, Edit, Trash2, FileText } from "lucide-react";

export function ResourcesView() {
  const [resources] = useState([
    { id: '1', name: 'Loan Application Checklist', type: 'PDF', downloads: 450, size: '2.3 MB' },
    { id: '2', name: 'Property Valuation Guide', type: 'PDF', downloads: 320, size: '1.8 MB' },
  ]);

  return (
    <div className="space-y-6">
      <Card className="relative bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border-slate-200/50 shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display font-semibold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-6 h-6 text-blue-600" />
                Resources
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Manage downloadable resources and documents
              </CardDescription>
            </div>
            <Button size="sm" className="bg-blue-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Upload Resource
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource) => (
          <Card key={resource.id} className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{resource.name}</CardTitle>
                  <CardDescription>{resource.type} • {resource.size}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Downloads</span>
                  <Badge variant="outline">{resource.downloads}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4" />
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

