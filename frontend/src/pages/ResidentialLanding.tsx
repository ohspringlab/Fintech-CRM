import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { ModernFooter } from "@/components/layout/ModernFooter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Home,
  CheckCircle2,
  Clock,
  Shield,
  TrendingUp,
  DollarSign,
  Percent,
  Calendar,
  FileCheck,
  Zap,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    icon: Home,
    title: "1-4 Family Residential Loans",
    description: "Investment property loans for single family homes to small multi-family buildings.",
  },
  {
    icon: DollarSign,
    title: "Loans up to $15 Million",
    description: "Competitive rates and flexible terms for residential investment properties.",
  },
  {
    icon: Clock,
    title: "15 Business Day Closing",
    description: "Fast approval and funding process to get your deal done quickly.",
  },
  {
    icon: Shield,
    title: "DSCR & Bank Statement Programs",
    description: "Flexible underwriting with DSCR loans, bank statement programs, and light doc options.",
  },
];

const loanTypes = [
  {
    title: "DSCR Loans",
    description: "Debt Service Coverage Ratio loans perfect for rental properties.",
    features: [
      "Up to 80% LTV",
      "No income verification required",
      "Rental income based qualification",
      "30-year terms available",
    ],
  },
  {
    title: "Fix & Flip",
    description: "Short-term bridge financing for property renovation projects.",
    features: [
      "Up to 90% LTV",
      "12-24 month terms",
      "Rehab budget included",
      "Interest-only payments",
    ],
  },
  {
    title: "Ground Up Construction",
    description: "Construction loans for new residential developments.",
    features: [
      "Up to 85% LTV",
      "Construction-to-permanent options",
      "Flexible draw schedules",
      "Competitive rates",
    ],
  },
];

export default function ResidentialLanding() {
  const { user } = useAuth();
  const getPortalLink = () => {
    if (!user) return "/register";
    if (user.role === 'admin') return "/admin";
    if (user.role === 'operations') return "/ops";
    if (user.role === 'broker') return "/broker";
    if (user.role === 'investor') return "/investor";
    return "/dashboard";
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-emerald-500/5 to-teal-500/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-200/10 rounded-full -ml-48 -mb-48 blur-3xl" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100/80 backdrop-blur-sm rounded-full text-blue-700 text-sm font-medium mb-6 border border-blue-200/50">
              <Home className="w-4 h-4" />
              Residential Investment Loans
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Residential Investment
              <span className="block bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                Property Financing
              </span>
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto leading-relaxed">
              Unlock your real estate investment potential with flexible residential loan programs. 
              From single-family rentals to multi-unit properties, we provide fast, competitive financing solutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                asChild
              >
                <Link to={getPortalLink()}>
                  Get Started <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gray-300 hover:border-gray-400 bg-white/80 backdrop-blur-sm"
                asChild
              >
                <Link to="/loan-programs">View All Programs</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Residential Loans?
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Fast, flexible, and competitive financing for your residential investment properties
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="relative h-full border border-gray-200/50 bg-gradient-to-br from-white via-blue-50/30 to-emerald-50/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-300/20 transition-all duration-500" />
                  <CardContent className="relative z-10 p-6">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mb-4 shadow-sm">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-xl mb-2 text-gray-900">{feature.title}</h3>
                    <p className="text-gray-700">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Loan Types Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-slate-50 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Residential Loan Programs
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Choose the perfect financing solution for your residential investment needs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {loanTypes.map((program, i) => (
              <motion.div
                key={program.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="relative h-full border border-gray-200/50 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-emerald-300/20 transition-all duration-500" />
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

      {/* CTA Section */}
      <section className="py-16 sm:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-emerald-500/10 to-teal-500/10" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <Card className="relative border border-gray-200/50 bg-gradient-to-br from-white via-blue-50/40 to-emerald-50/30 shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-200/10 rounded-full -ml-32 -mb-32 blur-3xl" />
              <CardContent className="relative z-10 p-8 sm:p-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                  Ready to Get Started?
                </h2>
                <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
                  Apply for your residential investment loan today and get approved in as little as 15 business days.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    asChild
                  >
                    <Link to={getPortalLink()}>
                      Apply Now <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-gray-300 hover:border-gray-400 bg-white/80 backdrop-blur-sm"
                    asChild
                  >
                    <Link to="/contact">Contact Us</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <ModernFooter />
    </div>
  );
}

