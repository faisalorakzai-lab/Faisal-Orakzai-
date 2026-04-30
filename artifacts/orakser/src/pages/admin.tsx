import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListServices, useCreateService, useUpdateService, useDeleteService,
  useListOffices, useCreateOffice, useUpdateOffice, useDeleteOffice,
  useListContactSubmissions,
  getListServicesQueryKey, getListOfficesQueryKey
} from "@workspace/api-client-react";
import type { Service, Office, CreateServiceBody, CreateOfficeBody } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm as useReactHookForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Trash2, Edit, Plus, Shield, ArrowLeft, MapPin, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const serviceSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  price: z.string(),
  icon: z.string(),
  category: z.string().min(1, "Required"),
  featured: z.boolean().default(false),
});

const officeSchema = z.object({
  city: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  isHeadquarters: z.boolean().default(false),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

export default function Admin() {
  const { data: services = [] } = useListServices();
  const { data: offices = [] } = useListOffices();
  const { data: submissions = [] } = useListContactSubmissions();
  
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  
  const createOffice = useCreateOffice();
  const updateOffice = useUpdateOffice();
  const deleteOffice = useDeleteOffice();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

  const [isOfficeDialogOpen, setIsOfficeDialogOpen] = useState(false);
  const [editingOfficeId, setEditingOfficeId] = useState<number | null>(null);

  const serviceForm = useReactHookForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: "", description: "", price: "", icon: "Shield", category: "", featured: false }
  });

  const officeForm = useReactHookForm<z.infer<typeof officeSchema>>({
    resolver: zodResolver(officeSchema),
    defaultValues: { city: "", address: "", phone: "", isHeadquarters: false, lat: 0, lng: 0 }
  });

  const openServiceDialog = (service?: Service) => {
    if (service) {
      setEditingServiceId(service.id);
      serviceForm.reset({
        name: service.name,
        description: service.description,
        price: service.price,
        icon: service.icon,
        category: service.category,
        featured: service.featured,
      });
    } else {
      setEditingServiceId(null);
      serviceForm.reset({ name: "", description: "", price: "", icon: "Shield", category: "", featured: false });
    }
    setIsServiceDialogOpen(true);
  };

  const openOfficeDialog = (office?: Office) => {
    if (office) {
      setEditingOfficeId(office.id);
      officeForm.reset({
        city: office.city,
        address: office.address,
        phone: office.phone,
        isHeadquarters: office.isHeadquarters,
        lat: office.lat,
        lng: office.lng,
      });
    } else {
      setEditingOfficeId(null);
      officeForm.reset({ city: "", address: "", phone: "", isHeadquarters: false, lat: 0, lng: 0 });
    }
    setIsOfficeDialogOpen(true);
  };

  const onServiceSubmit = (values: z.infer<typeof serviceSchema>) => {
    if (editingServiceId) {
      updateService.mutate({ id: editingServiceId, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          setIsServiceDialogOpen(false);
          toast({ title: "Service updated" });
        }
      });
    } else {
      createService.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          setIsServiceDialogOpen(false);
          toast({ title: "Service created" });
        }
      });
    }
  };

  const onOfficeSubmit = (values: z.infer<typeof officeSchema>) => {
    if (editingOfficeId) {
      updateOffice.mutate({ id: editingOfficeId, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOfficesQueryKey() });
          setIsOfficeDialogOpen(false);
          toast({ title: "Office updated" });
        }
      });
    } else {
      createOffice.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOfficesQueryKey() });
          setIsOfficeDialogOpen(false);
          toast({ title: "Office created" });
        }
      });
    }
  };

  const handleDeleteService = (id: number) => {
    if (confirm("Are you sure?")) {
      deleteService.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          toast({ title: "Service deleted" });
        }
      });
    }
  };

  const handleDeleteOffice = (id: number) => {
    if (confirm("Are you sure?")) {
      deleteOffice.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOfficesQueryKey() });
          toast({ title: "Office deleted" });
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Site
            </Link>
            <div className="h-6 w-px bg-border"></div>
            <span className="font-serif text-xl font-bold gold-gradient-text">ORAKSER ADMIN</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="mb-8 bg-card border border-border">
            <TabsTrigger value="services" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Shield className="w-4 h-4 mr-2" /> Services</TabsTrigger>
            <TabsTrigger value="offices" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><MapPin className="w-4 h-4 mr-2" /> Offices</TabsTrigger>
            <TabsTrigger value="submissions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Inbox className="w-4 h-4 mr-2" /> Contact Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="services">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-white">Services Configuration</h2>
              <Button onClick={() => openServiceDialog()} className="gold-gradient-bg text-black"><Plus className="w-4 h-4 mr-2" /> Add Service</Button>
            </div>
            
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-card">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium text-white">{service.name}</TableCell>
                      <TableCell>{service.category}</TableCell>
                      <TableCell>{service.price}</TableCell>
                      <TableCell>{service.featured ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openServiceDialog(service)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteService(service.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="offices">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-white">Office Locations</h2>
              <Button onClick={() => openOfficeDialog()} className="gold-gradient-bg text-black"><Plus className="w-4 h-4 mr-2" /> Add Office</Button>
            </div>
            
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-card">
                  <TableRow>
                    <TableHead>City</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>HQ</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offices.map((office) => (
                    <TableRow key={office.id}>
                      <TableCell className="font-medium text-white">{office.city}</TableCell>
                      <TableCell>{office.address}</TableCell>
                      <TableCell>{office.phone}</TableCell>
                      <TableCell>{office.isHeadquarters ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openOfficeDialog(office)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteOffice(office.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="submissions">
            <h2 className="text-2xl font-serif font-bold text-white mb-6">Contact Form Submissions</h2>
            
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-card">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="whitespace-nowrap">{new Date(sub.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium text-white">{sub.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{sub.email}</div>
                        <div className="text-xs text-muted-foreground">{sub.phone}</div>
                      </TableCell>
                      <TableCell>{sub.service || "-"}</TableCell>
                      <TableCell className="max-w-md truncate" title={sub.message}>{sub.message}</TableCell>
                    </TableRow>
                  ))}
                  {submissions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No submissions yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-white font-serif">{editingServiceId ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          </DialogHeader>
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} className="space-y-4">
              <FormField control={serviceForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Service Name</FormLabel><FormControl><Input {...field} className="bg-background" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={serviceForm.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} className="bg-background" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={serviceForm.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>Price (e.g. 'From PKR 15,000')</FormLabel><FormControl><Input {...field} className="bg-background" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={serviceForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} className="bg-background" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={serviceForm.control} name="featured" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Featured Service</FormLabel>
                  </div>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsServiceDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="gold-gradient-bg text-black">Save Service</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isOfficeDialogOpen} onOpenChange={setIsOfficeDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-white font-serif">{editingOfficeId ? 'Edit Office' : 'Add New Office'}</DialogTitle>
          </DialogHeader>
          <Form {...officeForm}>
            <form onSubmit={officeForm.handleSubmit(onOfficeSubmit)} className="space-y-4">
              <FormField control={officeForm.control} name="city" render={({ field }) => (
                <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} className="bg-background" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={officeForm.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} className="bg-background" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={officeForm.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} className="bg-background" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={officeForm.control} name="isHeadquarters" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Is Headquarters</FormLabel>
                  </div>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOfficeDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="gold-gradient-bg text-black">Save Office</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
