"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useAuth } from "@/components/auth-provider";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Calendar as CalendarIcon, Clock as ClockIcon, Copy, FileDown, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input as TextInput } from "@/components/ui/input";
import { format } from "date-fns";
import { runApi, statsApi, Run as ApiRun } from "@/lib/api";

const DIFFICULTIES = ["Mythic", "Heroic", "Normal"] as const;

type Difficulty = (typeof DIFFICULTIES)[number];

type Run = ApiRun;

type RunForm = {
  title: string;
  difficulty: Difficulty;
  scheduled_at: string;
  scheduled_hour: string;
  scheduled_minute: string;
  roster_channel_id: string;
  embed_text?: string;
  tank_capacity: string;
  healer_capacity: string;
  dps_capacity: string;
};

const SERVER_ID = process.env.NEXT_PUBLIC_SERVER_ID || "980165146762674186";

export default function AdminRunsIndexPage() {
  const { user, loading: authLoading } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [globalStats, setGlobalStats] = useState<{ total_players: number; active_runs: number } | null>(null);
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | "All">("All");
  const [filterStatus, setFilterStatus] = useState<"PENDING" | "ACTIVE" | "COMPLETED" | "All">("All");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submittingRun, setSubmittingRun] = useState(false);
  const [scheduleTab, setScheduleTab] = useState<"date" | "time">("date");
  const pageSize = 10;
  const form = useForm<RunForm>({
    defaultValues: {
      title: "",
      difficulty: "Mythic",
      scheduled_at: "",
      scheduled_hour: "20",
      scheduled_minute: "00",
      roster_channel_id: "",
      tank_capacity: "2",
      healer_capacity: "4",
      dps_capacity: "14",
      embed_text: "",
    },
    mode: "onChange",
  });

  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), []);
  const minuteOptions = ["00", "15", "30", "45"];

  // Fetch runs on mount
  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [runsData, statsData] = await Promise.all([
          runApi.list(SERVER_ID),
          statsApi.get()
      ]);
      setRuns(runsData);
      setGlobalStats(statsData);
    } catch (err) {
      toast.error("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isValid = useMemo(() => {
    const v = form.getValues();
    return (
      v.title.trim().length > 2 &&
      Boolean(v.difficulty) &&
      Boolean(v.scheduled_at) &&
      v.roster_channel_id.trim().length > 0
    );
  }, [form.watch()]);

  async function onSubmit(data: RunForm) {
    try {
      setSubmittingRun(true);
      
      // Construct ISO string preserving local time
      const date = new Date(data.scheduled_at);
      const hours = parseInt(data.scheduled_hour, 10);
      const minutes = parseInt(data.scheduled_minute, 10);
      date.setHours(hours, minutes, 0, 0);
      const scheduledIso = date.toISOString();
      
      await runApi.create({
        server_id: SERVER_ID,
        title: data.title,
        difficulty: data.difficulty,
        scheduled_at: scheduledIso,
        roster_channel_id: data.roster_channel_id,
        discord_channel_id: data.roster_channel_id, // Assuming same for now or needs another input? Scenario mentions both
        embed_text: data.embed_text,
        tank_capacity: Number(data.tank_capacity),
        healer_capacity: Number(data.healer_capacity),
        dps_capacity: Number(data.dps_capacity),
      });
      toast.success("Run created.");
      form.reset({
        title: "",
        difficulty: "Mythic",
        scheduled_at: "",
        scheduled_hour: "20",
        scheduled_minute: "00",
        roster_channel_id: "",
        tank_capacity: "2",
        healer_capacity: "4",
        dps_capacity: "14",
        embed_text: "",
      });
      setScheduleTab("date");
      await fetchData();
    } catch (err) {
      toast.error("Failed to create run");
      console.error(err);
    } finally {
      setSubmittingRun(false);
    }
  }

  async function deleteRun(runId: string) {
      try {
          await runApi.delete(runId);
          setRuns((prev) => prev.filter((x) => x.id !== runId));
          toast.success("Run deleted.");
      } catch (err) {
          toast.error("Failed to delete run");
          console.error(err);
      }
  }

  const formatUTC = (iso: string) => {
    const date = new Date(iso);
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");
    return `${day}-${month}, ${hour}:${minute}`;
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      const okSearch = r.title.toLowerCase().includes(search.toLowerCase());
      const okDiff = filterDifficulty === "All" || r.difficulty === filterDifficulty;
      const okStatus = filterStatus === "All" || r.status === filterStatus;
      return okSearch && okDiff && okStatus;
    });
  }, [runs, search, filterDifficulty, filterStatus]);

  const pagedRuns = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRuns.slice(start, start + pageSize);
  }, [filteredRuns, page]);

  const stats = useMemo(() => {
    // Keep local stats calculation for the cards that rely on run list filtering/status if needed,
    // but the prompt says "Use api/stats for the top information".
    // The previous implementation used filtered counts from 'runs'.
    // I will replace the main cards with global stats where applicable, or keep them if they represent something else.
    // The user said "info written at the top is wrong. Use /api/stats".
    // /api/stats returns { total_players, active_runs }.
    // The UI has: Active Runs, Pending Runs, Completed Runs, Players.
    // I will map active_runs to Active.
    // I will map total_players to Players.
    // For Pending and Completed, I will still use the local runs list calculation as the API doesn't seem to provide them explicitly (only active_runs).

    const pending = runs.filter((r) => r.status === "PENDING").length;
    const completed = runs.filter((r) => r.status === "COMPLETED").length;

    return {
        active: globalStats?.active_runs ?? 0,
        pending,
        completed,
        players: globalStats?.total_players ?? 0
    };
  }, [runs, globalStats]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 180);
    return () => clearTimeout(t);
  }, [page]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Runs</h1>
            <p className="text-sm text-muted-foreground">Create and manage runs.</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <Plus className="h-4 w-4" /> Create Run
              </Button>
            </DialogTrigger>
            <DialogContent
              showCloseButton={false}
              className="bg-card w-full sm:max-w-3xl lg:max-w-[1100px]"
            >
              <DialogHeader>
                <DialogTitle>Create New Run</DialogTitle>
                <DialogDescription>Set up a new run with all necessary details</DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-8 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start"
                onSubmit={form.handleSubmit(onSubmit as any)}
              >
                {/* Left column - main form fields */}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Run Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Mythic+ 20 Key Night"
                        value={form.watch("title")}
                        onChange={(e) => form.setValue("title", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select
                        value={form.watch("difficulty")}
                        onValueChange={(v) => form.setValue("difficulty", v as Difficulty)}
                      >
                        <SelectTrigger id="difficulty" className="w-full">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[14rem]">
                          {DIFFICULTIES.map((d) => (
                            <SelectItem value={d} key={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="scheduled_at">Scheduled</Label>
                    <Input
                      id="scheduled_at"
                      readOnly
                      placeholder="DD Mon - HH:MM"
                      value={
                        form.watch("scheduled_at")
                          ? format(new Date(form.watch("scheduled_at")), "dd MMM - HH:mm")
                          : ""
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="roster_channel_id">Roster Channel ID</Label>
                      <Input
                        id="roster_channel_id"
                        placeholder="Channel ID for announcements"
                        value={form.watch("roster_channel_id")}
                        onChange={(e) => form.setValue("roster_channel_id", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="capacities">Capacities (T/H/D)</Label>
                      <div className="flex gap-2">
                        <Input
                            id="tank_capacity"
                            placeholder="Tank"
                            inputMode="numeric"
                            value={form.watch("tank_capacity")}
                            onChange={(e) => form.setValue("tank_capacity", e.target.value)}
                        />
                        <Input
                            id="healer_capacity"
                            placeholder="Healer"
                            inputMode="numeric"
                            value={form.watch("healer_capacity")}
                            onChange={(e) => form.setValue("healer_capacity", e.target.value)}
                        />
                        <Input
                            id="dps_capacity"
                            placeholder="DPS"
                            inputMode="numeric"
                            value={form.watch("dps_capacity")}
                            onChange={(e) => form.setValue("dps_capacity", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="embed_text">Embed Text</Label>
                      <Textarea
                        id="embed_text"
                        placeholder="Message content for Discord embed"
                        value={form.watch("embed_text")}
                        onChange={(e) => form.setValue("embed_text", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DialogClose asChild>
                        <Button type="button" variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80">
                          Close
                        </Button>
                      </DialogClose>
                      <Button type="submit" disabled={!isValid}>
                        Create
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right column - schedule panel */}
                <div className="rounded-2xl border border-border/60 bg-card/80 p-4 flex flex-col gap-4 max-h-[380px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Schedule</p>
                      <p className="text-xs text-muted-foreground">Pick date and time for this run.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setScheduleTab("time")}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs transition-colors ${
                          scheduleTab === "time"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/50 text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <ClockIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduleTab("date")}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs transition-colors ${
                          scheduleTab === "date"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/50 text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/40 bg-background/40 p-3 flex-1 overflow-y-auto">
                    {scheduleTab === "date" ? (
                      <div className="space-y-2">
                        <Calendar
                          mode="single"
                          selected={form.watch("scheduled_at") ? new Date(form.watch("scheduled_at")) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const hours = form.getValues("scheduled_hour") || "20";
                              const minutes = form.getValues("scheduled_minute") || "00";
                              date.setHours(Number(hours));
                              date.setMinutes(Number(minutes));
                              form.setValue("scheduled_at", date.toISOString(), { shouldValidate: true });
                            } else {
                              form.setValue("scheduled_at", "", { shouldValidate: true });
                            }
                          }}
                          className="w-full rounded-lg bg-card/40 [&_.rdp]:w-full [&_.rdp-caption]:pb-2 [&_.rdp-caption_label]:text-xs [&_.rdp-head_cell]:text-[11px] [&_.rdp-head_cell]:py-1 [&_.rdp-cell]:p-0 [&_.rdp-day]:h-7 [&_.rdp-day]:w-full [&_.rdp-day]:rounded-sm [&_.rdp-day]:text-xs"
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid w-full grid-cols-2 gap-3">
                          <div className="grid gap-1">
                            <Label htmlFor="hour-select" className="text-xs font-medium">Hour</Label>
                            <Select
                              value={form.watch("scheduled_hour")}
                              onValueChange={(value) => {
                                form.setValue("scheduled_hour", value);
                                const current = form.getValues("scheduled_at");
                                if (current) {
                                  const next = new Date(current);
                                  next.setHours(Number(value));
                                  next.setMinutes(Number(form.getValues("scheduled_minute")));
                                  form.setValue("scheduled_at", next.toISOString(), { shouldValidate: true });
                                }
                              }}
                            >
                              <SelectTrigger id="hour-select" className="w-full justify-between text-sm">
                                <SelectValue placeholder="HH" />
                              </SelectTrigger>
                              <SelectContent className="max-h-64">
                                {hourOptions.map((hour) => (
                                  <SelectItem key={hour} value={hour}>
                                    {hour}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-1">
                            <Label htmlFor="minute-select" className="text-xs font-medium">Minute</Label>
                            <Select
                              value={form.watch("scheduled_minute")}
                              onValueChange={(value) => {
                                form.setValue("scheduled_minute", value);
                                const current = form.getValues("scheduled_at");
                                if (current) {
                                  const next = new Date(current);
                                  next.setHours(Number(form.getValues("scheduled_hour")));
                                  next.setMinutes(Number(value));
                                  form.setValue("scheduled_at", next.toISOString(), { shouldValidate: true });
                                }
                              }}
                            >
                              <SelectTrigger id="minute-select" className="w-full justify-between text-sm">
                                <SelectValue placeholder="MM" />
                              </SelectTrigger>
                              <SelectContent>
                                {minuteOptions.map((minute) => (
                                  <SelectItem key={minute} value={minute}>
                                    {minute}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {form.watch("scheduled_at") && (
                    <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {format(new Date(form.watch("scheduled_at")), "dd MMM yyyy, HH:mm")}
                      </span>
                    </div>
                  )}
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {loading ? (
            <>
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </>
          ) : (
          <>
          <div className="rounded-xl bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-foreground">{stats.active}</div>
              <div className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">Active</div>
            </div>
            <div className="text-xs text-muted-foreground">Active/Pending Runs</div>
          </div>
          <div className="rounded-xl bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
              <div className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">Pending</div>
            </div>
            <div className="text-xs text-muted-foreground">This Server</div>
          </div>
          <div className="rounded-xl bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
              <div className="text-xs font-medium text-sky-500 bg-sky-500/10 px-2 py-1 rounded-md">Done</div>
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="rounded-xl bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-foreground">{stats.players}</div>
              <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">Players</div>
            </div>
            <div className="text-xs text-muted-foreground">Total Registered</div>
          </div>
          </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Refine runs view.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <TextInput placeholder="Search title..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
              <div className="flex gap-2 w-full sm:w-auto">
                <Select value={filterDifficulty} onValueChange={(v) => setFilterDifficulty(v as any)}>
                  <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                  <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Runs</CardTitle>
            <CardDescription>Manage and open details for each run.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-md" />
                ))}
              </div>
            ) : (
            <div key={page} className="animate-in fade-in-0 duration-150 ease-out">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRuns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No runs yet.</TableCell>
                    </TableRow>
                  ) : (
                    pagedRuns.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className="px-2 py-0.5 text-xs rounded-full" variant={r.difficulty === "Mythic" ? "mythic" : r.difficulty === "Heroic" ? "heroic" : "normal"}>{r.difficulty}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatUTC(r.scheduled_at)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge className="px-2 py-0.5 text-xs rounded-full" variant={r.status === "ACTIVE" ? "success" : r.status === "PENDING" ? "warning" : "neutral"}>{capitalize(r.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button asChild size="sm">
                              <Link href={`/admin/runs/${r.id}`}>Open</Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost">⋯</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
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
                                      <AlertDialogTitle>Delete Run</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this run? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="flex justify-end gap-2">
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteRun(r.id)}>Delete</AlertDialogAction>
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
              {filteredRuns.length > pageSize && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs">
                  <span className="text-muted-foreground">Page {page} / {Math.max(1, Math.ceil(filteredRuns.length / pageSize))}</span>
                  <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                  <Button variant="secondary" size="sm" disabled={page >= Math.ceil(filteredRuns.length / pageSize)} onClick={() => setPage((p) => Math.min(Math.ceil(filteredRuns.length / pageSize), p + 1))}>Next</Button>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
