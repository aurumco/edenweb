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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Calendar as CalendarIcon, Clock as ClockIcon, Copy, FileDown, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input as TextInput } from "@/components/ui/input";
import { format } from "date-fns";
import { runApi, Run as ApiRun } from "@/lib/api";

const DIFFICULTIES = ["Mythic", "Heroic", "Normal"] as const;

type Difficulty = (typeof DIFFICULTIES)[number];

type Run = ApiRun;

type RunForm = {
  title: string;
  difficulty: Difficulty;
  scheduled_at: string;
  scheduled_time: string;
  roster_channel_id: string;
  embed_text?: string;
  capacity?: string;
};

const SERVER_ID = process.env.NEXT_PUBLIC_SERVER_ID || "980165146762674186";

export default function AdminRunsIndexPage() {
  const { user, loading: authLoading } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | "All">("All");
  const [filterStatus, setFilterStatus] = useState<"Pending" | "Active" | "Completed" | "All">("All");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submittingRun, setSubmittingRun] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const pageSize = 10;
  const form = useForm<RunForm>({
    defaultValues: {
      title: "",
      difficulty: "Mythic",
      scheduled_at: "",
      scheduled_time: "20:00",
      roster_channel_id: "",
      capacity: "20",
      embed_text: "",
    },
    mode: "onChange",
  });

  // Fetch runs on mount
  useEffect(() => {
    if (!authLoading && user) {
      fetchRuns();
    }
  }, [authLoading, user]);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await runApi.list(SERVER_ID);
      setRuns(data);
    } catch (err) {
      toast.error("Failed to load runs");
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
      await runApi.create({
        server_id: SERVER_ID,
        title: data.title,
        difficulty: data.difficulty,
        scheduled_at: data.scheduled_at,
        roster_channel_id: data.roster_channel_id,
        discord_channel_id: data.roster_channel_id,
        embed_text: data.embed_text,
      });
      toast.success("Run created.");
      form.reset({
        title: "",
        difficulty: "Mythic",
        scheduled_at: "",
        scheduled_time: "20:00",
        roster_channel_id: "",
        capacity: "20",
        embed_text: "",
      });
      await fetchRuns();
    } catch (err) {
      toast.error("Failed to create run");
      console.error(err);
    } finally {
      setSubmittingRun(false);
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
    const active = runs.filter((r) => r.status === "Active").length;
    const pending = runs.filter((r) => r.status === "Pending").length;
    const completed = runs.filter((r) => r.status === "Completed").length;
    const capacity = runs.reduce((acc, r) => acc + r.capacity, 0);
    return { active, pending, completed, capacity };
  }, [runs]);

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
            <DialogContent className="bg-card max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create New Run</DialogTitle>
                <DialogDescription>Set up a new run with all necessary details</DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)] items-start"
                onSubmit={form.handleSubmit(onSubmit as any)}
              >
                {/* Left column - main form fields */}
                <div className="space-y-4">
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
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        placeholder="e.g., 20"
                        inputMode="numeric"
                        value={form.watch("capacity")}
                        onChange={(e) => form.setValue("capacity", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="embed_text">Embed Text</Label>
                    <Textarea
                      id="embed_text"
                      placeholder="Message content for Discord embed"
                      value={form.watch("embed_text")}
                      onChange={(e) => form.setValue("embed_text", e.target.value)}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={!isValid}>
                      Create
                    </Button>
                  </DialogFooter>
                </div>

                {/* Right column - schedule panel */}
                <div className="hidden md:block rounded-2xl border border-border/60 bg-card/70 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Schedule</p>
                      <p className="text-xs text-muted-foreground">Pick date and time for this run.</p>
                    </div>
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Calendar
                      mode="single"
                      selected={form.watch("scheduled_at") ? new Date(form.watch("scheduled_at")) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const [hours, minutes] = (form.getValues("scheduled_time") || "20:00").split(":");
                          date.setHours(Number(hours));
                          date.setMinutes(Number(minutes));
                          form.setValue("scheduled_at", date.toISOString(), { shouldValidate: true });
                        } else {
                          form.setValue("scheduled_at", "", { shouldValidate: true });
                        }
                      }}
                      className="rounded-xl border border-border/40 bg-background/40"
                    />

                    <div className="grid gap-2">
                      <Label htmlFor="scheduled_time" className="text-xs text-muted-foreground">
                        Time
                      </Label>
                      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <ClockIcon className="h-4 w-4 text-muted-foreground" />
                        <input
                          id="scheduled_time"
                          type="time"
                          className="flex-1 bg-transparent text-sm outline-none"
                          value={form.watch("scheduled_time")}
                          onChange={(e) => {
                            form.setValue("scheduled_time", e.target.value);
                            const current = form.watch("scheduled_at");
                            if (current) {
                              const next = new Date(current);
                              const [h, m] = e.target.value.split(":");
                              next.setHours(Number(h));
                              next.setMinutes(Number(m));
                              form.setValue("scheduled_at", next.toISOString(), { shouldValidate: true });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
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
          <div className="rounded-2xl bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-foreground">{stats.active}</div>
              <div className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">Active</div>
            </div>
            <div className="text-xs text-muted-foreground">Runs</div>
          </div>
          <div className="rounded-2xl bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
              <div className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">Pending</div>
            </div>
            <div className="text-xs text-muted-foreground">Waiting</div>
          </div>
          <div className="rounded-2xl bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
              <div className="text-xs font-medium text-sky-500 bg-sky-500/10 px-2 py-1 rounded-md">Done</div>
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="rounded-2xl bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-foreground">12</div>
              <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">Players</div>
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
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
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
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
                          <Badge className="px-2 py-0.5 text-xs rounded-full" variant={r.status === "Active" ? "success" : r.status === "Pending" ? "warning" : "neutral"}>{r.status}</Badge>
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
                                <DropdownMenuItem onClick={() => toast.message("Run duplicated (mock). ")}>
                                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem variant="destructive">
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
                                      <AlertDialogAction onClick={() => { setRuns((prev) => prev.filter((x) => x.id !== r.id)); toast.success("Run deleted."); }}>Delete</AlertDialogAction>
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
