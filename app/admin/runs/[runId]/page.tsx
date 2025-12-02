"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Shield, Heart, Wand2, X, ChevronDown, Check, CircleX, HelpCircle } from "lucide-react";
import { signupApi, rosterApi, runApi, characterApi, RosterSlot, Character as ApiCharacter, Signup as ApiSignup, CharacterLogs } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DIFFICULTIES = ["Mythic", "Heroic", "Normal"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

type SlotRole = "Tank" | "Healer" | "DPS";

const SPEC_ROLES: Record<string, SlotRole> = {
  // Tanks
  "Blood": "Tank", "Vengeance": "Tank", "Guardian": "Tank", "Brewmaster": "Tank", "Protection": "Tank",
  // Healers
  "Restoration": "Healer", "Holy": "Healer", "Discipline": "Healer", "Mistweaver": "Healer", "Preservation": "Healer",
  // DPS
  "Frost": "DPS", "Unholy": "DPS", "Havoc": "DPS", "Balance": "DPS", "Feral": "DPS", "Augmentation": "DPS", "Devastation": "DPS", "Beast Mastery": "DPS", "Marksmanship": "DPS", "Survival": "DPS", "Arcane": "DPS", "Fire": "DPS", "Windwalker": "DPS", "Retribution": "DPS", "Shadow": "DPS", "Assassination": "DPS", "Outlaw": "DPS", "Subtlety": "DPS", "Elemental": "DPS", "Enhancement": "DPS", "Affliction": "DPS", "Demonology": "DPS", "Destruction": "DPS", "Arms": "DPS", "Fury": "DPS"
};

interface Player { id: string; name: string }
interface CharacterStatus { M: "G" | "Y" | "R"; H: "G" | "Y" | "R"; N: "G" | "Y" | "R" }

interface Character {
  id: string;
  class: string;
  ilevel: number;
  roles: SlotRole[]; // e.g. ["Healer", "DPS"]
  log?: number; // e.g. 99 (deprecated for logsData)
  status: CharacterStatus;
  name?: string; // character name
  apiStatus: "AVAILABLE" | "UNAVAILABLE";
  specsStr?: string;
  logsData?: CharacterLogs;
}

interface Signup {
  player: Player;
  signed: boolean;
  backup: boolean;
  characters: Character[];
}

interface Assignment {
    playerId: string;
    characterId: string;
    class: string;
    ilevel: number;
    name: string;
    charName: string;
    spec?: string;
    logs?: CharacterLogs;
}

const CLASS_COLORS: Record<string, string> = {
  "Warrior": "#C79C6E",
  "Paladin": "#F58CBA",
  "Hunter": "#ABD473",
  "Rogue": "#FFF569",
  "Priest": "#ffe4fdff",
  "Death Knight": "#C41F3B",
  "Shaman": "#0070DE",
  "Mage": "#69CCF0",
  "Warlock": "#9482C9",
  "Monk": "#00FF96",
  "Druid": "#FF7D0A",
  "Demon Hunter": "#A330C9",
  "Evoker": "#33937F",
};

function classGradient(color: string) {
  return {
    backgroundImage: `linear-gradient(175deg, ${color}aa, ${color}33 25%, transparent 35%)`,
  } as React.CSSProperties;
}

export default function AdminRunDetailsPage() {
  const params = useParams<{ runId: string }>();
  const runId = params?.runId ?? "unknown";
  const [run, setRun] = useState<any>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("Mythic");
  const [signups, setSignups] = useState<Signup[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<SlotRole | "All">("All");
  const allClasses = useMemo(() => Array.from(new Set(signups.flatMap(s => s.characters.map(c => c.class)))).sort(), [signups]);
  const [classFilter, setClassFilter] = useState<string | "All">("All");
  const [mention, setMention] = useState(false);
  
  // Initial capacities, updated after run fetch
  const [capacities, setCapacities] = useState<Record<SlotRole, number>>({ Tank: 2, Healer: 4, DPS: 14 });

  const [roster, setRoster] = useState<Record<SlotRole, (Assignment | null)[]>>({
    Tank: Array.from({ length: 2 }, () => null),
    Healer: Array.from({ length: 4 }, () => null),
    DPS: Array.from({ length: 14 }, () => null),
  });

  // Fetch signups, roster, and characters on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Also fetch run for capacities
        const [runData, signupsData, rosterData] = await Promise.all([
            runApi.get("unused", runId), // serverId is unused in my new api implementation
            signupApi.list(runId),
            rosterApi.get(runId),
        ]);

        setRun(runData);
        setCapacities({
            Tank: runData.tank_capacity,
            Healer: runData.healer_capacity,
            DPS: runData.dps_capacity
        });
        setDifficulty(runData.difficulty);

        // Re-initialize roster based on new capacity
        const newRoster = {
            Tank: Array.from({ length: runData.tank_capacity }, () => null) as (Assignment | null)[],
            Healer: Array.from({ length: runData.healer_capacity }, () => null) as (Assignment | null)[],
            DPS: Array.from({ length: runData.dps_capacity }, () => null) as (Assignment | null)[],
        };

        const mappedSignups: Signup[] = [];

        (signupsData as any[]).forEach((s: any) => {
            // Use display_name, fallback to user_id if missing
            const player: Player = { 
                id: s.user_id, 
                name: s.display_name || s.user?.username || s.user_id 
            };
            
            // Use available_characters as per new doc, fallback to s.characters if available_characters missing
            const sourceChars = s.available_characters || s.characters || [];

            const chars: Character[] = sourceChars.map((c: any) => {
                 // specs parsing
                 let roles: SlotRole[] = [];
                 let specsStr = c.spec || "";

                 // Try to get roles from array first
                 if (Array.isArray(c.specs)) {
                     roles = c.specs.map((sp: any) => sp.role);
                 } else if (typeof c.specs === "string" && c.specs.startsWith("[")) {
                     try {
                         const parsed = JSON.parse(c.specs);
                         roles = parsed.map((sp: any) => sp.role);
                     } catch {}
                 }

                 // If no roles found but we have spec string, try to infer
                 if (roles.length === 0 && specsStr) {
                     const parts = specsStr.split(",").map((x: string) => x.trim());
                     parts.forEach((p: string) => {
                         if (SPEC_ROLES[p]) roles.push(SPEC_ROLES[p]);
                     });
                 }

                 // Fallback if still no roles (shouldn't happen with valid data)
                 if (roles.length === 0) {
                     // Assume all roles valid for class? No, default to DPS to be safe
                     roles = ["DPS"];
                 }

                 // Logs parsing
                 let logsData: CharacterLogs | undefined = undefined;
                 if (c.logs) {
                     if (typeof c.logs === "object") logsData = c.logs;
                     else if (typeof c.logs === "string") {
                         try {
                             logsData = JSON.parse(c.logs);
                         } catch (e) { console.error("Failed to parse logs", e); }
                     }
                 }
                 
                 // Map API locks to frontend status
                 const locks = c.locks || {};
                 const getStatus = (diff: string): "G" | "Y" | "R" => {
                     const s = locks[diff]?.status;
                     if (s === "LOCKED") return "R";
                     if (s === "PENDING") return "Y";
                     return "G";
                 };

                 const status: CharacterStatus = {
                     M: getStatus("Mythic"),
                     H: getStatus("Heroic"),
                     N: getStatus("Normal")
                 };

                 return {
                     id: c.id,
                     class: c.char_class,
                     ilevel: c.ilevel,
                     roles: Array.from(new Set(roles)), // unique roles
                     name: c.char_name,
                     status: status,
                     apiStatus: c.status,
                     specsStr: specsStr,
                     logsData: logsData
                 };
            });

            mappedSignups.push({
                player,
                signed: s.signup_type === "MAIN",
                backup: s.signup_type === "BENCH",
                characters: chars
            });
        });

        setSignups(mappedSignups);

        // Fill Roster
        rosterData.forEach((slot: RosterSlot) => {
            // Find character details from signups
            let charDetails: Assignment | null = null;
            
            for (const s of mappedSignups) {
                if (s.player.id === slot.user_id) {
                     const c = s.characters.find(ch => ch.id === slot.character_id);
                     if (c) {
                         // Prefer data from signup character (c) as it has parsed logs/specs
                         charDetails = {
                             playerId: s.player.id,
                             characterId: c.id,
                             class: c.class,
                             ilevel: c.ilevel,
                             name: s.player.name,
                             charName: c.name || c.class,
                             spec: c.specsStr || slot.spec,
                             logs: c.logsData || slot.logs
                         };
                         break;
                     }
                }
            }

            // If we found details, place in roster
            // Map uppercase roles from API (TANK, HEALER, DPS) to frontend keys (Tank, Healer, DPS)
            let roleKey: SlotRole | null = null;
            if (slot.assigned_role === "TANK") roleKey = "Tank";
            else if (slot.assigned_role === "HEALER") roleKey = "Healer";
            else if (slot.assigned_role === "DPS") roleKey = "DPS";

            if (charDetails && roleKey && newRoster[roleKey]) {
                 const emptyIdx = newRoster[roleKey].indexOf(null);
                 if (emptyIdx !== -1) {
                     newRoster[roleKey][emptyIdx] = charDetails;
                 }
            }
        });
        
        // After populating roster, update character statuses for assigned characters (Optimistic UI state)
        // Note: The API should have returned correct locks, so "R" (LOCKED) or "Y" (PENDING) should already be there.
        // However, if we just assigned them via drag and drop without refreshing, we want to reflect "Y" or "R".
        // The previous logic was overriding everything. Now we respect API unless assigned here.
        
        const isCompleted = runData.status === "COMPLETED";
        
        const updatedSignups = mappedSignups.map(s => ({
            ...s,
            characters: s.characters.map(c => {
                // Check if this character is in the roster
                const isAssigned = Object.values(newRoster).some(slots => slots.some(a => a?.characterId === c.id));
                
                if (isAssigned) {
                    const key = runData.difficulty === "Mythic" ? "M" : runData.difficulty === "Heroic" ? "H" : "N";
                    const newStatus = { ...c.status };
                    // If assigned, it should be PENDING (Y) or LOCKED (R)
                    // We assume PENDING if not completed, LOCKED if completed.
                    // This is an optimistic override for the current run's difficulty.
                    // @ts-ignore
                    newStatus[key] = isCompleted ? "R" : "Y";
                    return { ...c, status: newStatus };
                }
                return c;
            })
        }));
        
        setSignups(updatedSignups);
        setRoster(newRoster);

      } catch (err) {
        toast.error("Failed to load run data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (runId && runId !== "unknown") {
      fetchData();
    }
  }, [runId]);

  const selectedSignup = useMemo(() => signups.find(s => s.player.id === selectedPlayerId) ?? null, [signups, selectedPlayerId]);

  function isAssigned(characterId: string) {
    return Object.values(roster).some(slots => slots.some(a => a?.characterId === characterId));
  }

  function isUserAssigned(playerId: string) {
    return Object.values(roster).some(slots => slots.some(a => a?.playerId === playerId));
  }

  async function onDrop(role: SlotRole, index: number, dataText: string) {
    try {
      const data = JSON.parse(dataText) as Assignment & { roles: SlotRole[]; charName: string };
      if (!data.roles.includes(role)) {
        toast.error(`Character cannot fill ${role}.`);
        return;
      }
      
      // Optimistic update
      const prevRoster = { ...roster };
      setRoster(prev => {
        const next = { ...prev, [role]: [...prev[role]] } as typeof prev;
        next[role][index] = { playerId: data.playerId, characterId: data.characterId, class: data.class, ilevel: data.ilevel, name: data.name, charName: data.charName };
        return next;
      });
      
      // Update character status to Yellow
      setSignups(prev => prev.map(s => ({
          ...s,
          characters: s.characters.map(c => {
              if (c.id === data.characterId) {
                  const key = difficulty === "Mythic" ? "M" : difficulty === "Heroic" ? "H" : "N";
                  const newStatus = { ...c.status };
                  // @ts-ignore
                  newStatus[key] = "Y"; 
                  return { ...c, status: newStatus };
              }
              return c;
          })
      })));

      // API Call
      try {
          // Map frontend role to API role (uppercase)
          const apiRole = role === "Tank" ? "TANK" : role === "Healer" ? "HEALER" : "DPS";
          
          await rosterApi.add(runId, {
              user_id: data.playerId,
              character_id: data.characterId,
              assigned_role: apiRole
          });
          toast.success("Picked for roster.");
      } catch (err) {
          toast.error("Failed to update roster.");
          setRoster(prevRoster); // Revert
          // Revert status if needed, though complex without deep clone or refresh
      }

    } catch (e) {
        console.error(e);
    }
  }

  async function unassign(role: SlotRole, index: number) {
    const slot = roster[role][index];
    if (!slot) return;
    
    // Optimistic remove
    const prevRoster = { ...roster };
    setRoster(prev => {
        const next = { ...prev, [role]: [...prev[role]] } as typeof prev;
        next[role][index] = null;
        return next;
    });
    
    // Reset Character Status to Green (Available) or Yellow if pending elsewhere (complex, reverting to simple G)
    // Actually, if we unassign, we don't know if they are pending elsewhere without re-fetching.
    // For now, we can optimistically set to Green in the signups list for this run's difficulty.
    
    try {
        await rosterApi.delete(runId, slot.characterId);
        toast.success("Removed from roster.");
        
        // Update Signup Status
        setSignups(prev => prev.map(s => ({
            ...s,
            characters: s.characters.map(c => {
                if (c.id === slot.characterId) {
                    const key = difficulty === "Mythic" ? "M" : difficulty === "Heroic" ? "H" : "N";
                    const newStatus = { ...c.status };
                    // @ts-ignore
                    newStatus[key] = "G";
                    return { ...c, status: newStatus };
                }
                return c;
            })
        })));
        
    } catch (err) {
        console.error(err);
        toast.error("Failed to remove from roster");
        setRoster(prevRoster);
    }
  }
  
  async function handleCompleteRun() {
      try {
          await runApi.updateStatus(runId, "COMPLETED");
           // Update UI
           setSignups(prev => prev.map(s => ({
              ...s,
              characters: s.characters.map(c => {
                const assigned = Object.values(roster).some(slots => slots.some(a => a?.characterId === c.id));
                if (!assigned) return c;
                // Mark as Locked
                const key = difficulty === "Mythic" ? "M" : difficulty === "Heroic" ? "H" : "N";
                const newStatus = { ...c.status };
                // @ts-ignore
                newStatus[key] = "R";
                return { ...c, status: newStatus };
              })
            })));
            toast.success("Run completed!");
      } catch (err) {
          toast.error("Failed to complete run");
      }
  }

  async function handleAnnounce() {
      try {
          await runApi.announce(runId, { mention });
          toast.success("Roster announced to Discord.");
      } catch (err) {
          toast.error("Failed to announce");
      }
  }

  const counts = useMemo(() => ({
    Tank: roster.Tank.filter(Boolean).length,
    Healer: roster.Healer.filter(Boolean).length,
    DPS: roster.DPS.filter(Boolean).length,
  }), [roster]);

  const totalCapacity = capacities.Tank + capacities.Healer + capacities.DPS;
  const totalAssigned = counts.Tank + counts.Healer + counts.DPS;

  return (
    <AdminShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Run #{run?.title || runId}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Difficulty:</span>
              <Badge variant="outline">{difficulty}</Badge>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <span>Roster: {totalAssigned}/{totalCapacity}</span>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <span>T:{counts.Tank}/{capacities.Tank} H:{counts.Healer}/{capacities.Healer} D:{counts.DPS}/{capacities.DPS}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700/50">Announce Roster</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-card">
                <DialogHeader>
                  <DialogTitle>Announce Roster</DialogTitle>
                  <DialogDescription>Configure and send the final roster to Discord.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="mention" checked={mention} onCheckedChange={setMention} />
                    <label htmlFor="mention" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Mention Users
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button onClick={handleAnnounce}>Announce</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                    disabled={run?.status === "COMPLETED"}
                    className="bg-green-600/10 text-green-500 hover:bg-green-600/30 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {run?.status === "COMPLETED" ? "Run completed" : "Complete"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card">
                <AlertDialogHeader>
                  <AlertDialogTitle>Complete Run?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the run as COMPLETED and update character statuses.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex justify-end gap-2">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCompleteRun}>Complete</AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Columns */}
        <Card className="overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="min-h-[70vh]">
            {/* Roster */}
            <ResizablePanel defaultSize={50} minSize={30} className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Roster</h2>
              <div className="grid grid-cols-1 gap-4">
                {(["Tank", "Healer", "DPS"] as SlotRole[]).map(role => {
                  const roleIcon = role === "Tank" ? <Shield className="h-4 w-4" /> : role === "Healer" ? <Heart className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />;
                  return (
                  <div key={role} className="rounded-lg p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">{roleIcon} {role}</div>
                      <Badge variant="outline">{roster[role].filter(Boolean).length}/{capacities[role]}</Badge>
                    </div>
                    <div className="space-y-2">
                      {roster[role].map((assignment, i) => (
                        <div
                          key={i}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const data = e.dataTransfer.getData("text/plain");
                            onDrop(role, i, data);
                          }}
                          className={`relative overflow-hidden rounded-xl p-2 transition-colors ${assignment ? "bg-card/60 hover:bg-card/80" : "bg-muted/70 dark:bg-muted/40"}`}
                        >
                          {assignment ? (
                            <div className="relative flex w-full items-center justify-between min-h-[40px]">
                              <div
                                className="pointer-events-none absolute -left-8 -top-8 h-28 w-48 rounded-[32px] blur-2xl opacity-80"
                                style={classGradient(CLASS_COLORS[assignment.class] ?? "#ffffff")}
                              />
                              <div className="relative flex items-center gap-3 truncate">
                                <span className="text-xs text-muted-foreground">#{i + 1}</span>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-semibold leading-tight truncate">{assignment.charName}</span>
                                    {assignment.spec && assignment.spec.split(",").map(s => (
                                        <Badge key={s} variant="secondary" className="px-1.5 py-0 text-[10px] h-5 items-center font-medium bg-secondary text-secondary-foreground border border-border/50">{s.trim()}</Badge>
                                    ))}
                                  </div>
                                  <span className="text-[11px] text-muted-foreground leading-tight truncate">{assignment.name} · {assignment.class} {assignment.ilevel}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {assignment.logs && (
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center gap-1 cursor-help hover:opacity-80 transition-opacity">
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-muted-foreground/30 font-medium">
                                                        <Shield className="h-3 w-3" />
                                                        {assignment.logs.best_avg}%
                                                    </Badge>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="w-64 p-0 bg-card border border-border/50 shadow-xl rounded-xl overflow-hidden" sideOffset={5}>
                                                <div className="bg-muted/50 p-3 border-b border-border/50 flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{assignment.logs.difficulty}</span>
                                                        <span className="font-bold text-sm">Best Avg: {assignment.logs.best_avg}</span>
                                                    </div>
                                                </div>
                                                <div className="p-2 grid gap-1">
                                                    {Object.entries(assignment.logs.bosses).map(([boss, statusStr]) => {
                                                        const isKilled = statusStr.includes("✅") || !statusStr.includes("Not Killed");
                                                        const percent = statusStr.replace(/✅|❌|Not Killed/g, "").trim();
                                                        return (
                                                            <div key={boss} className="flex items-center justify-between text-xs p-1 rounded hover:bg-muted/50">
                                                                <span className="truncate max-w-[140px] font-medium">{boss}</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    {isKilled ? (
                                                                        <div className="flex items-center gap-1 text-emerald-500">
                                                                            <Check className="h-3 w-3" />
                                                                            <span>{percent}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1 text-red-500">
                                                                            <CircleX className="h-3 w-3" />
                                                                            <span>Not Killed</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                                <Button size="icon" variant="ghost" className="relative h-7 w-7 -mr-0.5 rounded-full bg-destructive/10 hover:bg-destructive/30 text-destructive" onClick={() => unassign(role, i)}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex min-h-[40px] w-full items-center justify-center text-xs text-muted-foreground">
                              <span>Empty</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />

            {/* Signups with integrated Character Details */}
            <ResizablePanel defaultSize={50} minSize={30} className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Signups</h2>
              <div className="mb-3 flex items-center gap-2">
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Roles</SelectItem>
                    <SelectItem value="Tank">Tank</SelectItem>
                    <SelectItem value="Healer">Healer</SelectItem>
                    <SelectItem value="DPS">DPS</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={classFilter} onValueChange={(v) => setClassFilter(v)}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Class" /></SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur-sm border border-border/40 shadow-sm">
                    <SelectItem value="All">All Classes</SelectItem>
                    {allClasses.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ScrollArea className="pr-3">
                <div className="space-y-2">
                  {/* Signed Players */}
                  {signups.filter(s => s.signed).map(s => {
                    const filteredChars = s.characters.filter(c => (roleFilter === "All" || c.roles.includes(roleFilter)) && (classFilter === "All" || c.class === classFilter));
                    if (filteredChars.length === 0) return null;
                    return (
                    <Collapsible key={s.player.id} className="rounded-xl border border-border/40 bg-card/70 p-3">
                      <CollapsibleTrigger className="w-full flex items-center justify-between p-2 rounded">
                        <div className="flex items-center justify-between flex-1">
                          <span className="font-medium text-base">{s.player.name}</span>
                          <Badge variant="outline" className="text-xs">{filteredChars.length}</Badge>
                        </div>
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2 pt-2 border-t border-border/10">
                        {filteredChars.map((c) => {
                          const roleLabel = `(${(c.roles || []).map(r => (r || "")[0]).join("/")})`;
                          const diffKey = difficulty === "Mythic" ? "M" : difficulty === "Heroic" ? "H" : "N";
                          const diffOrder: Array<["M"|"H"|"N", string]> = [["M","Mythic"],["H","Heroic"],["N","Normal"]];
                          const assigned = isAssigned(c.id);
                          const userHasAssignment = isUserAssigned(s.player.id);
                          const canDrag = !assigned && !userHasAssignment && c.status[diffKey] !== "R";
                          return (
                            <div
                              key={c.id}
                              draggable={canDrag}
                              onDragStart={(e) => {
                                const payload = JSON.stringify({ playerId: s.player.id, characterId: c.id, class: c.class, ilevel: c.ilevel, roles: c.roles, name: s.player.name, charName: c.name ?? c.class });
                                e.dataTransfer.setData("text/plain", payload);
                              }}
                              className={`relative overflow-hidden rounded-xl bg-card/80 p-3 text-sm space-y-2 border border-border/40 ${assigned || userHasAssignment || c.status[diffKey] === "R" ? "opacity-60 cursor-not-allowed" : "cursor-move"}`}
                            >
                              <div
                                className="pointer-events-none absolute -left-8 -top-8 h-28 w-48 rounded-[32px] blur-2xl opacity-80"
                                style={classGradient(CLASS_COLORS[c.class] ?? "#ffffff")}
                              />
                              <div className="relative flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm font-semibold leading-tight">
                                    {c.name ?? c.class}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground leading-tight">
                                    {c.class} · {c.ilevel} {roleLabel}
                                  </span>
                                </div>
                              </div>
                              <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {c.logsData ? (
                                     <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center gap-1 cursor-help hover:opacity-80 transition-opacity">
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-muted-foreground/30 font-medium">
                                                        <Shield className="h-3 w-3" />
                                                        {c.logsData.best_avg}%
                                                    </Badge>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="w-64 p-0 bg-card border border-border/50 shadow-xl rounded-xl overflow-hidden" sideOffset={5}>
                                                <div className="bg-muted/50 p-3 border-b border-border/50 flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{c.logsData.difficulty}</span>
                                                        <span className="font-bold text-sm">Best Avg: {c.logsData.best_avg}</span>
                                                    </div>
                                                </div>
                                                <div className="p-2 grid gap-1">
                                                    {Object.entries(c.logsData.bosses).map(([boss, statusStr]) => {
                                                        const isKilled = statusStr.includes("✅") || !statusStr.includes("Not Killed");
                                                        const percent = statusStr.replace(/✅|❌|Not Killed/g, "").trim();
                                                        return (
                                                            <div key={boss} className="flex items-center justify-between text-xs p-1 rounded hover:bg-muted/50">
                                                                <span className="truncate max-w-[140px] font-medium">{boss}</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    {isKilled ? (
                                                                        <div className="flex items-center gap-1 text-emerald-500">
                                                                            <Check className="h-3 w-3" />
                                                                            <span>{percent}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1 text-red-500">
                                                                            <CircleX className="h-3 w-3" />
                                                                            <span>Not Killed</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                     </TooltipProvider>
                                  ) : (
                                     <span className="text-muted-foreground text-xs">No logs</span>
                                  )}

                                  {/* Spec Badges for Signup Card */}
                                  {c.specsStr && (
                                      <div className="flex flex-wrap gap-1">
                                          {c.specsStr.split(",").map(s => (
                                              <Badge key={s} variant="secondary" className="px-1.5 py-0 text-[10px] h-5 items-center font-medium bg-secondary text-secondary-foreground border border-border/50">{s.trim()}</Badge>
                                          ))}
                                      </div>
                                  )}
                                </div>

                                <div className="flex gap-1">
                                  {diffOrder.map(([k, label]) => {
                                    const variant = c.status[k] === "G" ? "success" : c.status[k] === "Y" ? "warning" : "destructive";
                                    return <Badge key={k} variant={variant} className="text-[11px] px-1.5 py-0.5 font-semibold rounded-md border-none" title={label}>{k}</Badge>;
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  )})}

                  {/* Backup Players Section */}
                  {signups.filter(s => s.backup).length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border/30">
                      <h3 className="text-xs font-medium text-muted-foreground mb-2">Backup</h3>
                      <div className="space-y-2">
                        {signups.filter(s => s.backup).map(s => (
                          <Collapsible key={s.player.id} className="rounded-xl border border-border/40 bg-card/70 p-3">
                            <CollapsibleTrigger className="w-full flex items-center justify-between p-2 rounded">
                              <div className="flex items-center justify-between flex-1">
                                <span className="font-medium text-base">{s.player.name}</span>
                                <Badge variant="outline" className="text-xs">{s.characters.length}</Badge>
                              </div>
                              <ChevronDown className="h-4 w-4 ml-2" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 space-y-2 pt-2 border-t border-border/10">
                              {s.characters.map((c) => {
                                const roleLabel = `(${(c.roles || []).map(r => (r || "")[0]).join("/")})`;
                                const diffKey = difficulty === "Mythic" ? "M" : difficulty === "Heroic" ? "H" : "N";
                                const diffOrder: Array<["M"|"H"|"N", string]> = [["M","Mythic"],["H","Heroic"],["N","Normal"]];
                                const assigned = isAssigned(c.id);
                                const canDrag = !assigned && c.status[diffKey] !== "R";
                                return (
                                  <div
                                    key={c.id}
                                    draggable={canDrag}
                                    onDragStart={(e) => {
                                      const payload = JSON.stringify({ playerId: s.player.id, characterId: c.id, class: c.class, ilevel: c.ilevel, roles: c.roles, name: s.player.name });
                                      e.dataTransfer.setData("text/plain", payload);
                                    }}
                                    className={`rounded-md bg-card/60 p-3 text-sm space-y-2 ${assigned ? "opacity-60" : ""}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{c.class} - {c.ilevel} {roleLabel}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {c.logsData ? (
                                           <TooltipProvider delayDuration={0}>
                                              <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <div className="flex items-center gap-1 cursor-help hover:opacity-80 transition-opacity">
                                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-muted-foreground/30 font-medium">
                                                              <Shield className="h-3 w-3" />
                                                              {c.logsData.best_avg}%
                                                          </Badge>
                                                      </div>
                                                  </TooltipTrigger>
                                                  <TooltipContent className="w-64 p-0 bg-card border border-border/50 shadow-xl rounded-xl overflow-hidden" sideOffset={5}>
                                                      <div className="bg-muted/50 p-3 border-b border-border/50 flex justify-between items-center">
                                                          <div className="flex flex-col">
                                                              <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{c.logsData.difficulty}</span>
                                                              <span className="font-bold text-sm">Best Avg: {c.logsData.best_avg}</span>
                                                          </div>
                                                      </div>
                                                      <div className="p-2 grid gap-1">
                                                          {Object.entries(c.logsData.bosses).map(([boss, statusStr]) => {
                                                              const isKilled = statusStr.includes("✅") || !statusStr.includes("Not Killed");
                                                              const percent = statusStr.replace(/✅|❌|Not Killed/g, "").trim();
                                                              return (
                                                                  <div key={boss} className="flex items-center justify-between text-xs p-1 rounded hover:bg-muted/50">
                                                                      <span className="truncate max-w-[140px] font-medium">{boss}</span>
                                                                      <div className="flex items-center gap-1.5">
                                                                          {isKilled ? (
                                                                              <div className="flex items-center gap-1 text-emerald-500">
                                                                                  <Check className="h-3 w-3" />
                                                                                  <span>{percent}</span>
                                                                              </div>
                                                                          ) : (
                                                                              <div className="flex items-center gap-1 text-red-500">
                                                                                  <CircleX className="h-3 w-3" />
                                                                                  <span>Not Killed</span>
                                                                              </div>
                                                                          )}
                                                                      </div>
                                                                  </div>
                                                              );
                                                          })}
                                                      </div>
                                                  </TooltipContent>
                                              </Tooltip>
                                           </TooltipProvider>
                                        ) : (
                                           <span className="text-muted-foreground text-xs">No logs</span>
                                        )}

                                        {/* Spec Badges for Signup Card (Backup) */}
                                        {c.specsStr && (
                                            <div className="flex flex-wrap gap-1">
                                                {c.specsStr.split(",").map(s => (
                                                    <Badge key={s} variant="secondary" className="px-1.5 py-0 text-[10px] h-5 items-center font-medium bg-secondary text-secondary-foreground border border-border/50">{s.trim()}</Badge>
                                                ))}
                                            </div>
                                        )}
                                      </div>

                                      <div className="flex gap-1">
                                        {diffOrder.map(([k, label]) => {
                                          const variant = c.status[k] === "G" ? "success" : c.status[k] === "Y" ? "warning" : "destructive";
                                    return <Badge key={k} variant={variant} className="text-[11px] px-1.5 py-0.5 font-semibold rounded-md border-none" title={label}>{k}</Badge>;
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        </Card>
      </div>
    </AdminShell>
  );
}
