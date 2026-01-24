import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { ModernFooter } from "@/components/layout/ModernFooter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  TrendingUp,
  Shield,
  Clock,
  FileCheck,
  Lock,
  CheckCircle2,
  Building2,
  Home,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { authApi } from "@/lib/api";
import { useEffect, useState } from "react";

const whyChooseFeatures = [
  {
    icon: Clock,
    title: "15 Business Day Application to Closing",
    description: "Average closing timeframe of 15 business days from application to funding.",
  },
  {
    icon: Shield,
    title: "Flexible Financing Solutions",
    description: "DSCR, bank statement programs, light doc, and no doc streamline programs for simple process and fast execution.",
  },
  {
    icon: FileCheck,
    title: "Secure Document Upload",
    description: "Upload and manage your loan documents securely with our encrypted portal.",
    lockIcon: Lock,
  },
  {
    icon: TrendingUp,
    title: "Over $5 Billion in Lending",
    description: "20 years of experience with loans up to $15 million.",
  },
];

const loanPrograms = [
  {
    title: "1-4 Family Residential",
    description: "Investment property loans for single family homes to small multi-family buildings.",
    features: [
      "Loans up to $15 million",
      "DSCR loans",
      "Fix-and-flip",
      "Ground up construction",
    ],
  },
  {
    title: "Commercial Mortgages",
    description: "Financing for office buildings, retail centers, industrial properties, and more.",
    features: [
      "Multifamily (5+ units)",
      "Retail",
      "Office",
      "Self-storage",
      "Light industrial",
      "Mixed-use",
    ],
  },
];


export default function Landing() {
  const { isSignedIn } = useUser();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      if (isSignedIn) {
        try {
          const response = await authApi.me();
          setUserRole(response.user.role);
        } catch (error) {
          console.error('Failed to fetch user role:', error);
        }
      } else {
        setUserRole(null);
      }
    };
    fetchRole();
  }, [isSignedIn]);

  const getPortalLink = () => {
    if (!isSignedIn) return "/register";
    if (userRole === 'admin') return "/admin";
    if (userRole === 'operations') return "/ops";
    if (userRole === 'broker') return "/broker";
    if (userRole === 'investor') return "/investor";
    return "/dashboard";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="light" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground mb-6 leading-tight">
                Where Real Estate Capital Flows
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
                Streamlined financing solutions for residential and commercial real estate properties. You can quickly get a quote, submit your loan request, upload documents, and track your loan process all in your loan portal.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
            >
              <Link to="/contact">
                <Button size="xl" className="px-8 py-6 text-lg bg-slate-800 hover:bg-slate-900 text-white">
                  Get a Quick Quote
                  <Calendar className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="xl" variant="outline" className="px-8 py-6 text-lg border-2 border-slate-800 text-slate-800 hover:bg-slate-50">
                  Request a Loan
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-6 text-slate-700"
            >
              <Link to="/broker" className="text-base font-medium hover:text-slate-900 transition-colors">
                Broker Portal
              </Link>
              <Link to="/investor" className="text-base font-medium hover:text-slate-900 transition-colors">
                Investor Portal
              </Link>
              <Link to="/ops" className="text-base font-medium hover:text-slate-900 transition-colors">
                Operations Portal
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Why Choose Riverside Park Capital
            </h2>
            <p className="text-lg text-muted-foreground">
              Experience a modern approach to commercial lending with our technology-driven platform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {whyChooseFeatures.map((feature, i) => {
              const Icon = feature.icon;
              const LockIcon = feature.lockIcon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="h-full border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4 relative">
                        <Icon className="w-6 h-6 text-slate-700" />
                        {LockIcon && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center">
                            <LockIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg mb-2 text-foreground">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Loan Programs Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Loan Programs
            </h2>
            <p className="text-lg text-muted-foreground">
              Tailored financing solutions for your investment needs.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {loanPrograms.map((program, i) => (
              <motion.div
                key={program.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-8">
                    <h3 className="font-bold text-2xl mb-3 text-foreground">{program.title}</h3>
                    <p className="text-muted-foreground mb-6">{program.description}</p>
                    <ul className="space-y-3">
                      {program.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-slate-800 flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-slate-900">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
              Start your loan application today and track your progress in real-time through our modern portal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="xl" className="px-10 py-6 text-lg bg-white text-slate-900 hover:bg-slate-100 shadow-sm hover:shadow-md transition-all font-semibold">
                  Request a Loan
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to={getPortalLink()}>
                <Button size="xl" variant="outline" className="text-lg px-10 py-6 bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-semibold">
                  Access Client Portal
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
