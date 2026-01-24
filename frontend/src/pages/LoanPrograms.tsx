import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { ModernFooter } from "@/components/layout/ModernFooter";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  CheckCircle2, 
  Home,
  Building2,
  Briefcase,
  TrendingUp,
  DollarSign,
  Clock,
  Shield,
  FileCheck,
  Percent,
  Calendar,
  Users,
  Zap,
  BarChart3,
  Key
} from "lucide-react";
import { useState } from "react";

interface LoanProgram {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  category: "residential" | "commercial" | "multifamily";
  description: string;
  rateRange: string;
  ltv: string;
  term: string;
  features: string[];
  requirements: string[];
  useCases: string[];
  documentation: string[];
}

const loanPrograms: LoanProgram[] = [
  {
    id: "fix-flip",
    icon: Home,
    title: "Fix & Flip",
    category: "residential",
    description: "Short-term bridge financing for property renovation and resale projects. Perfect for investors looking to quickly acquire, renovate, and sell properties.",
    rateRange: "5M",
    ltv: "Up to 90%",
    term: "12-24 months",
    features: [
      "Up to 90% LTV",
      "12-24 month terms",
      "Defined closing timelines with direct underwriting",
      "Interest-only payments",
      "No prepayment penalties",
      "Rehab budget included"
    ],
    requirements: [
      "Minimum credit score: 640",
      "Experience with fix & flip projects",
      "Scope of work and contractor bids",
      "Property appraisal",
      "Down payment: 10-20%"
    ],
    useCases: [
      "Single-family home renovations",
      "Multi-unit property flips",
      "Quick turnaround investments",
      "Distressed property acquisitions"
    ],
    documentation: [
      "Government ID",
      "Scope of work with budget",
      "Contractor bids",
      "Experience resume",
      "Property appraisal"
    ]
  },
  {
    id: "ground-up",
    icon: Building2,
    title: "Ground-Up Construction",
    category: "residential",
    description: "Comprehensive financing for new construction projects from the ground up. Includes land acquisition, construction, and interest reserves.",
    rateRange: "10.0% - 12.0%",
    ltv: "Up to 75% LTC",
    term: "12-36 months",
    features: [
      "Up to 75% Loan-to-Cost (LTC)",
      "Interest reserves available",
      "Draw schedules",
      "Construction monitoring",
      "Flexible terms",
      "Land acquisition included"
    ],
    requirements: [
      "Minimum credit score: 680",
      "Licensed contractor",
      "Detailed construction plans",
      "Permits and approvals",
      "Experience with construction projects"
    ],
    useCases: [
      "New single-family homes",
      "Custom home construction",
      "Small development projects",
      "Spec home building"
    ],
    documentation: [
      "Construction plans and permits",
      "Contractor license and insurance",
      "Detailed budget breakdown",
      "Timeline and draw schedule",
      "Property appraisal"
    ]
  },
  {
    id: "dscr-rental",
    icon: TrendingUp,
    title: "DSCR / Investor Rental",
    category: "residential",
    description: "Qualify based on property cash flow, not personal income. Perfect for investors who want to expand their portfolio without income verification.",
    rateRange: "5M",
    ltv: "Up to 80%",
    term: "30 years",
    features: [
      "No tax returns required",
      "No income verification",
      "DSCR-based qualification",
      "30-year fixed terms",
      "Investor-friendly",
      "Portfolio expansion"
    ],
    requirements: [
      "Minimum credit score: 680",
      "DSCR of 1.15 or higher",
      "Property rental income",
      "Property appraisal",
      "Down payment: 20-25%"
    ],
    useCases: [
      "Rental property purchases",
      "Portfolio expansion",
      "Investment property refinance",
      "Long-term hold strategies"
    ],
    documentation: [
      "Government ID",
      "Rental income documentation",
      "Property operating statement",
      "Lease agreements",
      "Property appraisal"
    ]
  },
  {
    id: "heloc",
    icon: Key,
    title: "2nd Mortgage",
    category: "residential",
    description: "Revolving line of credit for investment properties. Access your equity as needed with flexible draw and repayment options.",
    rateRange: "$750,000",
    ltv: "Up to 90%",
    term: "10-30 years",
    features: [
      "Revolving credit line",
      "Up to 90% LTV",
      "Interest-only payments",
      "Flexible draws",
      "No prepayment penalty",
      "Portfolio access"
    ],
    requirements: [
      "Minimum credit score: 700",
      "Existing investment property",
      "Property equity",
      "Property appraisal",
      "Debt service coverage"
    ],
    useCases: [
      "Portfolio expansion",
      "Property improvements",
      "Working capital",
      "Opportunity funding"
    ],
    documentation: [
      "Government ID",
      "Property ownership docs",
      "Property financials",
      "Existing mortgage statements",
      "Property appraisal"
    ]
  },
  {
    id: "rate-term",
    icon: Percent,
    title: "Rate & Term Refinance",
    category: "residential",
    description: "Refinance to lower your interest rate or change loan terms. Reduce monthly payments or shorten your loan term.",
    rateRange: "5M",
    ltv: "Up to 80%",
    term: "15-30 years",
    features: [
      "Lower interest rates",
      "Flexible terms",
      "No cash out",
      "Rate reduction focus",
      "Term optimization",
      "Streamlined process"
    ],
    requirements: [
      "Minimum credit score: 680",
      "Existing investment property",
      "Current mortgage",
      "Property equity",
      "DSCR of 1.15+"
    ],
    useCases: [
      "Rate reduction",
      "Term changes",
      "Payment optimization",
      "Loan consolidation"
    ],
    documentation: [
      "Government ID",
      "Current mortgage statement",
      "Property financials",
      "Rental income docs",
      "Property appraisal"
    ]
  },
  {
    id: "cash-out",
    icon: DollarSign,
    title: "Cash-Out Refinance",
    category: "residential",
    description: "Access your property's equity through a cash-out refinance. Use funds for investments, improvements, or other opportunities.",
    rateRange: "5M",
    ltv: "Up to 75%",
    term: "15-30 years",
    features: [
      "Access property equity",
      "Up to 75% LTV",
      "Flexible use of funds",
      "Competitive rates",
      "Long terms available",
      "Portfolio consideration"
    ],
    requirements: [
      "Minimum credit score: 680",
      "Property equity",
      "DSCR of 1.15+",
      "Property appraisal",
      "Use of funds explanation"
    ],
    useCases: [
      "Portfolio expansion",
      "Property improvements",
      "Business investments",
      "Debt consolidation"
    ],
    documentation: [
      "Government ID",
      "Current mortgage statement",
      "Property financials",
      "Use of funds letter",
      "Property appraisal"
    ]
  },
  {
    id: "portfolio-refinance",
    icon: Building2,
    title: "Portfolio Refinance",
    category: "residential",
    description: "Refinance multiple investment properties in a single transaction. Streamlined process for portfolio optimization.",
    rateRange: "20M",
    ltv: "Up to 75%",
    term: "30 years",
    features: [
      "Multiple properties",
      "Single transaction",
      "Portfolio DSCR",
      "Streamlined process",
      "Competitive rates",
      "Bulk pricing"
    ],
    requirements: [
      "Minimum credit score: 700",
      "3+ properties",
      "Portfolio DSCR 1.15+",
      "Property appraisals",
      "Portfolio financials"
    ],
    useCases: [
      "Portfolio optimization",
      "Rate reduction",
      "Cash-out on portfolio",
      "Consolidation"
    ],
    documentation: [
      "Government ID",
      "Portfolio rent roll",
      "All property financials",
      "Property appraisals",
      "Portfolio summary"
    ]
  },
  {
    id: "commercial",
    icon: Briefcase,
    title: "Commercial Mortgage Financing",
    category: "commercial",
    description: "Comprehensive financing solutions for commercial real estate properties including office, retail, and mixed-use properties.",
    rateRange: "15M",
    ltv: "Up to 75%",
    term: "5-25 years",
    features: [
      "Various property types",
      "Up to 75% LTV",
      "Flexible terms",
      "Interest-only options",
      "Balloon payments",
      "Extension options"
    ],
    requirements: [
      "Minimum credit score: 680",
      "Commercial property",
      "Property financials",
      "Lease agreements",
      "Property appraisal"
    ],
    useCases: [
      "Office buildings",
      "Retail properties",
      "Mixed-use developments",
      "Commercial acquisitions"
    ],
    documentation: [
      "Government ID",
      "Lease agreements",
      "Property financials",
      "Tenant information",
      "Property appraisal"
    ]
  }
];

