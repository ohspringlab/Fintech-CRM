import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { ModernFooter } from "@/components/layout/ModernFooter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  TrendingUp,
  Shield,
  Clock,
  FileCheck,
  CheckCircle2,
} from "lucide-react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { authApi } from "@/lib/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      if (isSignedIn && isLoaded && !hasRedirected) {
        try {
          const token = await getToken();
          if (!token) {
            setUserRole(null);
            return;
          }
          
          const response = await authApi.me();
          const role = response.user.role;
          setUserRole(role);
          
          if (role === 'admin') {
            setHasRedirected(true);
            navigate('/admin', { replace: true });
          } else if (role === 'operations') {
            setHasRedirected(true);
            navigate('/ops', { replace: true });
          } else if (role === 'broker') {
            setHasRedirected(true);
            navigate('/broker', { replace: true });
          } else if (role === 'investor') {
            setHasRedirected(true);
            navigate('/investor', { replace: true });
          } else if (role === 'borrower' || !role) {
            setHasRedirected(true);
            navigate('/dashboard', { replace: true });
          }
        } catch (error: any) {
          if (error?.status === 401 || error?.code === 'AUTH_REQUIRED') {
            setUserRole(null);
            return;
          }
          if (isSignedIn) {
            setHasRedirected(true);
            navigate('/dashboard', { replace: true });
          } else {
            setUserRole(null);
          }
        }
      } else {
        setUserRole(null);
      }
    };
    
    if (isLoaded) {
      fetchRole();
    }
  }, [isSignedIn, isLoaded, getToken, navigate, hasRedirected]);

  const getPortalLink = () => {
    if (!isSignedIn) return "/register";
    if (userRole === 'admin') return "/admin";
    if (userRole === 'operations') return "/ops";
    if (userRole === 'broker') return "/broker";
    if (userRole === 'investor') return "/investor";
    return "/dashboard";
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant="light" hideOnScroll={false} />

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-left"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Where Real Estate Capital Flows
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-3xl leading-relaxed">
                Streamlined financing solutions for residential and commercial real estate properties. You can quickly get a quote, submit your loan request, upload documents, and track your loan process all in your loan portal.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-start mb-8"
            >
              <Link to="/contact" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-6 py-3 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold shadow-sm flex items-center justify-center">
                  Get a Quick Quote
                  <Calculator className="w-4 h-4 ml-2" />
                </button>
              </Link>
              <Link to="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-6 py-3 text-sm border-2 border-gray-300 text-gray-800 hover:bg-gray-50 rounded-md bg-white font-semibold flex items-center justify-center">
                  Request a Loan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-6 text-base text-gray-600 justify-start"
            >
              <Link to="/broker" className="font-medium hover:text-gray-900 transition-colors">
                Broker Portal
              </Link>
              <Link to="/investor" className="font-medium hover:text-gray-900 transition-colors">
                Investor Portal
              </Link>
              <Link to="/ops" className="font-medium hover:text-gray-900 transition-colors">
                Operations Portal
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose Riverside Park Capital
            </h2>
            <p className="text-lg text-gray-600">
              Experience a modern approach to commercial lending with our technology-driven platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {whyChooseFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="h-full border border-gray-200 bg-gray-50 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <Icon className="w-7 h-7 text-gray-800" />
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-gray-900">{feature.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Loan Programs Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Loan Programs
            </h2>
            <p className="text-lg text-gray-600">
              Tailored financing solutions for your investment needs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {loanPrograms.map((program, i) => (
              <motion.div
                key={program.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border border-gray-200 bg-gray-50 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-8">
                    <h3 className="font-bold text-2xl mb-3 text-gray-900">{program.title}</h3>
                    <p className="text-base text-gray-600 mb-6">{program.description}</p>
                    <ul className="space-y-3">
                      {program.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <span className="text-gray-900">{feature}</span>
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
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Track Your Loan in Real-Time
              </h2>
              <p className="text-lg text-gray-600">
                Our loan tracker lets you see exactly where your loan stands at every stage.
              </p>
            </div>

            <Card className="border border-gray-200 bg-gray-50 shadow-sm">
              <CardContent className="p-8">
                <div className="relative overflow-x-auto">
                  {/* Progress Line Background */}
                  <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-300" />
                  
                  {/* Progress Line Filled (up to stage 4 - Underwriting) */}
                  <div 
                    className="absolute top-6 left-0 h-0.5 bg-blue-600 transition-all duration-500" 
                    style={{ width: '66.66%' }}
                  />
                  
                  {/* Stages */}
                  <div className="flex items-start justify-between relative z-10 px-0 min-w-[600px] sm:min-w-0">
                    {[
                      { id: 1, label: "Applied", completed: true },
                      { id: 2, label: "Verified", completed: true },
                      { id: 3, label: "Appraisal", completed: true },
                      { id: 4, label: "Underwriting", completed: false, current: true },
                      { id: 5, label: "Commitment", completed: false },
                      { id: 6, label: "Closing", completed: false },
                    ].map((stage) => (
                      <div key={stage.id} className="flex flex-col items-center flex-1 relative">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm mb-2 relative z-20 border-2 transition-all ${
                            stage.current
                              ? "bg-blue-600 text-white border-blue-600"
                              : stage.completed
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-400 border-gray-300"
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
                              ? "text-gray-900 font-bold"
                              : "text-gray-500"
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
      <section className="py-20 bg-blue-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-white/90 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
              Start your loan application today and track your progress in real-time through our modern portal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-6 py-3 text-sm bg-white text-gray-900 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all font-semibold rounded-md flex items-center justify-center">
                  Request a Loan
                  <ArrowRight className="w-4 h-4 ml-2 text-gray-900" />
                </button>
              </Link>
              <Link to={getPortalLink()} className="w-full sm:w-auto">
                <button className="w-full sm:w-auto text-sm px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all rounded-md">
                  Access Client Portal
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <ModernFooter />
    </div>
  );
}
