import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { ModernFooter } from "@/components/layout/ModernFooter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FileText,
  TrendingUp,
  Shield,
  Clock,
  FileCheck,
  Lock,
  CheckCircle2,
  Building2,
  Home,
} from "lucide-react";
import { useUser, useAuth } from "@clerk/clerk-react";
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
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      // Only fetch role if user is signed in, Clerk is loaded, and we have a token
      if (isSignedIn && isLoaded) {
        try {
          // Check if we actually have a token before making the API call
          const token = await getToken();
          if (!token) {
            setUserRole(null);
            return;
          }
          
          const response = await authApi.me();
          setUserRole(response.user.role);
        } catch (error: any) {
          // Silently handle 401 errors on Landing page (public page)
          // Don't log errors or trigger auto-logout for unauthenticated users
          if (error?.status === 401 || error?.code === 'AUTH_REQUIRED') {
            setUserRole(null);
            return;
          }
          // Only log non-401 errors
          console.error('Failed to fetch user role:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    };
    
    // Only fetch if Clerk is loaded
    if (isLoaded) {
      fetchRole();
    }
  }, [isSignedIn, isLoaded, getToken]);

  const getPortalLink = () => {
    if (!isSignedIn) return "/register";
    if (userRole === 'admin') return "/admin";
    if (userRole === 'operations') return "/ops";
    if (userRole === 'broker') return "/broker";
    if (userRole === 'investor') return "/investor";
    return "/dashboard";
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar variant="light" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-left"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-slate-900 dark:text-white mb-6 leading-tight transition-colors duration-300">
                Where Real Estate Capital<br />Flows
              </h1>
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-3xl leading-relaxed transition-colors duration-300">
                Streamlined financing solutions for residential and commercial real estate properties. You can quickly get a quote, submit your loan request, upload documents, and track your loan process all in your loan portal.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-start mb-8"
            >
              <Link to="/contact">
                <Button size="xl" className="px-8 py-6 text-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-md transition-colors duration-300">
                  Get a Quick Quote
                  <FileText className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="xl" variant="outline" className="px-8 py-6 text-lg border-2 border-slate-800 dark:border-slate-300 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white rounded-md bg-white dark:bg-slate-800 transition-colors duration-300">
                  Request a Loan
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-6 text-slate-600 dark:text-slate-300 justify-start transition-colors duration-300"
            >
              <Link to="/broker" className="text-base font-medium hover:text-slate-900 dark:hover:text-white transition-colors">
                Broker Portal
              </Link>
              <Link to="/investor" className="text-base font-medium hover:text-slate-900 dark:hover:text-white transition-colors">
                Investor Portal
              </Link>
              <Link to="/ops" className="text-base font-medium hover:text-slate-900 dark:hover:text-white transition-colors">
                Operations Portal
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
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
                  <Card className="h-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="mb-4 relative">
                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 border border-slate-200 dark:border-slate-600 flex items-center justify-center shadow-sm transition-colors duration-300">
                          <Icon className="w-7 h-7 text-slate-800 dark:text-white transition-colors duration-300" />
                        </div>
                        {LockIcon && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-600 flex items-center justify-center shadow-md border-2 border-white dark:border-slate-800 transition-colors duration-300">
                            <LockIcon className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg mb-2 text-foreground transition-colors duration-300">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed transition-colors duration-300">{feature.description}</p>
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
                <Card className="h-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="p-8">
                    <h3 className="font-bold text-2xl mb-3 text-foreground transition-colors duration-300">{program.title}</h3>
                    <p className="text-muted-foreground mb-6 transition-colors duration-300">{program.description}</p>
                    <ul className="space-y-3">
                      {program.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-slate-800 dark:text-slate-300 flex-shrink-0 transition-colors duration-300" />
                          <span className="text-foreground transition-colors duration-300">{feature}</span>
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

      {/* Loan Tracker Section */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
                Track Your Loan in Real-Time
              </h2>
              <p className="text-lg text-muted-foreground">
                Our loan tracker lets you see exactly where your loan stands at every stage.
              </p>
            </div>

            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-all duration-300">
              <CardContent className="p-8">
                <div className="relative">
                  {/* Progress Line Background */}
                  <div className="absolute top-6 left-12 right-12 h-0.5 bg-slate-200 dark:bg-slate-700 transition-colors duration-300" />
                  
                  {/* Progress Line Filled (up to stage 4 - Underwriting) */}
                  <div 
                    className="absolute top-6 left-12 h-0.5 bg-slate-800 dark:bg-slate-400 transition-all duration-500" 
                    style={{ width: 'calc(66.66% - 3rem)' }}
                  />
                  
                  {/* Stages */}
                  <div className="flex items-start justify-between relative z-10">
                    {[
                      { id: 1, label: "Applied", completed: true },
                      { id: 2, label: "Verified", completed: true },
                      { id: 3, label: "Appraisal", completed: true },
                      { id: 4, label: "Underwriting", completed: false, current: true },
                      { id: 5, label: "Commitment", completed: false },
                      { id: 6, label: "Closing", completed: false },
                    ].map((stage, index) => (
                      <div key={stage.id} className="flex flex-col items-center flex-1 relative">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm mb-2 relative z-20 border-2 transition-all duration-300 ${
                            stage.current
                              ? "bg-slate-800 dark:bg-slate-400 text-white border-slate-800 dark:border-slate-400"
                              : stage.completed
                              ? "bg-slate-800 dark:bg-slate-400 text-white border-slate-800 dark:border-slate-400"
                              : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                          }`}
                        >
                          {stage.completed ? (
                            <CheckCircle2 className="w-6 h-6" />
                          ) : (
                            stage.id
                          )}
                        </div>
                        <span
                          className={`text-sm font-medium text-center ${
                            stage.current || stage.completed
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {stage.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-slate-900 dark:bg-slate-950 transition-colors duration-300">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white dark:text-slate-100 mb-6 transition-colors duration-300">
              Ready to Get Started?
            </h2>
            <p className="text-slate-300 dark:text-slate-400 text-lg max-w-2xl mx-auto mb-12 leading-relaxed transition-colors duration-300">
              Start your loan application today and track your progress in real-time through our modern portal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="xl" className="px-10 py-6 text-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm hover:shadow-md transition-all font-semibold">
                  Request a Loan
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to={getPortalLink()}>
                <Button size="xl" variant="outline" className="text-lg px-10 py-6 bg-transparent border-2 border-white/30 dark:border-slate-400/50 text-white dark:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-700/50 hover:border-white/50 dark:hover:border-slate-400 font-semibold transition-all duration-300">
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
