import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, Send, Mail } from "lucide-react";

export function ReachoutView() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-6">
      <Card className="relative bg-gradient-to-br from-white/95 via-blue-50/40 to-indigo-50/30 backdrop-blur-xl border-slate-200/50 shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="relative z-10">
          <CardTitle className="text-2xl font-display font-semibold text-slate-900 flex items-center gap-2">
            <ArrowRight className="w-6 h-6 text-blue-600" />
            Reachout
          </CardTitle>
          <CardDescription className="text-slate-600 mt-1">
            Send marketing emails and communications
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="relative bg-white/95 backdrop-blur-sm border-slate-200/50 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Compose Message</CardTitle>
          <CardDescription>Create and send outreach campaigns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={10}
            />
          </div>
          <div className="flex gap-2">
            <Button className="bg-blue-600 text-white">
              <Send className="w-4 h-4 mr-2" />
              Send Campaign
            </Button>
            <Button variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