export default function LoanPrograms() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "residential" | "commercial" | "multifamily">("all");
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  const filteredPrograms = selectedCategory === "all"
    ? loanPrograms 
    : loanPrograms.filter(program => program.category === selectedCategory);

  const categories = [
    { id: "all", label: "All Programs", count: loanPrograms.length },
    { id: "residential", label: "Residential", count: loanPrograms.filter(p => p.category === "residential").length },
    { id: "commercial", label: "Commercial", count: loanPrograms.filter(p => p.category === "commercial").length },
    { id: "multifamily", label: "Multifamily", count: loanPrograms.filter(p => p.category === "multifamily").length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="light" />

      {/* Hero Section - matches About page style */}
      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/18 via-background to-background" />
        <div className="absolute -left-32 -top-32 w-96 h-96 bg-gradient-to-br from-primary/18 via-secondary/12 to-surface/30 blur-3xl rounded-full" />
        <div className="absolute -right-24 top-10 w-80 h-80 bg-gradient-to-br from-primary/14 via-surface/24 to-primary/10 blur-3xl rounded-full" />
        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/70 backdrop-blur border border-border text-sm text-muted-foreground mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Institutional Loan Programs
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold mb-4 text-foreground">
                Financing for Every Investment Strategy
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8"
            >
              From fix-and-flip to long-term rental and commercial assets, our structured loan
              programs are designed to match the way experienced investors actually deploy capital.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/register">
                <Button size="xl" className="group bg-primary text-primary-foreground hover:bg-primary/90">
                  Request Capital
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  variant="outline"
                  size="xl"
                  className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  Talk to Our Team
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-12 bg-background border-b border-slate-200">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id as any)}
                className={`
                  px-6 py-3 rounded-sm text-sm font-semibold transition-all border
                  ${selectedCategory === category.id
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }
                `}
              >
                {category.label} ({category.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Loan Programs Grid */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((program, i) => {
              const Icon = program.icon;
              const isExpanded = expandedProgram === program.id;
              
              return (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card 
                    className="group bg-white border border-slate-200 rounded-sm shadow-sm hover:shadow-md transition-all overflow-hidden h-full flex flex-col"
                  >
                    <CardHeader className="bg-slate-50 p-6 border-b border-slate-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 rounded-sm bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                          <Icon className="w-7 h-7 text-slate-700" />
                        </div>
                        <span className="text-xs px-3 py-1 rounded-sm bg-slate-100 text-slate-600 font-medium border border-slate-200">
                          {program.category}
                        </span>
                      </div>
                      <CardTitle className="text-2xl mb-2 font-display font-semibold text-foreground">{program.title}</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {program.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-6 flex-1 flex flex-col">
                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-200">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                            {["commercial", "portfolio-refinance", "fix-flip", "dscr-rental", "rate-term", "cash-out", "heloc"].includes(program.id) ? "Loans Up To" : "Rate"}
                          </p>
                          <p className="font-semibold text-sm text-foreground">{program.rateRange}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">LTV</p>
                          <p className="font-semibold text-sm text-foreground">{program.ltv}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Term</p>
                          <p className="font-semibold text-sm text-foreground">{program.term}</p>
                        </div>
                      </div>

                      {/* Features Preview */}
                      <div className="mb-6 flex-1">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                          <CheckCircle2 className="w-4 h-4 text-slate-600" />
                          Key Features
                        </h4>
                        <ul className="space-y-2">
                          {program.features.slice(0, 3).map((feature, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-slate-400 mt-1">•</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                          {program.features.length > 3 && (
                            <li className="text-sm text-muted-foreground">
                              +{program.features.length - 3} more features
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => setExpandedProgram(isExpanded ? null : program.id)}
                        className="w-full text-sm text-slate-700 hover:text-slate-900 font-medium mb-4 text-left"
                      >
                        {isExpanded ? "Show Less" : "View Full Details"} →
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="space-y-6 pt-4 border-t border-slate-200">
                          {/* All Features */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                              <Zap className="w-4 h-4 text-slate-600" />
                              All Features
                            </h4>
                            <ul className="space-y-2">
                              {program.features.map((feature, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <CheckCircle2 className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Requirements */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                              <Shield className="w-4 h-4 text-slate-600" />
                              Requirements
                            </h4>
                            <ul className="space-y-2">
                              {program.requirements.map((req, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-slate-400 mt-1">•</span>
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Use Cases */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                              <Building2 className="w-4 h-4 text-slate-600" />
                              Ideal For
                            </h4>
                            <ul className="space-y-2">
                              {program.useCases.map((useCase, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-slate-400 mt-1">•</span>
                                  <span>{useCase}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Documentation */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                              <FileCheck className="w-4 h-4 text-slate-600" />
                              Required Documentation
                            </h4>
                            <ul className="space-y-2">
                              {program.documentation.map((doc, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-slate-400 mt-1">•</span>
                                  <span>{doc}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* CTA Button */}
                      <Link to="/register" className="block mt-4">
                        <Button variant="outline" className="w-full group border-slate-200 hover:bg-slate-50" size="sm">
                          Apply for {program.title}
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <p className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-4">Why Choose RPC</p>
            <h2 className="text-4xl md:text-5xl font-display font-semibold text-foreground mb-6">
              Built for <span className="italic">investors</span>,
              <br />by investors
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We understand real estate investing because we live it every day. Our team brings decades of combined experience to every transaction.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: "Disciplined Timeline",
                description: "Structured underwriting process with predictable closing timelines for qualified sponsors."
              },
              {
                icon: DollarSign,
                title: "Competitive Terms",
                description: "Institutional pricing and leverage parameters calibrated to asset quality and sponsor track record."
              },
              {
                icon: Shield,
                title: "Reliable Execution",
                description: "Direct balance sheet lender with certainty of close on approved transactions."
              }
            ].map((feature, i) => (
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

      {/* CTA Section */}
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

