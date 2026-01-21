import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const footerLinks = {
  company: [
    { label: "About Us", href: "/about" },
    { label: "Loan Programs", href: "/loan-programs" },
    { label: "Contact", href: "/contact" },
    { label: "FAQ", href: "/faq" },
  ],
  loanTypes: [
    { label: "Fix & Flip", href: "/loan-programs#fix-flip" },
    { label: "Ground-Up Construction", href: "/loan-programs#construction" },
    { label: "Bridge Loans", href: "/loan-programs#bridge" },
    { label: "DSCR Loans", href: "/loan-programs#dscr" },
  ],
  resources: [
    { label: "Blog", href: "/blog" },
    { label: "Resources", href: "/resources" },
    { label: "Calculators", href: "/calculators" },
    { label: "Apply Now", href: "/register" },
  ],
};

export function ModernFooter() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter signup
    console.log("Newsletter signup:", email);
    setEmail("");
  };

  return (
    <footer className="relative bg-background px-6 py-24 overflow-hidden border-t border-border">
      {/* Animated gradient blob */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-400/20 via-slate-300/15 to-slate-600/10 opacity-40 blur-3xl rounded-full animate-float" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-16">
          {/* Brand and Newsletter */}
          <div className="space-y-8">
            {/* Logo */}
            <div>
              <Link to="/" className="inline-flex items-center gap-3 group">
                <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Building2 className="w-7 h-7 text-slate-200" />
                </div>
                <span className="font-serif text-5xl md:text-6xl font-bold text-foreground">
                  RPC
                </span>
              </Link>
              <p className="text-muted-foreground mt-4 max-w-md text-lg">
                Your trusted partner for real estate financing. Fast approvals, competitive rates, and exceptional service.
              </p>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Stay Updated
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Get the latest loan programs and industry insights delivered to your inbox.
              </p>
              
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 lg:gap-12">
            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Loan Types */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Loan Types</h4>
              <ul className="space-y-3">
                {footerLinks.loanTypes.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Resources</h4>
              <ul className="space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
