import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Eye, Edit, Trash2 } from "lucide-react";

export function CaseStudiesView() {
  const [caseStudies] = useState([
    { id: '1', title: 'Multi-Family Property Success Story', status: 'published', views: 890, createdAt: '2026-01-15' },
    { id: '2', title: 'Commercial Office Building Financing', status: 'draft', views: 0, createdAt: '2026-01-20' },
  ]);

  return (
    <div className="space-y-6">
      <Card className="relative bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border-slate-200/50 shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Case Studies
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Showcase successful loan projects and client stories
              </CardDescription>
            </div>
            <Button size="sm" className="bg-blue-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Case Study
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {caseStudies.map((study) => (
          <Card key={study.id} className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{study.title}</CardTitle>
                <Badge className={study.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                  {study.status}
                </Badge>
              </div>
              <CardDescription>{study.createdAt}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Views</span>
                  <span className="font-semibold">{study.views.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
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

