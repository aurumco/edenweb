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
import { Shield, Heart, Wand2, X, ChevronDown } from "lucide-react";
import { signupApi, rosterApi, runApi } from "@/lib/api";

const DIFFICULTIES = ["Mythic", "Heroic", "Normal"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

type SlotRole = "Tank" | "Healer" | "DPS";

interface Player { id: string; name: string }
interface CharacterStatus { M: "G" | "Y" | "R"; H: "G" | "Y" | "R"; N: "G" | "Y" | "R" }
interface Character {
  id: string;
  class: string;
  ilevel: number;
  roles: SlotRole[]; // e.g. ["Healer", "DPS"]
  log?: number; // e.g. 99
  status: CharacterStatus;
  name?: string; // character name
}
interface Signup {
  player: Player;
  signed: boolean;
  backup: boolean;
  characters: Character[];
}

interface Assignment { playerId: string; characterId: string; class: string; ilevel: number; name: string; charName: string }

const ROSTER_CAPACITY: Record<SlotRole, number> = { Tank: 2, Healer: 4, DPS: 14 };

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

const SERVER_ID = process.env.NEXT_PUBLIC_SERVER_ID || "980165146762674186";

export default function AdminRunDetailsPage() {
  const params = useParams<{ runId: string }>();
  const runId = params?.runId ?? "unknown";
  const [difficulty, setDifficulty] = useState<Difficulty>("Mythic");
  const [signups, setSignups] = useState<Signup[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<SlotRole | "All">("All");
  const allClasses = useMemo(() => Array.from(new Set(signups.flatMap(s => s.characters.map(c => c.class)))).sort(), [signups]);
  const [classFilter, setClassFilter] = useState<string | "All">("All");
  const [roster, setRoster] = useState<Record<SlotRole, (Assignment | null)[]>>({
    Tank: Array.from({ length: ROSTER_CAPACITY.Tank }, () => null),
    Healer: Array.from({ length: ROSTER_CAPACITY.Healer }, () => null),
    DPS: Array.from({ length: ROSTER_CAPACITY.DPS }, () => null),
  });

  // Fetch signups and roster on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [signupsData, rosterData] = await Promise.all([
          signupApi.list(SERVER_ID, runId),
          rosterApi.get(SERVER_ID, runId),
        ]);

        // Map API signups to component format
        const mappedSignups: Signup[] = signupsData.map((signup: any) => ({
          player: { id: signup.user_id, name: signup.user_id }, // Use user_id as name fallback
          signed: signup.signup_type === "MAIN",
          backup: signup.signup_type === "BENCH",
          characters: [], // Will be populated from character data if available
        }));

        setSignups(mappedSignups);
        setSelectedPlayerId(mappedSignups[0]?.player.id ?? null);
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

  function onDrop(role: SlotRole, index: number, dataText: string) {
    try {
      const data = JSON.parse(dataText) as Assignment & { roles: SlotRole[]; charName: string };
      if (!data.roles.includes(role)) {
        toast.error(`Character cannot fill ${role}.`);
        return;
      }
      setRoster(prev => {
        const next = { ...prev, [role]: [...prev[role]] } as typeof prev;
        next[role][index] = { playerId: data.playerId, characterId: data.characterId, class: data.class, ilevel: data.ilevel, name: data.name, charName: data.charName };
        return next;
      });
      setSignups(prev => prev.map(s => ({
        ...s,
        characters: s.characters.map(c => {
          if (c.id !== data.characterId) return c;
          const key = difficulty === "Mythic" ? "M" : difficulty === "Heroic" ? "H" : "N";
          const status: CharacterStatus = { ...c.status, [key]: c.status[key] === "R" ? "R" : "Y" } as CharacterStatus;
          return { ...c, status };
        })
      })));
      toast.success("Picked for roster.");
    } catch (e) {
    }
  }

  function unassign(role: SlotRole, index: number) {
    setRoster(prev => {
      const next = { ...prev, [role]: [...prev[role]] } as typeof prev;
      const removed = next[role][index];
      next[role][index] = null;
      if (removed) {
        setSignups(prev => prev.map(s => ({
          ...s,
          characters: s.characters.map(c => {
            if (c.id !== removed.characterId) return c;
            const key = difficulty === "Mythic" ? "M" : difficulty === "Heroic" ? "H" : "N";
            const newVal = c.status[key] === "R" ? "R" : "G";
            return { ...c, status: { ...c.status, [key]: newVal } };
          })
        })));
      }
      return next;
    });
    toast.error("Removed from roster.");
  }

  const counts = useMemo(() => ({
    Tank: roster.Tank.filter(Boolean).length,
    Healer: roster.Healer.filter(Boolean).length,
    DPS: roster.DPS.filter(Boolean).length,
  }), [roster]);

  const totalCapacity = ROSTER_CAPACITY.Tank + ROSTER_CAPACITY.Healer + ROSTER_CAPACITY.DPS;
  const totalAssigned = counts.Tank + counts.Healer + counts.DPS;

  return (
    <AdminShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Run #{runId}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Difficulty:</span>
              <div className="flex items-center gap-1">
                {DIFFICULTIES.map(d => (
                  <Button key={d} size="sm" variant={d === difficulty ? "default" : "outline"} onClick={() => setDifficulty(d)} className={d === difficulty ? "bg-primary/10 text-primary hover:bg-primary/30" : ""}>
                    {d}
                  </Button>
                ))}
              </div>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <span>Roster: {totalAssigned}/{totalCapacity}</span>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <span>T:{counts.Tank} H:{counts.Healer} D:{counts.DPS}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Announce Roster</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-card">
                <DialogHeader>
                  <DialogTitle>Announce Roster</DialogTitle>
                  <DialogDescription>Configure and send the final roster to Discord.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="mention" className="text-sm font-medium">Mention all players</label>
                      <Switch id="mention" defaultChecked />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => toast.success("Roster copied to clipboard (mock).")}>Copy</Button>
                    <Button onClick={() => toast.success("Roster announced to Discord (mock).")}>Announce</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="bg-green-600/10 text-green-500 hover:bg-green-600/30 border-0">Complete Run</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card">
                <AlertDialogHeader>
                  <AlertDialogTitle>Complete Run?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark all assigned characters as saved for this difficulty. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex justify-end gap-2">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    setSignups(prev => prev.map(s => ({
                      ...s,
                      characters: s.characters.map(c => {
                        const assigned = Object.values(roster).some(slots => slots.some(a => a?.characterId === c.id));
                        if (!assigned) return c;
                        const key = difficulty === "Mythic" ? "M" : difficulty === "Heroic" ? "H" : "N";
                        return { ...c, status: { ...c.status, [key]: "R" } };
                      })
                    })));
                    toast.success("Run completed!");
                  }}>Complete</AlertDialogAction>
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
                      <Badge variant="outline">{roster[role].filter(Boolean).length}/{ROSTER_CAPACITY[role]}</Badge>
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
                                  <span className="text-sm font-semibold leading-tight truncate">{assignment.charName}</span>
                                  <span className="text-[11px] text-muted-foreground leading-tight truncate">{assignment.name} · {assignment.class} {assignment.ilevel}</span>
                                </div>
                              </div>
                              <Button size="icon" variant="ghost" className="relative h-7 w-7 -mr-0.5 rounded-full bg-destructive/10 hover:bg-destructive/30 text-destructive" onClick={() => unassign(role, i)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
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
                          const roleLabel = `(${c.roles.map(r => r[0]).join("/")})`;
                          const diffKey = difficulty === "Mythic" ? "M" : difficulty === "Heroic" ? "H" : "N";
                          const diffOrder: Array<["M"|"H"|"N", string]> = [["M","Mythic"],["H","Heroic"],["N","Normal"]];
                          const assigned = isAssigned(c.id);
                          const canDrag = !assigned && c.status[diffKey] !== "R";
                          return (
                            <div
                              key={c.id}
                              draggable={canDrag}
                              onDragStart={(e) => {
                                const payload = JSON.stringify({ playerId: s.player.id, characterId: c.id, class: c.class, ilevel: c.ilevel, roles: c.roles, name: s.player.name, charName: c.name ?? c.class });
                                e.dataTransfer.setData("text/plain", payload);
                              }}
                              className={`relative overflow-hidden rounded-xl bg-card/80 p-3 text-sm space-y-2 border border-border/40 ${assigned ? "opacity-60" : ""}`}
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
                                <span className="text-muted-foreground">{c.log ? `${c.log}% Log` : "No log"}</span>
                                <div className="flex gap-1">
                                  {diffOrder.map(([k, label]) => {
                                    const variant = c.status[k] === "G" ? "success" : c.status[k] === "Y" ? "warning" : "destructive";
                                    return <Badge key={k} variant={variant} className="text-[11px] px-1.5 py-0.5 font-semibold rounded-md" title={label}>{k}</Badge>;
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
                                const roleLabel = `(${c.roles.map(r => r[0]).join("/")})`;
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
                                      <span className="text-muted-foreground">{c.log ? `${c.log}% Log` : "No log"}</span>
                                      <div className="flex gap-1">
                                        {diffOrder.map(([k, label]) => {
                                          const variant = c.status[k] === "G" ? "success" : c.status[k] === "Y" ? "warning" : "destructive";
                                          return <Badge key={k} variant={variant} className="text-[11px] px-1.5 py-0.5 font-semibold rounded-md" title={label}>{k}</Badge>;
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
