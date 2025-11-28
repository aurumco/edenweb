"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@/components/auth-provider";
import { PlayerShell } from "@/components/player-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Shield, Heart, Wand2, TrendingUp } from "lucide-react";
import { characterApi, runApi, signupApi, Character as ApiCharacter, Run as ApiRun, Signup as ApiSignup, CharacterSpec } from "@/lib/api";

const ROLES = ["Tank", "Healer", "DPS"] as const;
const WOW_CLASSES = [
  "Warrior",
  "Paladin",
  "Hunter",
  "Rogue",
  "Priest",
  "Death Knight",
  "Shaman",
  "Mage",
  "Warlock",
  "Monk",
  "Druid",
  "Demon Hunter",
  "Evoker",
] as const;

type Role = (typeof ROLES)[number];

type Character = ApiCharacter;

type CharacterForm = {
  ilevel: string;
  char_class: string;
  roles: Record<Role, boolean>;
  char_name?: string;
};

type TestRun = ApiRun & {
  participants?: number;
  reward?: string;
  progress?: string;
};

const SERVER_ID = process.env.NEXT_PUBLIC_SERVER_ID || "980165146762674186";

function PlayerDashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab") === "runs" ? "runs" : "characters";
  const [tab, setTab] = useState<"characters" | "runs">(initialTabParam);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [signups, setSignups] = useState<ApiSignup[]>([]);
  const [edit, setEdit] = useState<Character | null>(null);
  const [pageChars, setPageChars] = useState(1);
  const [pageRuns, setPageRuns] = useState(1);
  const [loadingChars, setLoadingChars] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [submittingChar, setSubmittingChar] = useState(false);
  const [signupLoading, setSignupLoading] = useState<string | null>(null);
  const pageSize = 10;

  const form = useForm<CharacterForm>({
    defaultValues: {
      ilevel: "",
      char_class: "",
      roles: { Tank: false, Healer: false, DPS: false },
      char_name: "",
    },
    mode: "onChange",
  });

  const editForm = useForm<CharacterForm>({
    defaultValues: {
      ilevel: "",
      char_class: "",
      roles: { Tank: false, Healer: false, DPS: false },
      char_name: "",
    },
    mode: "onChange",
  });

  // Fetch characters on mount
  useEffect(() => {
    if (!authLoading && user) {
      fetchCharacters();
      fetchRuns();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (edit) {
      const roles = { Tank: false, Healer: false, DPS: false };
      edit.specs.forEach(s => {
        if (roles[s.role as Role] !== undefined) roles[s.role as Role] = true;
      });
      editForm.reset({
        ilevel: String(edit.ilevel),
        char_class: edit.char_class,
        roles: roles,
        char_name: edit.char_name,
      });
    }
  }, [edit]);

  const fetchCharacters = async () => {
    try {
      setLoadingChars(true);
      const data = await characterApi.list();
      // Ensure specs is array, if string parse it (though type says array, sometimes API might return string)
      const sanitizedData = data.map((c) => {
        let parsedLocks = c.locks || {};
        // Defensive: try parsing locks if it comes as a string (similar to specs)
        if (typeof parsedLocks === "string") {
            try {
                parsedLocks = JSON.parse(parsedLocks);
            } catch {
                parsedLocks = {};
            }
        }

        return {
            ...c,
            specs: Array.isArray(c.specs) ? c.specs : (typeof c.specs === "string" ? JSON.parse(c.specs) : []),
            status: c.status ?? "AVAILABLE",
            locks: parsedLocks,
        };
      });
      setCharacters(sanitizedData);
    } catch (err) {
      toast.error("Failed to load characters");
      console.error(err);
    } finally {
      setLoadingChars(false);
    }
  };

  const fetchRuns = async () => {
    try {
      setLoadingRuns(true);
      const data = await runApi.list(SERVER_ID);
      setRuns(data);
      const runIds = data.map(r => r.id);
      const allSignups: ApiSignup[] = [];
      await Promise.all(runIds.map(async (rid) => {
          try {
              const s = await signupApi.list(rid);
              const mySignup = s.find((x: any) => x.user_id === user?.userId); // Assuming user_id matches
              if (mySignup) allSignups.push(mySignup);
          } catch {}
      }));
      setSignups(allSignups);

    } catch (err) {
      toast.error("Failed to load runs");
      console.error(err);
    } finally {
      setLoadingRuns(false);
    }
  };

  const runsStats = useMemo(
    () => ({
      upcoming: runs.filter((r) => r.status === "PENDING").length,
      active: runs.filter((r) => r.status === "ACTIVE").length,
      completed: runs.filter((r) => r.status === "COMPLETED").length,
    }),
    [runs]
  );

  async function onSubmit(data: CharacterForm) {
    const ilevelOk = /^\d{3}$/.test(String(data.ilevel));
    if (!ilevelOk) {
      toast.error("iLevel must be a 3-digit number.");
      return;
    }
    if (!data.char_class) {
      toast.error("Class is required.");
      return;
    }
    const selectedRoles = ROLES.filter((r) => data.roles[r]);
    if (selectedRoles.length === 0) {
      toast.error("Select at least one role.");
      return;
    }

    // Map roles to specs
    const specs: CharacterSpec[] = selectedRoles.map(r => ({
        spec: r, // Using Role as Spec name since we don't have specific specs
        role: r,
        type: r === "Tank" || r === "Healer" ? "Melee" : "Ranged" // Simplified type logic, ideally should be based on class/spec
    }));

    try {
      setSubmittingChar(true);
      await characterApi.create({
        char_name: data.char_name?.trim() || "Unnamed",
        char_class: data.char_class,
        ilevel: Number(data.ilevel),
        specs: specs,
      });
      toast.success("Character added.");
      form.reset({ ilevel: "", char_class: "", roles: { Tank: false, Healer: false, DPS: false }, char_name: "" });
      await fetchCharacters();
    } catch (err) {
      toast.error("Failed to add character");
      console.error(err);
    } finally {
      setSubmittingChar(false);
    }
  }

  async function onEditSubmit(data: CharacterForm) {
      if (!edit) return;
      const ilevelOk = /^\d{3}$/.test(String(data.ilevel));
      if (!ilevelOk) {
        toast.error("iLevel must be a 3-digit number.");
        return;
      }

      // Map roles to specs (assuming we can update specs too, if not API will ignore)
      const selectedRoles = ROLES.filter((r) => data.roles[r]);
      const specs: CharacterSpec[] = selectedRoles.map(r => ({
          spec: r,
          role: r,
          type: r === "Tank" || r === "Healer" ? "Melee" : "Ranged"
      }));

      try {
          setSubmittingChar(true);
          await characterApi.update(edit.id, {
            char_name: data.char_name?.trim(),
            char_class: data.char_class,
            ilevel: Number(data.ilevel),
            specs: specs
          });
          toast.success("Character updated.");
          setEdit(null);
          await fetchCharacters();
      } catch (err) {
          toast.error("Failed to update character");
          console.error(err);
      } finally {
          setSubmittingChar(false);
      }
  }

  async function removeCharacter(id: string) {
    try {
      await characterApi.delete(id);
      setCharacters((prev) => prev.filter((c) => c.id !== id));
      toast.success("Character deleted.");
    } catch (err) {
      toast.error("Failed to delete character");
      console.error(err);
    }
  }

  const pagedCharacters = useMemo(() => {
    const start = (pageChars - 1) * pageSize;
    return characters.slice(start, start + pageSize);
  }, [characters, pageChars]);

  const myRuns = useMemo(() => {
      const myRunIds = new Set(signups.map(s => s.run_id));
      return runs.filter(r => myRunIds.has(r.id));
  }, [runs, signups]);

  const pagedRuns = useMemo(() => {
    const start = (pageRuns - 1) * pageSize;
    return myRuns.slice(start, start + pageSize);
  }, [myRuns, pageRuns]);

  const stats = useMemo(() => ({
    total: characters.length,
    available: characters.filter((c) => c.status !== "UNAVAILABLE").length,
    avgILevel: characters.length > 0 ? Math.round(characters.reduce((sum, c) => sum + c.ilevel, 0) / characters.length) : 0,
  }), [characters]);

  const handleToggleLock = async (character: Character, difficulty: string) => {
    // Check if system locked
    const lockInfo = character.locks?.[difficulty];
    if (lockInfo?.isLockedBySystem) {
        toast.error("This lock is managed by the system and cannot be changed.");
        return;
    }

    const currentStatus = lockInfo?.status || "AVAILABLE";
    
    // Logic:
    // If LOCKED -> Unlocks to AVAILABLE
    // If AVAILABLE -> Locks to LOCKED
    
    const newStatus = currentStatus === "LOCKED" ? "AVAILABLE" : "LOCKED";
    const oldLocks = { ...character.locks };

    // Optimistic update
    setCharacters(prev => prev.map(c => {
        if (c.id !== character.id) return c;
        const newLocks = { ...(c.locks || {}) };

        // Update the lock object
        newLocks[difficulty] = {
            status: newStatus as "AVAILABLE" | "LOCKED" | "PENDING",
            isLocked: newStatus === "LOCKED",
            isLockedBySystem: false
        };

        return { ...c, locks: newLocks };
    }));

    try {
        await characterApi.updateStatus(character.id, { difficulty, status: newStatus });
        toast.success(`Marked ${difficulty} as ${newStatus === "LOCKED" ? "Locked" : "Available"}.`);
    } catch (err) {
        toast.error("Failed to update status");
        // Revert
        setCharacters(prev => prev.map(c => c.id === character.id ? { ...c, locks: oldLocks } : c));
    }
  };

  const handleCancelSignup = async (runId: string) => {
      try {
          setSignupLoading(runId);
          const signup = signups.find(s => s.run_id === runId);
          if (signup) {
              await signupApi.create(runId, { signup_type: "DECLINE" });
              setSignups(prev => prev.filter(s => s.run_id !== runId));
              toast.success("Signup cancelled.");
              fetchRuns();
          }
      } catch (err) {
          toast.error("Failed to cancel signup");
          console.error(err);
      } finally {
          setSignupLoading(null);
      }
  };

  function onTabChange(v: string) {
    const next = v === "runs" ? "runs" : "characters";
    setTab(next);
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    sp.set("tab", next);
    router.replace(`?${sp.toString()}`, { scroll: false });
  }

  useEffect(() => {
    const q = searchParams.get("tab");
    const next = q === "runs" ? "runs" : "characters";
    setTab((prev) => (prev !== next ? next : prev));
  }, [searchParams]);

  return (
    <PlayerShell>
      <div className="space-y-6">
        <Tabs value={tab} onValueChange={onTabChange} className="w-full">
          <TabsList className="grid w-fit grid-cols-2 h-auto bg-transparent p-0 gap-2 mb-4">
            <TabsTrigger value="characters" className="rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Characters</TabsTrigger>
            <TabsTrigger value="runs" className="rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">My Runs</TabsTrigger>
          </TabsList>

          <TabsContent value="characters" className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 duration-300 ease-out">
            {loadingChars ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <div className="rounded-xl bg-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                  <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">Total</div>
                </div>
                <div className="text-xs text-muted-foreground">Characters</div>
              </div>
              <div className="rounded-xl bg-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-2xl font-bold text-foreground">{stats.avgILevel}</div>
                  <div className="text-xs font-medium text-sky-500 bg-sky-500/10 px-2 py-1 rounded-md">Average</div>
                </div>
                <div className="text-xs text-muted-foreground">iLevel</div>
              </div>
              <div className="rounded-xl bg-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-2xl font-bold text-foreground">{stats.available}</div>
                  <div className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">Available</div>
                </div>
                <div className="text-xs text-muted-foreground">Total Available</div>
              </div>
            </div>
            )}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>My Characters</CardTitle>
                  <CardDescription>Manage your characters and their availability.</CardDescription>
                </div>
                <Dialog onOpenChange={(open) => { if (!open) form.reset(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <Plus className="h-4 w-4" /> Add Character
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
                    <DialogHeader>
                      <DialogTitle>Add Character</DialogTitle>
                      <DialogDescription>Enter the character details.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(onSubmit as any)} className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="char_name">Name</Label>
                        <Input id="char_name" placeholder="e.g., Arthas" value={form.watch("char_name") || ""} onChange={(e) => form.setValue("char_name", e.target.value)} />
                      </div>
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="char_class">Class</Label>
                          <Select value={form.watch("char_class")} onValueChange={(v) => form.setValue("char_class", v, { shouldValidate: true })}>
                            <SelectTrigger id="char_class" className="w-full">
                              <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                            <SelectContent className="w-full">
                              {WOW_CLASSES.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="ilevel">iLevel</Label>
                          <Input id="ilevel" inputMode="numeric" placeholder="720" value={form.watch("ilevel")} onChange={(e) => form.setValue("ilevel", e.target.value)} />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Roles</Label>
                        <div className="flex flex-wrap items-center gap-2">
                          {ROLES.map((r) => {
                            const isSelected = form.watch(`roles.${r}` as const);
                            const Icon = r === "Tank" ? Shield : r === "Healer" ? Heart : Wand2;
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => form.setValue(`roles.${r}` as const, !isSelected)}
                                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card text-foreground hover:bg-accent"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                                {r}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="submit" disabled={submittingChar}>Save</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={!!edit} onOpenChange={(open) => { if(!open) setEdit(null); }}>
                    <DialogContent className="bg-card">
                    <DialogHeader>
                      <DialogTitle>Edit Character</DialogTitle>
                      <DialogDescription>Update the character details.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit as any)} className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit_char_name">Name</Label>
                        <Input id="edit_char_name" placeholder="e.g., Arthas" value={editForm.watch("char_name") || ""} onChange={(e) => editForm.setValue("char_name", e.target.value)} />
                      </div>
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit_char_class">Class</Label>
                          <Select value={editForm.watch("char_class")} onValueChange={(v) => editForm.setValue("char_class", v, { shouldValidate: true })}>
                            <SelectTrigger id="edit_char_class" className="w-full">
                              <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                            <SelectContent className="w-full">
                              {WOW_CLASSES.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit_ilevel">iLevel</Label>
                          <Input id="edit_ilevel" inputMode="numeric" placeholder="720" value={editForm.watch("ilevel")} onChange={(e) => editForm.setValue("ilevel", e.target.value)} />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Roles</Label>
                        <div className="flex flex-wrap items-center gap-2">
                          {ROLES.map((r) => {
                            const isSelected = editForm.watch(`roles.${r}` as const);
                            const Icon = r === "Tank" ? Shield : r === "Healer" ? Heart : Wand2;
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => editForm.setValue(`roles.${r}` as const, !isSelected)}
                                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card text-foreground hover:bg-accent"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                                {r}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="submit" disabled={submittingChar}>Update</Button>
                      </div>
                    </form>
                    </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingChars ? (
                  <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full rounded-md" />
                    ))}
                  </div>
                ) : (
                <div key={pageChars} className="animate-in fade-in-0 duration-150 ease-out">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>iLevel</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {characters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No characters yet.</TableCell>
                      </TableRow>
                    ) : (
                      pagedCharacters.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.char_name || "—"}</TableCell>
                          <TableCell className="text-sm">{c.char_class}</TableCell>
                          <TableCell className="text-sm">{c.ilevel}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(c.specs || []).map((s) => {
                                const specName = typeof s === "string" ? s : (s.spec || s.role);
                                const role = typeof s === "string" ? s : s.role;
                                let badgeClass = "text-xs rounded-full px-2 py-0.5";
                                if (role === "Tank") badgeClass += " bg-lime-500/50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400";
                                else if (role === "Healer") badgeClass += " bg-fuchsia-500/50 text-fuchsia-700 dark:bg-fuchsia-400/10 dark:text-fuchsia-400";
                                else badgeClass += " bg-rose-500/50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400";
                                return (
                                  <Badge key={`${c.id}-${specName}`} variant="outline" className={badgeClass}>{specName}</Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-3">
                              <div className="flex items-center gap-1.5">
                                {["Mythic", "Heroic", "Normal"].map((diff) => {
                                    const short = diff[0];
                                    const lockInfo = c.locks?.[diff];
                                    const rawStatus = lockInfo?.status || "AVAILABLE";
                                    const status = rawStatus.toUpperCase(); // Ensure case-insensitive check
                                    const isLockedBySystem = lockInfo?.isLockedBySystem || false;
                                    
                                    // Logic: Green (Available), Red (Locked), Yellow (Pending)
                                    let variant: "destructive" | "success" | "warning" = "success";
                                    if (status === "LOCKED") variant = "destructive";
                                    else if (status === "PENDING") variant = "warning";
                                    
                                    // Allow Green <-> Red. Disable Yellow (PENDING) and System Locked.
                                    const canToggle = status !== "PENDING" && !isLockedBySystem;
                                    
                                    return (
                                        <Badge 
                                            key={diff} 
                                            variant={variant}
                                            className={cn(
                                                "text-[11px] px-1.5 py-0.5 font-semibold rounded-md transition-opacity border-0",
                                                canToggle ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed opacity-70"
                                            )}
                                            onClick={() => {
                                                if (canToggle) handleToggleLock(c, diff);
                                            }}
                                            title={`${diff}: ${status}${isLockedBySystem ? " (System Locked)" : ""}`}
                                        >
                                            {short}
                                            {isLockedBySystem && <span className="sr-only">(Locked)</span>}
                                        </Badge>
                                    );
                                })}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost">⋯</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEdit(c)}>
                                      <Pencil className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onSelect={(e) => e.preventDefault()}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Character</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this character? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <div className="flex justify-end gap-2">
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => removeCharacter(c.id)}>Delete</AlertDialogAction>
                                      </div>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  </Table>
                {characters.length > pageSize && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs">
                    <span className="text-muted-foreground">Page {pageChars} / {Math.max(1, Math.ceil(characters.length / pageSize))}</span>
                    <Button variant="secondary" size="sm" disabled={pageChars === 1} onClick={() => setPageChars((p) => Math.max(1, p - 1))}>Prev</Button>
                    <Button variant="secondary" size="sm" disabled={pageChars >= Math.ceil(characters.length / pageSize)} onClick={() => setPageChars((p) => Math.min(Math.ceil(characters.length / pageSize), p + 1))}>Next</Button>
                  </div>
                )}
              </div>
              )}
            </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="runs" className="space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 duration-300 ease-out">
            {loadingRuns ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <div className="rounded-xl bg-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-2xl font-bold text-foreground">{runsStats.upcoming}</div>
                  <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">Upcoming</div>
                </div>
                <div className="text-xs text-muted-foreground">Scheduled</div>
              </div>
              <div className="rounded-xl bg-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-2xl font-bold text-foreground">{runsStats.active}</div>
                  <div className="text-xs font-medium text-sky-500 bg-sky-500/10 px-2 py-1 rounded-md">Active</div>
                </div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div className="rounded-xl bg-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-2xl font-bold text-foreground">{runsStats.completed}</div>
                  <div className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">Done</div>
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle>My Runs</CardTitle>
                <CardDescription>Runs you have signed for.</CardDescription>
              </CardHeader>
              <CardContent>
                {myRuns.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="text-sm text-muted-foreground">You haven't signed up for any runs.</div>
                  </div>
                ) : (
                  <>
                    {loadingRuns ? (
                      <div className="space-y-3">
                        {[...Array(6)].map((_, i) => (
                          <Skeleton key={i} className="h-8 w-full rounded-md" />
                        ))}
                      </div>
                    ) : (
                    <div key={pageRuns} className="animate-in fade-in-0 duration-150 ease-out">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Run Title</TableHead>
                          <TableHead className="hidden sm:table-cell">Difficulty</TableHead>
                          <TableHead>Scheduled</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedRuns.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium truncate">{r.title}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant={r.difficulty === "Mythic" ? "mythic" : r.difficulty === "Heroic" ? "heroic" : "normal"} className="px-2 py-0.5 text-xs rounded-full">{r.difficulty}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(r.scheduled_at).toLocaleDateString('en-GB', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')}</TableCell>
                            <TableCell>
                              <Badge variant={r.status === "ACTIVE" ? "success" : r.status === "PENDING" ? "warning" : "info"} className="px-2 py-0.5 text-xs rounded-full">{r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase()}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {r.status !== "COMPLETED" && (
                                    <Button
                                        size="sm"
                                        className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 border-0"
                                        disabled={signupLoading === r.id}
                                        onClick={() => handleCancelSignup(r.id)}
                                    >
                                        {signupLoading === r.id ? "Cancelling..." : "Cancel"}
                                    </Button>
                                )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {myRuns.length > pageSize && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-xs">
                        <span className="text-muted-foreground">Page {pageRuns} / {Math.max(1, Math.ceil(myRuns.length / pageSize))}</span>
                        <Button variant="secondary" size="sm" disabled={pageRuns === 1} onClick={() => setPageRuns((p) => Math.max(1, p - 1))}>Prev</Button>
                        <Button variant="secondary" size="sm" disabled={pageRuns >= Math.ceil(myRuns.length / pageSize)} onClick={() => setPageRuns((p) => Math.min(Math.ceil(myRuns.length / pageSize), p + 1))}>Next</Button>
                      </div>
                    )}
                    </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </PlayerShell>
  );
}

export default function PlayerDashboardPage() {
  return (
    <Suspense fallback={<PlayerShell><div>Loading...</div></PlayerShell>}>
      <PlayerDashboardContent />
    </Suspense>
  );
}
