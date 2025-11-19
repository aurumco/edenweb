"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { PlayerShell } from "@/components/player-shell";
import { authApi, UserProfile } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Wallet, Shield, Clock, Ban, Copy, AlertCircle, Activity, Target, Trophy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch profile data
  useEffect(() => {
    if (!authLoading && user) {
      const fetchProfile = async () => {
        try {
          setLoading(true);
          const data = await authApi.getProfile();
          setProfile(data);
          setError(null);
        } catch (err) {
          console.error("Failed to fetch profile:", err);
          setError("Failed to load profile data");
          toast.error("Failed to load profile");
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    }
  }, [authLoading, user]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const maskWallet = (wallet: string) => {
    if (!wallet || wallet.length < 10) return wallet;
    return `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`;
  };

  const totalRuns = profile?.stats.totalRuns ?? 0;
  const reliabilityScore = totalRuns > 0 ? 95 : 0;

  if (authLoading || loading) {
    return (
      <PlayerShell>
        <div className="space-y-6">
          {/* Identity Card Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Finance Cards Skeleton */}
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stats Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        </div>
      </PlayerShell>
    );
  }

  if (error || !profile) {
    return (
      <PlayerShell>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Loading Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error || "Failed to load profile data"}</p>
          </CardContent>
        </Card>
      </PlayerShell>
    );
  }

  return (
    <PlayerShell>
      <div className="space-y-6">
        {/* Identity Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <Avatar className="h-16 w-16 flex-shrink-0">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback>{user?.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="text-xl sm:text-2xl truncate">{profile.user.displayName}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Eden Member Since {format(new Date(profile.user.joinDate), "MMMM yyyy")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Badge variant={profile.finance.isFrozen ? "destructive" : "default"} className="gap-1 text-xs sm:text-sm">
                  {profile.finance.isFrozen ? (
                    <>
                      <Ban className="h-3 w-3" />
                      Frozen
                    </>
                  ) : (
                    <>
                      <Shield className="h-3 w-3" />
                      Active
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Financial Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Wallet Balance",
              icon: Wallet,
              accent: "text-amber-400",
              glow: "from-amber-500/15",
              value: profile.finance.currentBalance,
            },
            {
              title: "Pending Escrow",
              icon: Clock,
              accent: "text-sky-400",
              glow: "from-sky-500/15",
              value: profile.finance.pendingEscrow,
            },
          ].map((card) => (
            <Card key={card.title} className="border border-border/60 bg-card/60 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className={`rounded-full bg-gradient-to-br ${card.glow} to-transparent p-2 ${card.accent}`}>
                    <card.icon className="h-4 w-4" />
                  </span>
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-semibold ${card.accent}`}>
                  {(card.value / 1000).toFixed(1)}K
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.value.toLocaleString()} USDT
                </p>
              </CardContent>
            </Card>
          ))}

          <Card className="border border-border/60 bg-card/60 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="rounded-full bg-gradient-to-br from-zinc-500/15 to-transparent p-2 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                </span>
                Wallet Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.user.wallet ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 font-mono text-sm text-muted-foreground break-all">
                    {maskWallet(profile.user.wallet)}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full gap-1"
                    onClick={() => copyToClipboard(profile.user.wallet, "Wallet address")}
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-amber-500">
                    <AlertCircle className="h-4 w-4" />
                    No Wallet Set
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Register your USDT (BEP-20) wallet to receive payouts.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Performance
            </CardTitle>
            <CardDescription>Your activity and reliability metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Runs Attended</p>
                    <p className="text-4xl font-semibold text-foreground">{profile.stats.totalRuns}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Active participation across Eden rostered runs.</p>
              </div>

              <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Reliability Score</p>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-semibold text-emerald-500">{profile.stats.totalRuns > 0 ? `${reliabilityScore}%` : "—"}</p>
                      {profile.stats.totalRuns > 0 && (
                        <Badge variant="success" className="text-[10px] px-2 py-0.5">Stable</Badge>
                      )}
                    </div>
                  </div>
                  <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-400">
                    <Target className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary"
                    style={{ width: `${profile.stats.totalRuns > 0 ? reliabilityScore : 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {profile.stats.totalRuns > 0 ? "Consistency measured from attendance and punctuality." : "Complete more runs to unlock your score."}
                </p>
              </div>

              <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Next Milestone</p>
                    <p className="text-4xl font-semibold text-foreground">{Math.max(10 - profile.stats.totalRuns, 0)}</p>
                  </div>
                  <div className="rounded-full bg-amber-500/10 p-2 text-amber-400">
                    <Trophy className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Runs remaining to unlock premium payouts tier.
                </p>
                <div className="mt-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Tip:</span> Stay available and sign up early for high-demand raids.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aliases Section */}
        {profile.aliases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Aliases</CardTitle>
              <CardDescription>Your registered character aliases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.aliases.map((alias) => (
                  <Badge key={alias} variant="secondary">
                    {alias}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PlayerShell>
  );
}
