"use client";

import { Menu, LayoutDashboard, Shield, Sword } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<any> }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link href={href} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const Nav = (
    <div className="flex h-full flex-col">
      <div className="px-3 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Sword className="h-5 w-5 text-primary" />
          <span>Eden Boost</span>
        </Link>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-2 py-3">
        <div className="space-y-1">
          <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavLink href="/admin/runs" label="Admin Runs" icon={Shield} />
        </div>
      </ScrollArea>
      <div className="px-3 py-3 text-xs text-muted-foreground">v0.1.0</div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <div className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-background/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                {Nav}
              </SheetContent>
            </Sheet>
            <Link href="/" className="hidden items-center gap-2 text-sm font-semibold md:flex">
              <Sword className="h-4 w-4 text-primary" />
              <span>Eden Boost</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">Player</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/runs">Admin</Link>
            </Button>
          </div>
        </div>
      </div>
      {/* Content area with sidebar on desktop */}
      <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <div className="sticky top-20 h-[calc(100vh-5rem)] rounded-lg border border-border bg-card">
            {Nav}
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
