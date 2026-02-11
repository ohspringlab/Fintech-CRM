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
import { useAuth } from "@/contexts/AuthContext";
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
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (user && !hasRedirected && !isLoading) {
      const role = user.role;
      
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
    }
  }, [user, hasRedirected, isLoading, navigate]);

  const getPortalLink = () => {
    if (!user) return "/register";
    if (user.role === 'admin') return "/admin";
    if (user.role === 'operations') return "/ops";
    if (user.role === 'broker') return "/broker";
    if (user.role === 'investor') return "/investor";
    return "/dashboard";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-indigo-50/20">
      <Navbar variant="light" hideOnScroll={false} />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full -mr-48 -mt-48 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200/20 rounded-full -ml-48 -mb-48 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-200/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-left"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-6 leading-tight">
                Where Real Estate Capital Flows
              </h1>
              <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-3xl leading-relaxed">
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
                <button className="w-full sm:w-auto px-6 py-3 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center">
                  Get a Quick Quote
                  <Calculator className="w-4 h-4 ml-2" />
                </button>
              </Link>
              <Link to="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-6 py-3 text-sm border-2 border-gray-300 text-gray-800 hover:bg-white/80 backdrop-blur-sm rounded-lg bg-white/90 font-semibold shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center">
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
      <section className="relative py-20 bg-gradient-to-b from-white to-slate-50/50 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/20 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-100/20 rounded-full -ml-32 -mb-32 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
              Why Choose Riverside Park Capital
            </h2>
            <p className="text-lg text-gray-700">
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
                  <Card className="relative h-full border border-gray-200/50 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-blue-300/20 transition-all duration-500" />
                    <CardContent className="relative z-10 p-6">
                      <div className="mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                          <Icon className="w-7 h-7 text-blue-700" />
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-gray-900">{feature.title}</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Loan Programs Section */}
      <section className="relative py-20 bg-gradient-to-b from-slate-50/50 to-white overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-100/20 rounded-full -ml-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-100/20 rounded-full -mr-32 -mb-32 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
              Loan Programs
            </h2>
            <p className="text-lg text-gray-700">
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
                <Card className="relative h-full border border-gray-200/50 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-emerald-300/20 transition-all duration-500" />
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-teal-200/10 rounded-full -ml-10 -mb-10 blur-2xl group-hover:bg-teal-300/20 transition-all duration-500" />
                  <CardContent className="relative z-10 p-8">
                    <h3 className="font-bold text-2xl mb-3 text-gray-900">{program.title}</h3>
                    <p className="text-base text-gray-700 mb-6">{program.description}</p>
                    <ul className="space-y-3">
                      {program.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
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
      <section className="relative py-20 bg-gradient-to-b from-white via-blue-50/20 to-indigo-50/10 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-0 w-48 h-48 bg-blue-100/20 rounded-full -ml-24 blur-3xl" />
          <div className="absolute top-1/2 right-0 w-48 h-48 bg-indigo-100/20 rounded-full -mr-24 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
                Track Your Loan in Real-Time
              </h2>
              <p className="text-lg text-gray-700">
                Our loan tracker lets you see exactly where your loan stands at every stage.
              </p>
            </div>

            <Card className="relative border border-gray-200/50 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/10 rounded-full -ml-12 -mb-12 blur-2xl" />
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
      <section className="relative py-20 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full -mr-48 -mt-48 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/10 rounded-full -ml-48 -mb-48 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-400/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              Ready to Get Started?
            </h2>
            <p className="text-white/90 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
              Start your loan application today and track your progress in real-time through our modern portal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-6 py-3 text-sm bg-white text-gray-900 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-lg flex items-center justify-center backdrop-blur-sm">
                  Request a Loan
                  <ArrowRight className="w-4 h-4 ml-2 text-gray-900" />
                </button>
              </Link>
              <Link to={getPortalLink()} className="w-full sm:w-auto">
                <button className="w-full sm:w-auto text-sm px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-semibold transition-all duration-300 rounded-lg shadow-lg hover:shadow-xl">
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
