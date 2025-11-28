const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.edenhub.net";

export interface ApiError {
  message: string;
  status: number;
}

async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = {
      status: response.status,
      message: `API Error: ${response.status}`,
    };

    try {
      const data = await response.json();
      if (data && typeof data === 'object' && 'message' in data) {
        error.message = (data as any).message || error.message;
      }
    } catch {
      // If response is not JSON, use default message
    }

    throw error;
  }

  // For 204 No Content or empty responses
  if (response.status === 204) {
      return {} as T;
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}

// Auth endpoints
export interface AuthUser {
  userId: string;
  username: string;
  avatar?: string;
  isAdmin?: boolean;
}

export interface UserProfile {
  user: {
    displayName: string;
    payoutName: string;
    wallet: string;
    joinDate: string;
  };
  finance: {
    currentBalance: number;
    pendingEscrow: number;
    isFrozen: boolean;
  };
  stats: {
    totalRuns: number;
  };
  aliases: string[];
}

export interface DashboardStats {
    total_players: number;
    active_runs: number;
}

export const statsApi = {
    get: () => apiCall<DashboardStats>("/api/stats")
};

export const authApi = {
  getMe: () => apiCall<AuthUser>("/api/auth/me"),
  login: () => {
    window.location.href = `${API_BASE_URL}/api/auth/login`;
  },
  logout: () => apiCall<void>("/api/auth/logout", { method: "GET" }),
  getProfile: () => apiCall<UserProfile>("/api/profile"),
};

// Character endpoints
export interface CharacterSpec {
    spec: string;
    role: string;
    type: string;
}

export interface CharacterInput {
  char_name: string;
  char_class: string;
  ilevel: number;
  specs: CharacterSpec[];
}

export interface CharacterLock {
  status: "AVAILABLE" | "PENDING" | "LOCKED";
  isLocked: boolean;
  isLockedBySystem: boolean;
}

export interface Character {
  id: string;
  char_name: string;
  char_class: string;
  ilevel: number;
  specs: CharacterSpec[];
  // For backwards compatibility or specific contexts where flat status is used
  status?: "AVAILABLE" | "UNAVAILABLE" | "PENDING" | "LOCKED";
  // Updated locks structure
  locks?: Record<string, CharacterLock>;
  // Additional fields that might appear in specific contexts (like signup availability)
  is_locked?: boolean;
  is_locked_by_system?: boolean;
}

export const characterApi = {
  list: () => apiCall<Character[]>("/api/characters"),
  create: (data: CharacterInput) =>
    apiCall<Character>("/api/characters", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<CharacterInput>) =>
    apiCall<Character>(`/api/characters/${id}`, {
      method: "PATCH", 
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, payload: { status: "AVAILABLE" | "UNAVAILABLE" } | { difficulty: string, status: "LOCKED" | "AVAILABLE" }) =>
    apiCall<Character>(`/api/characters/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiCall<void>(`/api/characters/${id}`, { method: "DELETE" }),
};

// Run endpoints
export interface RunInput {
  server_id: string;
  title: string;
  difficulty: "Mythic" | "Heroic" | "Normal";
  scheduled_at: string;
  roster_channel_id: string;
  discord_channel_id: string; // Required
  embed_text?: string;
  tank_capacity: number;
  healer_capacity: number;
  dps_capacity: number;
}

export interface Run {
  id: string;
  server_id: string;
  title: string;
  difficulty: "Mythic" | "Heroic" | "Normal";
  scheduled_at: string;
  roster_channel_id: string;
  discord_channel_id: string;
  embed_text?: string;
  tank_capacity: number;
  healer_capacity: number;
  dps_capacity: number;
  status: "PENDING" | "ACTIVE" | "COMPLETED";
}

export const runApi = {
  list: (serverId: string) =>
    apiCall<Run[]>(`/api/runs/${serverId}`),
  get: (serverId: string, runId: string) =>
    apiCall<Run>(`/api/runs/${serverId}/${runId}`),
  create: (data: RunInput) =>
    apiCall<Run>("/api/runs", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (runId: string, data: Partial<RunInput>) =>
    apiCall<Run>(`/api/runs/${runId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (runId: string) =>
    apiCall<void>(`/api/runs/${runId}`, { method: "DELETE" }),
  updateStatus: (runId: string, status: string) => 
    apiCall<Run>(`/api/runs/${runId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
    }),
  announce: (runId: string, payload?: { mention?: boolean }) =>
      apiCall<void>(`/api/runs/${runId}/announce`, {
          method: "POST",
          body: JSON.stringify(payload || {})
      })
};

// Signup endpoints
export interface SignupInput {
  signup_type: "MAIN" | "BENCH" | "ALT" | "DECLINE";
}

export interface Signup {
  id: string;
  user_id: string;
  run_id: string;
  signup_type: "MAIN" | "BENCH" | "ALT" | "DECLINE";
  created_at: string;
  status: string;
  display_name?: string;
  available_characters: Character[];
}

export const signupApi = {
  list: (runId: string) =>
    apiCall<Signup[]>(`/api/runs/${runId}/signups`),
  create: (runId: string, data: SignupInput) =>
    apiCall<Signup>(`/api/runs/${runId}/signup`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Roster endpoints
export interface RosterSlot {
  user_id: string;
  character_id: string;
  assigned_role: "TANK" | "HEALER" | "DPS";
}

export interface RosterInput {
  user_id: string;
  character_id: string;
  assigned_role: "TANK" | "HEALER" | "DPS";
}

export const rosterApi = {
  get: (runId: string) =>
    apiCall<RosterSlot[]>(`/api/runs/${runId}/roster`),
  add: (runId: string, data: RosterInput) =>
    apiCall<RosterSlot>(`/api/runs/${runId}/roster`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (runId: string, characterId: string) =>
    apiCall<void>(`/api/runs/${runId}/roster/${characterId}`, {
      method: "DELETE"
    }),
};
