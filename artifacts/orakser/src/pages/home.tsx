import { useListServices, useListOffices, useSubmitContact } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Shield, Award, Briefcase, ChevronRight, CheckCircle, MapPin, Search, FileText, Phone } from "lucide-react";
import { useForm as useReactHookForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone is required"),
  service: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export default function Home() {
  const { data: services = [] } = useListServices();
  const { data: offices = [] } = useListOffices();
  const submitContact = useSubmitContact();
  const { toast } = useToast();

  const form = useReactHookForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: "",
      message: "",
    },
  });

  const onSubmit = (values: z.infer<typeof contactSchema>) => {
    submitContact.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Request Submitted", description: "We will contact you shortly." });
        form.reset();
      },
      onError: () => {
        toast({ title: "Error", description: "Could not submit request. Please try again.", variant: "destructive" });
      }
    });
  };

  const getIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'trademark registration': return <Shield className="w-8 h-8 text-primary mb-4" />;
      case 'copyright registration': return <FileText className="w-8 h-8 text-primary mb-4" />;
      case 'patent filing': return <Award className="w-8 h-8 text-primary mb-4" />;
      case 'legal consultation': return <Briefcase className="w-8 h-8 text-primary mb-4" />;
      default: return <Shield className="w-8 h-8 text-primary mb-4" />;
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section id="home" className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Subtle animated background (CSS classes can be added if needed) */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1508] via-background to-background"></div>
        <div className="absolute inset-0 z-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')]"></div>
        
        <div className="container mx-auto px-4 z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm uppercase tracking-widest font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Pakistan's Premier Legal Firm
          </div>
          
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <span className="gold-gradient-text block mb-2">ORAKSER</span>
          </h1>
          
          <p className="text-xl md:text-3xl font-serif text-white mb-4 max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
            Protecting Innovation, <span className="italic text-primary">Empowering Legacies.</span>
          </p>
          
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            Gold-standard intellectual property protection, trademark law, and corporate registration for those who demand nothing but the best.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
            <a href="https://wa.me/923000091881" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gold-gradient-bg text-black font-bold h-14 px-8 text-lg rounded-none hover:opacity-90 transition-opacity w-full sm:w-auto">
                Free Trademark Consultation <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </a>
            <Button size="lg" variant="outline" className="border-primary text-primary h-14 px-8 text-lg rounded-none hover:bg-primary hover:text-black transition-colors w-full sm:w-auto" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore Services
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-background relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold gold-gradient-text mb-4">Our Expertise</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Comprehensive legal solutions tailored for visionaries and market leaders.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service) => (
              <div key={service.id} className="glass-card p-6 flex flex-col group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-5 h-5 text-primary" />
                </div>
                {getIcon(service.name)}
                <h3 className="font-serif text-xl font-bold text-white mb-2">{service.name}</h3>
                <p className="text-sm text-muted-foreground mb-6 flex-grow">{service.description}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary border border-primary/30 px-3 py-1 rounded-full">
                    {service.category}
                  </span>
                  {service.price && <span className="text-sm font-medium text-white">{service.price}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="trust" className="py-24 bg-[#0a0a0a] border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-6">
                Why Industry Leaders Choose <span className="gold-gradient-text">ORAKSER</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We don't just register trademarks; we build impenetrable fortresses around your intellectual property. Zero friction, absolute transparency, and a relentless commitment to your brand's exclusivity.
              </p>
              
              <div className="space-y-6">
                {[
                  { title: "Legal Exclusivity ® Symbol", desc: "Gain immediate credibility and the absolute legal right to use the registered trademark symbol." },
                  { title: "Brand Name Protection", desc: "Prevent competitors from diluting your market presence or stealing your identity." },
                  { title: "Honest Pricing — No Hidden Fees", desc: "Premium service with complete financial transparency from consultation to certification." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1"><CheckCircle className="w-6 h-6 text-primary" /></div>
                    <div>
                      <h4 className="font-serif text-xl font-bold text-white mb-1">{item.title}</h4>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { stat: "500+", label: "Trademarks Registered" },
                { stat: "10+", label: "City Network" },
                { stat: "98%", label: "Success Rate" },
                { stat: "15+", label: "Years Experience" }
              ].map((stat, i) => (
                <div key={i} className="glass-card p-8 flex flex-col items-center justify-center text-center">
                  <span className="font-serif text-4xl md:text-5xl font-bold gold-gradient-text mb-2">{stat.stat}</span>
                  <span className="text-sm font-medium text-white uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Network Section */}
      <section id="network" className="py-24 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold gold-gradient-text mb-4">Nationwide Presence</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Operating across Pakistan to serve you wherever your business takes you.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {offices.map((office) => (
              <div key={office.id} className={`glass-card p-6 flex flex-col ${office.isHeadquarters ? 'border-primary shadow-[0_0_15px_rgba(201,168,76,0.2)] lg:scale-105 z-10' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                      {office.city}
                      {office.isHeadquarters && <span className="text-[10px] bg-primary text-black px-2 py-0.5 rounded font-sans uppercase tracking-wider font-bold">HQ</span>}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 flex-grow">{office.address}</p>
                <p className="text-sm font-medium text-white">{office.phone}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-[#050505]">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="glass-card border border-primary/20 p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <h2 className="font-serif text-4xl font-bold gold-gradient-text mb-4">Secure Your IP Today</h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Schedule a confidential consultation with our legal experts to discuss your intellectual property strategy.
                </p>
                
                <div className="space-y-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Direct Line</p>
                      <p className="font-medium text-white text-lg">+92 300 0091881</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-white text-lg">info@orakser.com</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-4">Prefer instant messaging?</p>
                  <a href="https://wa.me/923000091881" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full justify-center border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-black h-12 text-md">
                      Chat on WhatsApp
                    </Button>
                  </a>
                </div>
              </div>

              <div>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" className="bg-background/50 border-border h-12 focus-visible:ring-primary" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="john@example.com" className="bg-background/50 border-border h-12 focus-visible:ring-primary" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+92 XXX XXXXXXX" className="bg-background/50 border-border h-12 focus-visible:ring-primary" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="service"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Service Interested In</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50 border-border h-12 focus:ring-primary">
                                <SelectValue placeholder="Select a service" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-card border-border">
                              {services.map(s => (
                                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Message</FormLabel>
                          <FormControl>
                            <Textarea placeholder="How can we help you?" className="bg-background/50 border-border min-h-[120px] resize-none focus-visible:ring-primary" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full gold-gradient-bg text-black font-bold h-14 text-lg rounded-none hover:opacity-90" disabled={submitContact.isPending}>
                      {submitContact.isPending ? "Submitting..." : "Submit Consultation Request"}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function ArrowUpRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}
