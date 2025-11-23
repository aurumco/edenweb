"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Momo_Signature } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Shield, Zap, Trophy, Users, BarChart3, Clock, LogOut, MessageSquare, HelpCircle, ExternalLink, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth-provider";

const logoFont = Momo_Signature({ subsets: ["latin"], weight: "400" });

export default function Home() {
  const currentYear = new Date().getFullYear();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header>
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm">
            <span className={`${logoFont.className} inline-flex h-8 px-3 items-center justify-center rounded-lg bg-primary/10 text-primary text-base tracking-wide`}>eden.</span>
          </Link>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus-visible:ring-2 focus-visible:ring-ring/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard?tab=characters">My Characters</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard?tab=runs">My Runs</Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <a href="https://discord.gg/e-den" target="_blank" rel="noopener noreferrer">Discord</a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="https://discord.com/channels/@me/1411109696894406746" target="_blank" rel="noopener noreferrer">Support</a>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="rounded-full focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="relative bg-gradient-to-b from-background via-background to-background/90">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_30%_-10%,rgba(249,115,22,0.08),transparent_60%),radial-gradient(600px_circle_at_70%_-20%,rgba(249,115,22,0.05),transparent_60%)]" />
          <div className="container relative z-10 mx-auto max-w-6xl px-4 py-16 sm:py-24">
            <div className="mb-6 flex justify-center">
              <Badge variant="outline" className="bg-primary/10 text-primary">WoW Raiding Services</Badge>
            </div>
            <h1 className="mx-auto max-w-4xl text-center text-4xl font-semibold tracking-tight sm:text-5xl">
              WoW Raid <span className="text-primary">Boosting</span> Platform
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              Professional raid boosting for Eden guild. Expert teams, guaranteed results, and seamless Discord integration.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button 
                onClick={() => router.push(user ? "/dashboard" : "/login")}
                className="gap-2"
              >
                {user ? "Go to Dashboard" : "Login via Discord"}
              </Button>
              <Button asChild variant="secondary" className="gap-2">
                <Link href="https://discord.gg/e-den" target="_blank" rel="noopener noreferrer">Join Eden <ExternalLink className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Elite Protection</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
                <Shield className="h-5 w-5 text-primary" /> Advanced account safety & encryption.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Lightning Fast</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
                <Zap className="h-5 w-5 text-primary" /> Optimized scheduling for seamless runs.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Premium Rewards</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
                <Trophy className="h-5 w-5 text-primary" /> Guaranteed loot & progress tracking.
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto max-w-6xl px-4 py-8 sm:py-12">
          <Card className="bg-transparent shadow-none">
            <CardContent className="grid gap-6 p-6 sm:grid-cols-4 text-center">
              <div>
                <div className="text-2xl font-semibold">200+</div>
                <div className="text-sm text-muted-foreground">Active Players</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">2K+</div>
                <div className="text-sm text-muted-foreground">Games Played</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">99.9%</div>
                <div className="text-sm text-muted-foreground">Server Stability</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">24/7</div>
                <div className="text-sm text-muted-foreground">Community</div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="container mx-auto max-w-6xl px-4 py-8 sm:py-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-center mb-2">Frequently Asked Questions</h2>
            <p className="text-center text-muted-foreground">Everything you need to know about Eden boosting services.</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do payouts work?</AccordionTrigger>
                  <AccordionContent>
                    Payouts are processed automatically to your balance. You can request a transfer or view your history in the dashboard. All run payments are held in escrow for 48 hours before release.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>What are the requirements?</AccordionTrigger>
                  <AccordionContent>
                    You need a max-level character, decent logs (Mythic parses preferred), and a reliable attendance record.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How do I register my wallet?</AccordionTrigger>
                  <AccordionContent>
                    Go to your Profile page or use the `/register` command in our Discord bot to link your USDT (BEP-20) wallet.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>Why is my account frozen?</AccordionTrigger>
                  <AccordionContent>
                    Accounts may be frozen for attendance violations or security checks. Contact an admin via Discord for support.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </section>

        <section className="container mx-auto max-w-6xl px-4 pb-20">
          <div className="rounded-lg p-8 text-center">
            <h2 className="text-2xl font-semibold">Ready to Transform Your WoW Experience?</h2>
            <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
              Join Eden and revolutionize your raiding with expert teams and a seamless process.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button asChild>
                <Link href="/dashboard">Get Started</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="https://discord.gg/e-den" target="_blank">Join Discord</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 bg-card/40">
        <div className="container mx-auto flex flex-col items-center gap-2 px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span> {currentYear} Eden. All rights reserved.</span>
          <span>
            Developed by Aren —{' '}
            <a href="mailto:mozafari@duck.com" className="text-primary hover:underline">
              mozafari@duck.com
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
