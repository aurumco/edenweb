"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { PlayerShell } from "@/components/player-shell";
import {
  authApi,
  UserProfile,
  characterApi,
  Character,
  CharacterInput,
  CharacterSpec,
} from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Wallet,
  Shield,
  Clock,
  Ban,
  Copy,
  AlertCircle,
  Activity,
  Target,
  Trophy,
  Plus,
  Trash,
  Pencil,
  Check,
  X
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Character State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [charLoading, setCharLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Edit State
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [editIlevel, setEditIlevel] = useState<number>(0);

  // Registration Form State
  const [newChar, setNewChar] = useState<CharacterInput>({
    char_name: "",
    char_class: "",
    ilevel: 0,
    specs: [],
  });
  const [selectedSpecs, setSelectedSpecs] = useState<CharacterSpec[]>([]);
  const [tempSpec, setTempSpec] = useState<CharacterSpec>({ spec: "", role: "DPS", type: "Melee" });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch profile data
  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileData, charsData] = await Promise.all([
        authApi.getProfile(),
        characterApi.list(),
      ]);
      setProfile(profileData);
      setCharacters(charsData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load profile data");
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
      setCharLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const maskWallet = (wallet: string) => {
    if (!wallet || wallet.length < 10) return wallet;
    return `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`;
  };

  const reliabilityScore = profile?.stats.totalRuns && profile.stats.totalRuns > 0 ? 95 : 0;

  // Character Handlers
  const handleAddSpec = () => {
    if (!tempSpec.spec) return;
    setSelectedSpecs([...selectedSpecs, { ...tempSpec }]);
    setTempSpec({ ...tempSpec, spec: "" }); // Reset spec name but keep role/type
  };

  const handleRemoveSpec = (index: number) => {
    const newSpecs = [...selectedSpecs];
    newSpecs.splice(index, 1);
    setSelectedSpecs(newSpecs);
  };

  const handleRegisterCharacter = async () => {
    try {
      if (!newChar.char_name || !newChar.char_class || newChar.ilevel <= 0) {
        toast.error("Please fill in all required fields");
        return;
      }

      await characterApi.create({
        ...newChar,
        specs: selectedSpecs,
      });

      toast.success("Character registered successfully");
      setIsRegisterOpen(false);
      setNewChar({ char_name: "", char_class: "", ilevel: 0, specs: [] });
      setSelectedSpecs([]);
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Failed to register character", error);
      toast.error("Failed to register character");
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    if (!confirm("Are you sure you want to delete this character?")) return;
    try {
      await characterApi.delete(id);
      toast.success("Character deleted");
      setCharacters(characters.filter(c => c.id !== id));
    } catch (error) {
      console.error("Failed to delete character", error);
      toast.error("Failed to delete character");
    }
  };

  const handleToggleStatus = async (char: Character) => {
    try {
      const newStatus = char.status === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";
      await characterApi.updateStatus(char.id, newStatus);
      setCharacters(characters.map(c => c.id === char.id ? { ...c, status: newStatus } : c));
      toast.success(`Character status updated to ${newStatus}`);
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Failed to update status");
    }
  };

  const handleEditCharacter = (char: Character) => {
    setEditingChar(char);
    setEditIlevel(char.ilevel);
  };

  const handleSaveEdit = async () => {
    if (!editingChar) return;
    try {
      await characterApi.update(editingChar.id, { ilevel: editIlevel });
      setCharacters(characters.map(c => c.id === editingChar.id ? { ...c, ilevel: editIlevel } : c));
      setEditingChar(null);
      toast.success("Character updated");
    } catch (error) {
      console.error("Failed to update character", error);
      toast.error("Failed to update character");
    }
  };

  if (authLoading || loading) {
    return (
      <PlayerShell>
        <div className="space-y-6">
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

        {/* Characters Section */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Characters</h2>
          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Register Character
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Register New Character</DialogTitle>
                <DialogDescription>
                  Add your WoW character to participate in raids.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Character Name</Label>
                    <Input
                      placeholder="Name"
                      value={newChar.char_name}
                      onChange={(e) => setNewChar({ ...newChar, char_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select
                      onValueChange={(v) => setNewChar({ ...newChar, char_class: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Warrior", "Paladin", "Hunter", "Rogue", "Priest", "Death Knight", "Shaman", "Mage", "Warlock", "Monk", "Druid", "Demon Hunter", "Evoker"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Item Level (3 Digits)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 480"
                    value={newChar.ilevel || ""}
                    onChange={(e) => setNewChar({ ...newChar, ilevel: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-4 border rounded-md p-4">
                  <Label>Specs & Roles</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Spec (e.g. Frost)"
                      value={tempSpec.spec}
                      onChange={(e) => setTempSpec({...tempSpec, spec: e.target.value})}
                    />
                    <Select
                      value={tempSpec.role}
                      onValueChange={(v: any) => setTempSpec({...tempSpec, role: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DPS">DPS</SelectItem>
                        <SelectItem value="Healer">Healer</SelectItem>
                        <SelectItem value="Tank">Tank</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="secondary" onClick={handleAddSpec} type="button">Add</Button>
                  </div>

                  {selectedSpecs.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedSpecs.map((s, i) => (
                        <Badge key={i} variant="outline" className="gap-1">
                          {s.spec} ({s.role})
                          <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => handleRemoveSpec(i)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleRegisterCharacter}>Register Character</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((char) => (
            <Card key={char.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{char.char_name}</CardTitle>
                    <CardDescription>{char.char_class} • {char.ilevel} ilvl</CardDescription>
                  </div>
                  <Badge variant={char.status === "AVAILABLE" ? "success" : "secondary"}>
                    {char.status || "UNAVAILABLE"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {char.specs.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {s.spec}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                     <div className="flex gap-2">
                        {editingChar?.id === char.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              className="w-20 h-8"
                              type="number"
                              value={editIlevel}
                              onChange={(e) => setEditIlevel(parseInt(e.target.value))}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEdit}>
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingChar(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleEditCharacter(char)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                     </div>
                     <div className="flex gap-2">
                        <Switch
                          checked={char.status === "AVAILABLE"}
                          onCheckedChange={() => handleToggleStatus(char)}
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteCharacter(char.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                     </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {characters.length === 0 && !charLoading && (
             <div className="col-span-full text-center p-8 text-muted-foreground border rounded-lg border-dashed">
                No characters registered. Add a character to sign up for raids.
             </div>
          )}
        </div>

        {/* Financial Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Wallet Balance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-yellow-500" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">
                {(profile.finance.currentBalance / 1000).toFixed(1)}K
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {profile.finance.currentBalance.toLocaleString()} Gold
              </p>
            </CardContent>
          </Card>

          {/* Pending Escrow */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-blue-500" />
                Pending Escrow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">
                {(profile.finance.pendingEscrow / 1000).toFixed(1)}K
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {profile.finance.pendingEscrow.toLocaleString()} Gold
              </p>
            </CardContent>
          </Card>

          {/* Wallet Address */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Wallet Address</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.user.wallet ? (
                <div className="space-y-2">
                  <p className="text-sm font-mono text-muted-foreground break-all">
                    {maskWallet(profile.user.wallet)}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1"
                    onClick={() => copyToClipboard(profile.user.wallet, "Wallet address")}
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
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
      </div>
    </PlayerShell>
  );
}
