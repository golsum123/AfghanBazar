import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/layouts/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — AfghanBazaar" },
      {
        name: "description",
        content:
          "AfghanBazaar is a cross-border e-commerce platform connecting Afghan and Indian sellers and buyers.",
      },
      { property: "og:title", content: "About — AfghanBazaar" },
      {
        property: "og:description",
        content: "A cross-border marketplace for Afghan and Indian products.",
      },
    ],
  }),
  component: AboutPage,
});

const pillars = [
  {
    title: "Cross-border by design",
    body: "Afghan and Indian catalogues live side by side, with currency, shipping and language handled per market.",
  },
  {
    title: "Three workspaces",
    body: "Customers, sellers and administrators each get a dedicated dashboard built on one shared design system.",
  },
  {
    title: "Scalable foundation",
    body: "Typed data services, reusable UI primitives and a managed backend keep later phases cheap to add.",
  },
];

function AboutPage() {
  return (
    <PublicLayout>
      <section className="container-page py-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">About AfghanBazaar</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          AfghanBazaar is a capstone project exploring how a modern marketplace can serve two
          neighbouring markets — Afghanistan and India — from a single, well-structured web
          application.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {pillars.map((p) => (
            <Card key={p.title} className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{p.title}</CardTitle>
                <CardDescription>{p.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-10 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Phase 1 scope</CardTitle>
            <CardDescription>
              Project setup, routing, backend connection, folder structure, public site layout,
              three dashboard shells and the shared component library.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Commerce features — products, cart, orders, CRM and reporting — are intentionally out
            of scope for this phase.
          </CardContent>
        </Card>
      </section>
    </PublicLayout>
  );
}
