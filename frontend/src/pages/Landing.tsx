import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { ModernFooter } from "@/components/layout/ModernFooter";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  Shield,
  TrendingUp,
  Building2,
  Home,
  Briefcase,
  ChevronRight,
  Zap,
  Award,
  Users,
  BarChart3
} from "lucide-react";
import institutionalBg from "@/assets/institutional_texture.png";

const features = [
  {
    icon: Clock,
    title: "Disciplined Timeline",
    description: "Structured underwriting process with predictable closing timelines for qualified sponsors.",
  },
  {
    icon: DollarSign,
    title: "Competitive Terms",
    description: "Institutional pricing and leverage parameters calibrated to asset quality and sponsor track record.",
  },
  {
    icon: Shield,
    title: "Reliable Execution",
    description: "Direct balance sheet lender with certainty of close on approved transactions.",
  },
  {
    icon: FileCheck,
    title: "Flexible Structures",
    description: "Tailored documentation requirements from full qualification to asset-based programs.",
  },
];

const loanTypes = [
  {
    icon: Home,
    title: "Fix & Flip",
    description: "Short-term financing for property renovation and resale projects.",
    features: ["Up to 90% LTV", "12-24 month terms", "Quick closings"],
  },
  {
    icon: Building2,
    title: "Ground-Up Construction",
    description: "Fund your new construction projects from the ground up.",
    features: ["Up to 75% LTC", "Interest reserves", "Draw schedules"],
  },
  {
    icon: TrendingUp,
    title: "DSCR Loans",
    description: "Qualify based on property cash flow, not personal income.",
    features: ["No tax returns", "Investor-friendly", "30-year terms"],
  },
];

const stats = [
  { value: "$2B+", label: "Capital Deployed", icon: DollarSign },
  { value: "5,000+", label: "Transactions Closed", icon: Users },
  { value: "48hrs", label: "Term Sheet Turnaround", icon: Zap },
  { value: "98%", label: "Closing Rate", icon: Award },
];

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);


  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        {/* Subtle texture or grain overlay could go here, replacing colorful orbs */}
      </div>
      <Navbar variant="dark" />

      {/* Hero Section - Institutional Redesign */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900"
      >
        {/* Background - Static, high-quality, disciplined */}
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full">
            <img
              src={institutionalBg}
              alt="Institutional Real Estate"
              className="w-full h-full object-cover"
            />
            {/* Overlay - Dark, uniform, authoritative */}
            <div className="absolute inset-0 bg-slate-950/50 mix-blend-multiply" />
          </div>
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-semibold text-white leading-tight tracking-tight">
                Institutional <br />
                <span className="text-slate-200">Real Estate Capital</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-slate-200 mb-10 max-w-3xl leading-relaxed font-light"
            >
              Senior and structured financing for residential, multifamily, and commercial real estate.
              <span className="block mt-3 text-white/90 font-normal tracking-wide">
                Direct underwriting. Disciplined execution. Reliable closings.
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-5 items-start"
            >
              <Link to="/register">
                <Button size="xl" className="font-semibold text-lg px-8 py-6 bg-white text-slate-900 hover:bg-slate-100 rounded-md shadow-sm transition-all border border-transparent">
                  Request Capital
                </Button>
              </Link>
              <Link to="/loan-programs">
                <Button size="xl" variant="outline" className="font-semibold text-lg px-8 py-6 rounded-md bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all backdrop-blur-sm">
                  Explore Financing Options
                </Button>
              </Link>
            </motion.div>

            {/* Institutional Trust Signals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 border-t border-white/10 pt-10"
            >
              {/* Asset Classes */}
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Asset Classes</p>
                <div className="flex flex-wrap gap-2">
                  {["Residential 1-4 Unit", "Multifamily", "Mixed-Use", "Commercial"].map((item) => (
                    <span key={item} className="text-slate-300 text-sm font-medium">{item}</span>
                  ))}
                </div>
              </div>
              {/* Capital Types */}
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Capital Types</p>
                <div className="flex flex-wrap gap-2">
                  {["Bridge", "Construction", "DSCR", "Value-Add"].map((item) => (
                    <span key={item} className="text-slate-300 text-sm font-medium">{item}</span>
                  ))}
                </div>
              </div>
              {/* Execution */}
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Execution</p>
                <div className="flex flex-wrap gap-2">
                  {["Direct Underwriting", "No Delegation", "Nationwide"].map((item) => (
                    <span key={item} className="text-slate-300 text-sm font-medium">{item}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section - Clean, institutional */}
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-sm p-6 text-center border border-slate-200 shadow-sm"
              >
                <stat.icon className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-4xl md:text-5xl font-display font-semibold text-slate-800 mb-2">
                  {stat.value}
                </p>
                <p className="text-muted-foreground text-sm font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* Features Section - Clean cards */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <p className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-4">Why Choose RPC</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold text-foreground mb-6">
              Built for <span className="italic">investors</span>,
              <br />by investors
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We understand real estate investing because we live it every day. Our team brings decades of combined experience to every transaction.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-8">
                    <div className="w-14 h-14 rounded-sm bg-slate-100 flex items-center justify-center mb-6 border border-slate-200">
                      <feature.icon className="w-7 h-7 text-slate-700" />
                    </div>
                    <h3 className="font-semibold text-xl mb-3 text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Loan Types Section - Clean cards */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <p className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-4">Loan Programs</p>
            <h2 className="text-4xl md:text-5xl font-display font-semibold text-foreground mb-6">
              Flexible financing for every deal
            </h2>
            <p className="text-muted-foreground text-lg">
              From fix-and-flips to ground-up construction, we have the perfect loan program for your investment strategy.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {loanTypes.map((loan, i) => (
              <motion.div
                key={loan.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="overflow-hidden border border-slate-200 bg-white h-full shadow-sm">
                  <CardContent className="p-0">
                    <div className="flex flex-col h-full">
                      {/* Icon Header */}
                      <div className="bg-slate-50 p-8 border-b border-slate-200">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-sm bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                            <loan.icon className="w-7 h-7 text-slate-700" />
                          </div>
                          <h3 className="font-display text-2xl font-semibold text-foreground">{loan.title}</h3>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-8 flex-1 flex flex-col">
                        <p className="text-muted-foreground leading-relaxed mb-6 flex-1">{loan.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {loan.features.map((feature) => (
                            <span key={feature} className="text-xs px-4 py-2 rounded-sm bg-slate-100 text-slate-700 font-medium border border-slate-200">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <Link to="/loan-programs">
              <Button size="xl" variant="navy" className="px-10 py-6 text-lg shadow-sm hover:shadow-md transition-all">
                View All Programs
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 relative overflow-hidden bg-slate-900">
        <div className="container mx-auto px-4 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold text-white mb-6">
              Ready to fund your <br />
              <span className="italic text-slate-300">next deal?</span>
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
              Join thousands of successful investors who trust RPC for their real estate financing needs. Get approved in as little as 48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="xl" className="px-10 py-6 text-lg bg-white text-slate-900 hover:bg-slate-100 shadow-sm hover:shadow-md transition-all font-semibold">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="xl" variant="outline" className="text-lg px-10 py-6 bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-semibold">
                  Contact Us
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <ModernFooter />
    </div>
  );
}
