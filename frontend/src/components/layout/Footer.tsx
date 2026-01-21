import { Link } from "react-router-dom";
import { Building2, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="font-display text-xl font-bold">RPC</span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed">
              Your trusted partner for real estate financing. Fast approvals, competitive rates, and exceptional service.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {["Loan Programs", "About Us", "Contact", "FAQ"].map((item) => (
                <li key={item}>
                  <Link 
                    to={`/${item.toLowerCase().replace(" ", "-")}`}
                    className="text-white/70 text-sm hover:text-[#c4b5fd] transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Loan Types */}
          <div>
            <h4 className="font-semibold mb-4">Loan Types</h4>
            <ul className="space-y-3">
              {["Fix & Flip", "Ground-Up Construction", "Bridge Loans", "DSCR Loans"].map((item) => (
                <li key={item}>
                  <span className="text-white/70 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-white/70 text-sm">
                <Phone className="w-4 h-4 text-[#c4b5fd]" />
                (800) 123-4567
              </li>
              <li className="flex items-center gap-3 text-white/70 text-sm">
                <Mail className="w-4 h-4 text-[#c4b5fd]" />
                loans@rpc.com
              </li>
              <li className="flex items-start gap-3 text-white/70 text-sm">
                <MapPin className="w-4 h-4 text-[#c4b5fd] mt-0.5" />
                123 Finance Street<br />
                New York, NY 10001
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} RPC. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-white/50 text-sm hover:text-white/70 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-white/50 text-sm hover:text-white/70 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
