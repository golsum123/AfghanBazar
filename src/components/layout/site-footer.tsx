import { Link } from "@tanstack/react-router";
import { Brand } from "@/components/common/brand";

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Brand />
          <p className="max-w-xs text-sm text-muted-foreground">
            A modern cross-border marketplace connecting Afghan and Indian sellers with buyers
            across both markets.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Platform</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/marketplace" className="hover:text-foreground">
                Marketplace
              </Link>
            </li>
            <li>
              <Link to="/seller" className="hover:text-foreground">
                Seller portal
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-foreground">
                Customer dashboard
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-foreground">
                Admin console
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/about" className="hover:text-foreground">
                About
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Project</h4>
          <p className="mt-3 text-sm text-muted-foreground">
            Capstone Project – Developed using React.js
          </p>
        </div>
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 AfghanBazaar. All rights reserved.</p>
          <p>Kabul · New Delhi</p>
        </div>
      </div>
    </footer>
  );
}
