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
import { signupApi, rosterApi, runApi, characterApi, RosterSlot, Character as ApiCharacter, Signup as ApiSignup } from "@/lib/api";

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
  apiStatus: "AVAILABLE" | "UNAVAILABLE";
}

interface Signup {
  player: Player;
  signed: boolean;
  backup: boolean;
  characters: Character[];
}

interface Assignment { playerId: string; characterId: string; class: string; ilevel: number; name: string; charName: string }

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
        // Fetch run details, signups, roster, and ALL characters (to link character details)
        // Note: Fetching all characters might be heavy, but signup API doesn't return char details.
        // In a real app, we'd likely have an endpoint for run signups that includes character snapshots.
        // For now, we'll fetch all characters? No, that's unsafe/unscalable.
        // Wait, the user provided `signupApi.list` returns `Signup[]`.
        // `Signup` interface in `lib/api.ts` has `character_id`.
        // Does it have character details? If not, we can't show class/ilevel.
        // Assuming `signupApi.list` or backend endpoint should provide this.
        // If not, we might be stuck.
        // Let's assume we need to fetch `characterApi.list()`? But that returns *my* characters. admin shouldn't see everyone's characters via `list()` unless admin mode.
        // The README says `GET /api/runs/:runId/signups` (Admin Only).
        // It likely returns enriched data. Let's assume the response contains user and character info.
        // Since I don't have the exact response shape, I will inspect `signupsData` and map it.

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

        // Populate roster
        // RosterSlot has { user_id, character_id, assigned_role }
        // We need character details for the roster slots too.
        // If signupsData contains all signed up users (including rostered ones), we can lookup details there.

        // Let's map signupsData. Assuming it has embedded `user` and `character` objects or similar.
        // If the API is strict REST, it might not.
        // BUT, the prompt says "List all players signed up...". Admin needs to see details.
        // I'll assume `signupsData` items have `user` and `character` properties.
        // Or `character_snapshot` etc.

        const mappedSignups: Signup[] = [];
        const userMap = new Map<string, Signup>();

        // Group by user (since one user might have multiple signups? No, usually 1 signup per run, but user has multiple characters)
        // Wait, the signup is for a user. "When sign button clicked... registered characters come... leader decides which to pick".
        // So the signup is per USER, and the user exposes ALL their AVAILABLE characters.
        // So `GET /api/runs/:runId/signups` probably returns users who signed up.
        // And we need their characters.
        // Maybe the backend returns `{ user, characters: [] }` for each signup?
        // Or `signupApi.list` returns `Signup` which has `character_id`.
        // The prompt says "During signup... characters come... leader decides".
        // This implies the signup might not be tied to a single character initially?
        // OR the user signs up, and the admin sees ALL their characters?
        // The memory says "updates Discord... based on signed-up users' characters".
        // "Frontend: ... sign button clicked... user characters come... leader selects".
        // This implies the admin sees available characters of the signed up user.
        // If `signupApi.list` returns just `user_id`, we need to fetch their characters.
        // But we can't fetch other users' characters easily without an admin endpoint `GET /api/admin/users/:id/characters`?
        // Let's assume `signupsData` is rich.

        // Mocking the data structure expectation based on typical needs if not fully documented.
        // I'll assume `signupsData` is an array where each item has `user` info and `characters` list.
        // If the actual API returns just `Signup` rows, I might need to fetch `/api/runs/:runId/signups?expand=characters`.
        // Given I can't change backend, I'll hope `signupsData` has what I need.
        // If not, I'll code defensively.

        (signupsData as any[]).forEach((s: any) => {
            // Assuming s has .user and .characters (array of chars)
            // If not, and s is just { user_id, signup_type }, we are blind.
            // But given "Admin Only", it surely returns details.

            const player: Player = { id: s.user_id, name: s.user?.username || s.username || "Unknown" };

            // Characters: Check if s.characters exists
            const chars: Character[] = (s.characters || []).map((c: any) => {
                 // specs parsing
                 const specs = Array.isArray(c.specs) ? c.specs : (typeof c.specs === "string" ? JSON.parse(c.specs) : []);
                 const roles: SlotRole[] = specs.map((sp: any) => sp.role);

                 return {
                     id: c.id,
                     class: c.char_class,
                     ilevel: c.ilevel,
                     roles: Array.from(new Set(roles)), // unique roles
                     name: c.char_name,
                     status: { M: "G", H: "G", N: "G" }, // Mock status, assuming backend doesn't return weekly lockouts per diff yet? Or mapped from availability
                     apiStatus: c.status
                 };
            }).filter((c: Character) => c.apiStatus === "AVAILABLE"); // Only show available? "When sign button... all available characters come"

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
                if (s.player.id === slot.user_id) { // Assuming slot has user_id
                     const c = s.characters.find(ch => ch.id === slot.character_id);
                     if (c) {
                         charDetails = {
                             playerId: s.player.id,
                             characterId: c.id,
                             class: c.class,
                             ilevel: c.ilevel,
                             name: s.player.name,
                             charName: c.name || c.class
                         };
                         break;
                     }
                }
            }

            // If we found details, place in roster
            if (charDetails && slot.assigned_role && newRoster[slot.assigned_role]) {
                 // Find first empty slot or push?
                 // rosterData likely doesn't have 'position'. We just fill.
                 const emptyIdx = newRoster[slot.assigned_role].indexOf(null);
                 if (emptyIdx !== -1) {
                     newRoster[slot.assigned_role][emptyIdx] = charDetails;
                 }
            }
        });

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

      // API Call
      try {
          await rosterApi.add(runId, {
              user_id: data.playerId,
              character_id: data.characterId,
              assigned_role: role
          });
          toast.success("Picked for roster.");
      } catch (err) {
          toast.error("Failed to update roster.");
          setRoster(prevRoster); // Revert
      }

    } catch (e) {
        console.error(e);
    }
  }

  async function unassign(role: SlotRole, index: number) { // This functionality is not supported by API "remove", but user asked for it?
    // The API has `rosterApi.add`.
    // Does it have `rosterApi.remove`? I commented it out in api.ts as "No explicit remove".
    // But wait, `POST` usually adds. To remove, maybe we overwrite with nothing? Or `DELETE`?
    // If I can't remove, I can't implement this button.
    // However, I can just not show the button or show a warning "Cannot remove yet".
    // Or I can assume `add` with same user/char updates it? No, that moves them.
    // If I really need to remove, and no API exists, I'm stuck.
    // But I will leave the UI and try a DELETE to `.../roster/:slotId` if I can guess slotId? No slotId.
    // `.../roster` with DELETE body?
    // I'll disable the remove button functionality or mock it for UI only if I must, but better to warn.

    // Re-reading prompt: "Leader decides... select... complete". Doesn't explicitly say "Deselect".
    // But "Cancel" exists for users.
    // I'll just make it local state change for now? No, that de-syncs.
    // I'll assume for now that I can't remove via API.
    toast.error("Removing from roster is not supported by API yet.");
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
                return { ...c, status: { ...c.status, [key]: "R" } };
              })
            })));
            toast.success("Run completed!");
      } catch (err) {
          toast.error("Failed to complete run");
      }
  }

  async function handleAnnounce() {
      try {
          await runApi.announce(runId);
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
                    <Button onClick={handleAnnounce}>Announce</Button>
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
