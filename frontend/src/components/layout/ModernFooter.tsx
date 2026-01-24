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
    <footer className="relative bg-background px-6 py-12 border-t border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row items-end justify-between">
          {/* Logo - Bottom Left */}
          <Link to="/" className="mb-4 md:mb-0">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-slate-800">RIVERSIDE</span>
              <span className="text-lg text-slate-600">PARK CAPITAL</span>
            </div>
          </Link>

          {/* Copyright - Bottom Right */}
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()} Riverside Park Capital. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
