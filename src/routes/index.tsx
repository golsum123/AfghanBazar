import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Globe2,
  LayoutDashboard,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { PublicLayout } from "@/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import heroImage from "@/assets/hero-marketplace.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AfghanBazaar — Afghan & Indian Products, One Marketplace" },
      {
        name: "description",
        content:
          "AfghanBazaar is a modern cross-border e-commerce platform bringing Afghan and Indian sellers and buyers together in one trusted marketplace.",
      },
      { property: "og:title", content: "AfghanBazaar — Afghan & Indian Products" },
      {
        property: "og:description",
        content: "A modern cross-border marketplace for Afghan and Indian products.",
      },
    ],
  }),
  component: HomePage,
});

const features = [
  {
    icon: Globe2,
    title: "Two markets, one platform",
    body: "Afghan and Indian catalogues under a single account, with market-aware pricing and shipping.",
  },
  {
    icon: ShieldCheck,
    title: "Verified sellers",
    body: "Shop onboarding and moderation tools keep listings trustworthy on both sides of the border.",
  },
  {
    icon: Truck,
    title: "Cross-border logistics",
    body: "Shipment tracking designed for international delivery routes between Kabul and Delhi.",
  },
  {
    icon: PackageCheck,
    title: "Built to scale",
    body: "A typed, modular foundation so catalogue, cart, orders and CRM slot in cleanly.",
  },
];

const workspaces = [
  {
    icon: LayoutDashboard,
    title: "Customer dashboard",
    body: "Orders, deliveries, wishlist and account preferences.",
    to: "/dashboard" as const,
    cta: "Open dashboard",
  },
  {
    icon: Store,
    title: "Seller portal",
    body: "Shop profile, inventory and payout overview for merchants.",
    to: "/seller" as const,
    cta: "Open seller portal",
  },
  {
    icon: Users,
    title: "Admin console",
    body: "Platform metrics, user administration and moderation queue.",
    to: "/admin" as const,
    cta: "Open admin console",
  },
];

function HomePage() {
  return (
    <PublicLayout>
      <section className="border-b bg-card">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <Badge variant="secondary">Cross-border marketplace</Badge>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Afghan and Indian products,{" "}
              <span className="text-primary">one modern marketplace</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              AfghanBazaar connects merchants in Afghanistan and India with buyers across both
              markets — handmade rugs, saffron, dried fruits, textiles and more.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/marketplace">
                  Explore the marketplace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/seller">Start selling</Link>
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border shadow-card">
            <img
              src={heroImage}
              alt="Afghan and Indian products including saffron, dried fruits, a brass teapot and a hand-knotted rug"
              width={1600}
              height={1104}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Why AfghanBazaar
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="shadow-none">
              <CardHeader>
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <f.icon className="size-5" />
                </span>
                <CardTitle className="mt-3 text-base">{f.title}</CardTitle>
                <CardDescription>{f.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/40">
        <div className="container-page py-14">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Three workspaces
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Each role gets a purpose-built dashboard sharing the same components and design
              language.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {workspaces.map((w) => (
              <Card key={w.title} className="flex flex-col shadow-none">
                <CardHeader>
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <w.icon className="size-5" />
                  </span>
                  <CardTitle className="mt-3 text-base">{w.title}</CardTitle>
                  <CardDescription>{w.body}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button asChild variant="outline" className="w-full">
                    <Link to={w.to}>{w.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
