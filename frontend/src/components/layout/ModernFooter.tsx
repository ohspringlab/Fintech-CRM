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
    <footer className="relative bg-white px-6 py-12 border-t border-gray-200">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col items-center justify-center text-center">
          {/* Logo - Centered */}
          <Link to="/" className="mb-4 flex items-center justify-center group">
            <img 
              src="/logo-icon.png" 
              alt="Riverside Park Capital Logo" 
              className="h-12 w-auto transition-all duration-300 group-hover:scale-110"
            />
          </Link>

          {/* Copyright - Centered Below Logo */}
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} Riverside Park Capital. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
