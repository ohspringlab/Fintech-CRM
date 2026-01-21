import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { ModernFooter } from "@/components/layout/ModernFooter";
import { 
  ArrowRight, 
  Mail, 
  Phone, 
  MapPin,
  Send,
  CheckCircle2,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import { contactApi } from "@/lib/api";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    loanType: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await contactApi.submit(formData);

      toast.success("Thank you! Your message has been sent. We'll get back to you soon.");
      setIsSubmitted(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        loanType: ""
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="light" />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/18 via-background to-background" />
        <div className="absolute -left-24 -top-20 w-96 h-96 bg-gradient-to-br from-primary/16 via-secondary/12 to-surface/32 blur-3xl rounded-full" />
        <div className="absolute right-0 top-12 w-80 h-80 bg-gradient-to-br from-primary/12 via-surface/28 to-secondary/14 blur-3xl rounded-full" />
        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/70 backdrop-blur border border-border text-sm text-muted-foreground mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              We're here to help
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold mb-6 text-foreground">
              Contact Us
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have questions? Get in touch with our team and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-display font-semibold">Send us a Message</CardTitle>
                  <CardDescription>
                    Fill out the form below and we'll get back to you within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSubmitted ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                      <p className="text-muted-foreground mb-6">
                        Thank you for contacting us. We'll respond to your inquiry as soon as possible.
                      </p>
                      <Button onClick={() => setIsSubmitted(false)} variant="outline">
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="John Doe"
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="john@example.com"
                        />
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="(555) 123-4567"
                        />
                      </div>

                      <div>
                        <label htmlFor="loanType" className="block text-sm font-medium mb-2">
                          Interested In
                        </label>
                        <select
                          id="loanType"
                          name="loanType"
                          value={formData.loanType}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select a loan type</option>
                          <option value="fix-flip">Fix & Flip</option>
                          <option value="ground-up">Ground-Up Construction</option>
                          <option value="dscr">DSCR / Investor Rental</option>
                          <option value="bridge">Bridge Loans</option>
                          <option value="heloc">Investment HELOC</option>
                          <option value="multifamily">Multifamily</option>
                          <option value="commercial">Commercial</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="subject" className="block text-sm font-medium mb-2">
                          Subject *
                        </label>
                        <input
                          type="text"
                          id="subject"
                          name="subject"
                          required
                          value={formData.subject}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="How can we help?"
                        />
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-medium mb-2">
                          Message *
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={6}
                          value={formData.message}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          placeholder="Tell us about your project or question..."
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full group bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          "Sending..."
                        ) : (
                          <>
                            Send Message
                            <Send className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display font-semibold">Get in Touch</CardTitle>
                  <CardDescription>
                    Prefer to reach out directly? Use the contact information below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <a 
                        href="mailto:info@rpc-lending.com" 
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        info@rpc-lending.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Phone</h3>
                      <a 
                        href="tel:+18005551234" 
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        (800) 555-1234
                      </a>
                      <p className="text-sm text-muted-foreground mt-1">
                        Monday - Friday, 9:00 AM - 6:00 PM EST
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Office</h3>
                      <p className="text-muted-foreground">
                        123 Financial District<br />
                        New York, NY 10004<br />
                        United States
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary/35 via-secondary/20 to-primary/30 text-foreground border-0">
                <CardContent className="p-6 text-white">
                  <div className="flex items-start gap-4">
                    <Building2 className="w-8 h-8 text-white flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Ready to Get Started?</h3>
                      <p className="text-white/80 text-sm mb-4">
                        Apply for a loan today and get pre-approved in minutes.
                      </p>
                      <Link to="/register">
                        <Button size="sm" className="group bg-white text-secondary hover:bg-white/90">
                          Apply Now
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <ModernFooter />
    </div>
  );
}

