import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link2, Plus, Copy, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ShortLinksView() {
  const [links, setLinks] = useState([
    { id: '1', short: 'rpc.co/abc123', original: 'https://example.com/residential-loans', clicks: 245, createdAt: '2026-01-15' },
    { id: '2', short: 'rpc.co/xyz789', original: 'https://example.com/commercial-loans', clicks: 189, createdAt: '2026-01-10' },
  ]);

  const handleCopy = (short: string) => {
    navigator.clipboard.writeText(`https://${short}`);
    toast.success('Link copied to clipboard');
  };

  const handleView = (link: any) => {
    // TODO: Navigate to analytics page or open in new tab
    window.open(`https://${link.short}`, '_blank');
    toast.info('Opening link in new tab');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this short link?')) return;
    // TODO: Implement delete API call when backend is ready
    setLinks(prev => prev.filter(link => link.id !== id));
    toast.success('Short link deleted');
  };

  return (
    <div className="space-y-6">
      <Card className="relative bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border-slate-200/50 shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display font-semibold text-slate-900 flex items-center gap-2">
                <Link2 className="w-6 h-6 text-blue-600" />
                Short Links
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Create and manage shortened URLs for tracking
              </CardDescription>
            </div>
            <Button size="sm" className="bg-blue-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Link
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>All Short Links</CardTitle>
          <CardDescription>{links.length} link{links.length !== 1 ? 's' : ''} created</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Short URL</TableHead>
                <TableHead>Original URL</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">https://{link.short}</code>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(link.short)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground max-w-xs truncate">{link.original}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{link.clicks} clicks</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{link.createdAt}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleView(link)} title="View link">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(link.id)} title="Delete link">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

