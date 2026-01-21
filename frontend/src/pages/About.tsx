import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { ModernFooter } from "@/components/layout/ModernFooter";
import { 
  ArrowRight, 
  CheckCircle2, 
  Users,
  Target,
  Award,
  TrendingUp,
  Shield,
  Clock,
  Building2,
  DollarSign,
  FileCheck
} from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "Trust & Integrity",
    description: "We build lasting relationships through transparency, honesty, and ethical business practices."
  },
  {
    icon: Clock,
    title: "Speed & Efficiency",
    description: "We understand time is money. Our streamlined processes get you funded faster."
  },
  {
    icon: TrendingUp,
    title: "Innovation",
    description: "We leverage technology to provide better rates, faster approvals, and superior service."
  },
  {
    icon: Users,
    title: "Partnership",
    description: "We're not just lenders—we're your partners in building wealth through real estate."
  }
];

const stats = [
  { value: "$2B+", label: "Loans Funded" },
  { value: "5,000+", label: "Happy Clients" },
  { value: "48hrs", label: "Avg. Approval Time" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "15+", label: "Years Experience" },
  { value: "50+", label: "Team Members" }
];

const team = [
  {
    name: "Leadership Team",
    description: "Our executive team brings decades of combined experience in real estate finance, underwriting, and operations."
  },
  {
    name: "Underwriting",
    description: "Expert underwriters who understand the nuances of real estate investing and work to find solutions."
  },
  {
    name: "Operations",
    description: "Dedicated operations professionals ensuring smooth processing from application to funding."
  },
  {
    name: "Customer Success",
    description: "Committed to your success with responsive support and proactive communication throughout your loan journey."
  }
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="light" />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/18 via-background to-background" />
        <div className="absolute -left-32 -top-32 w-96 h-96 bg-gradient-to-br from-primary/18 via-secondary/12 to-surface/30 blur-3xl rounded-full" />
        <div className="absolute -right-24 top-10 w-80 h-80 bg-gradient-to-br from-primary/14 via-surface/24 to-primary/10 blur-3xl rounded-full" />
        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/70 backdrop-blur border border-border text-sm text-muted-foreground mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Real Estate Finance, Simplified
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold mb-6 text-foreground">
              About RPC Lending
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We understand real estate investors because we are real estate investors. Our team brings decades of combined experience to every transaction.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-surface/60 border-y border-border/80">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {stats.map((stat, i) => (
              <div key={stat.label} className="text-center animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <p className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
                  {stat.value}
                </p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Our Story
              </h2>
              <div className="w-24 h-1 bg-primary mx-auto mb-6"></div>
            </div>

            <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
              <p>
                RPC Lending was founded with a simple mission: to provide real estate investors 
                with fast, flexible, and transparent financing solutions. We recognized that 
                traditional lenders often fail to understand the unique needs of real estate 
                investors, leading to slow approvals, rigid terms, and missed opportunities.
              </p>
              <p>
                Our founders, experienced real estate investors themselves, set out to change 
                that. They built RPC Lending on the principles of speed, flexibility, and 
                partnership—values that continue to guide everything we do today.
              </p>
              <p>
                Today, we've funded over $2 billion in loans and helped thousands of investors 
                grow their portfolios. But we're not done. We're constantly innovating, improving 
                our processes, and expanding our product offerings to better serve the real 
                estate investment community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Our Values
            </h2>
            <p className="text-muted-foreground">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <Card key={value.title} className="group hover:shadow-lg transition-all animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                    <p className="text-muted-foreground text-sm">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              What We Do
            </h2>
            <p className="text-muted-foreground">
              Comprehensive financing solutions for every stage of your investment journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="group hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Fix & Flip Financing</h3>
                    <p className="text-muted-foreground text-sm">
                      Short-term bridge loans for property renovation and resale. Get up to 90% LTV 
                      with quick closings in 7-14 days.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Long-Term Rental Loans</h3>
                    <p className="text-muted-foreground text-sm">
                      DSCR-based financing for rental properties. No income verification required. 
                      Qualify based on property cash flow.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Construction Loans</h3>
                    <p className="text-muted-foreground text-sm">
                      Ground-up construction financing with interest reserves and flexible draw schedules.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Portfolio Solutions</h3>
                    <p className="text-muted-foreground text-sm">
                      Refinance multiple properties in a single transaction. Optimize your portfolio 
                      with competitive rates and streamlined processing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Our Team
            </h2>
            <p className="text-muted-foreground">
              Experienced professionals dedicated to your success
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <Card key={member.name} className="animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{member.name}</h3>
                  <p className="text-muted-foreground text-sm">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Why Choose RPC?
              </h2>
              <div className="w-24 h-1 bg-primary mx-auto mb-6"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                "Fast approvals in as little as 48 hours",
                "Competitive rates designed for investors",
                "Flexible terms tailored to your needs",
                "No prepayment penalties",
                "Experienced team that understands real estate",
                "Transparent process with clear communication",
                "Nationwide lending capabilities",
                "Dedicated support throughout your loan"
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 hero-gradient">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Ready to Work With Us?
          </h2>
          <p className="text-white/80 max-w-xl mx-auto mb-8">
            Join thousands of successful investors who trust RPC for their real estate financing needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="xl" className="group bg-primary text-primary-foreground hover:bg-primary/90">
                Apply Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="hero-outline" size="xl">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ModernFooter />
    </div>
  );
}

