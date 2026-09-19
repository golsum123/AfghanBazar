import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, MapPin, Phone } from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — AfghanBazaar" },
      {
        name: "description",
        content: "Get in touch with the AfghanBazaar team in Kabul and New Delhi.",
      },
      { property: "og:title", content: "Contact — AfghanBazaar" },
      { property: "og:description", content: "Get in touch with the AfghanBazaar team." },
    ],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email address"),
  message: z.string().min(10, "Message should be at least 10 characters"),
});

type ContactValues = z.infer<typeof contactSchema>;

const details = [
  { icon: Mail, label: "Email", value: "hello@afghanbazaar.example" },
  { icon: Phone, label: "Phone", value: "+93 (0) 20 000 0000" },
  { icon: MapPin, label: "Offices", value: "Kabul, Afghanistan · New Delhi, India" },
];

function ContactPage() {
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  function onSubmit(values: ContactValues) {
    toast.success("Message noted", {
      description: `Thanks ${values.name} — message delivery is wired up in a later phase.`,
    });
    form.reset();
  }

  return (
    <PublicLayout>
      <section className="container-page grid gap-10 py-14 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Contact us</h1>
          <p className="mt-3 text-muted-foreground">
            Questions about selling, shipping or the platform itself? Send a note and the team
            will reply.
          </p>

          <div className="mt-8 space-y-4">
            {details.map((d) => (
              <div key={d.label} className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <d.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium">{d.label}</p>
                  <p className="text-sm text-muted-foreground">{d.value}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            These contact details are placeholders — send me the real ones and I will swap them
            in.
          </p>
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Send a message</CardTitle>
            <CardDescription>We usually reply within two working days.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea rows={5} placeholder="How can we help?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Send message
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </section>
    </PublicLayout>
  );
}
