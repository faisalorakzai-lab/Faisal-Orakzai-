import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    if (location !== "/") {
      window.location.href = `/#${id}`;
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-md border-b border-border/50" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/">
          <span className="font-serif text-2xl font-bold tracking-wider gold-gradient-text cursor-pointer">
            ORAKSER
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <button onClick={() => scrollToSection("services")} className="hover:text-primary transition-colors">
            Services
          </button>
          <button onClick={() => scrollToSection("trust")} className="hover:text-primary transition-colors">
            Why Us
          </button>
          <button onClick={() => scrollToSection("network")} className="hover:text-primary transition-colors">
            Network
          </button>
          <Link href="/admin">
            <span className="hover:text-primary transition-colors cursor-pointer">Admin</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <a href="https://wa.me/923000091881" target="_blank" rel="noopener noreferrer">
            <Button className="gold-gradient-bg text-black font-semibold hover:opacity-90 rounded-none h-10 px-6">
              Free Consultation
            </Button>
          </a>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="bg-black border-t border-border pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <span className="font-serif text-3xl font-bold tracking-wider gold-gradient-text block mb-4">
              ORAKSER
            </span>
            <p className="text-muted-foreground max-w-sm mb-6">
              Pakistan's Premier Intellectual Property & Legal Services Firm.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <Phone className="w-5 h-5 text-primary" />
              <span>Plot No.33/C2, Phase 2 Ext DHA, Karachi, Pakistan</span>
            </div>
          </div>
          <div>
            <h4 className="font-serif text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="/#services" className="hover:text-primary">Services</a></li>
              <li><a href="/#trust" className="hover:text-primary">About</a></li>
              <li><a href="/#contact" className="hover:text-primary">Contact</a></li>
              <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
            </ul>
          </div>
          <div>
            <div className="glass-card p-4 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full border border-primary flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-serif font-bold text-white mb-1">Gold Verified</span>
              <span className="text-xs text-muted-foreground">Legal Excellence</span>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Orakzai Services. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <a href="https://wa.me/923000091881" className="hover:text-primary transition-colors">WhatsApp</a>
            <a href="#" className="hover:text-primary transition-colors">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function FloatingElements() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4">
      {showTop && (
        <button
          onClick={scrollToTop}
          className="w-12 h-12 bg-background border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-lg"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
      <a
        href="https://wa.me/923000091881"
        target="_blank"
        rel="noopener noreferrer"
        className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white hover:bg-[#1EBE5D] transition-colors shadow-lg shadow-[#25D366]/20"
      >
        <MessageSquare className="w-6 h-6" />
      </a>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
      <FloatingElements />
    </div>
  );
}
