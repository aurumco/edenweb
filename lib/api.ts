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

export const authApi = {
  getMe: () => apiCall<AuthUser>("/api/auth/me"),
  login: () => {
    window.location.href = `${API_BASE_URL}/api/auth/login`;
  },
  logout: () => apiCall<void>("/api/auth/logout", { method: "GET" }), // Redirects usually handle this, but maybe API returns 200 and then frontend redirects
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

export interface Character {
  id: string;
  char_name: string;
  char_class: string;
  ilevel: number;
  specs: CharacterSpec[];
  // wcl_logs?: number; // Not in documented POST/GET response explicitly but implied by scenario "Log(int)"
  status?: "AVAILABLE" | "UNAVAILABLE";
}

export const characterApi = {
  list: () => apiCall<Character[]>("/api/characters"),
  create: (data: CharacterInput) =>
    apiCall<Character>("/api/characters", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // Note: Update character details is not explicitly documented in the README summary,
  // but implied by "Edit character" requirement. Using PATCH /api/characters/:id based on standard patterns.
  update: (id: string, data: Partial<CharacterInput>) =>
    apiCall<Character>(`/api/characters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: "AVAILABLE" | "UNAVAILABLE") =>
    apiCall<Character>(`/api/characters/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  delete: (id: string) =>
    apiCall<void>(`/api/characters/${id}`, { method: "DELETE" }),
};

// Run endpoints
export interface RunInput {
  server_id: string;
  title: string;
  difficulty: "Mythic" | "Heroic" | "Normal"; // "that three"
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
  status: "PENDING" | "ACTIVE" | "COMPLETED"; // Check status enum validity
  // created_at, updated_at might be returned
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
  announce: (runId: string) =>
      apiCall<void>(`/api/runs/${runId}/announce`, {
          method: "POST"
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
  character_id: string; // Probably returned?
  signup_type: "MAIN" | "BENCH" | "ALT" | "DECLINE";
  created_at: string;
  // User/Character details might be expanded or separate
}

export const signupApi = {
  list: (runId: string) =>
    apiCall<Signup[]>(`/api/runs/${runId}/signups`),
  create: (runId: string, data: SignupInput) =>
    apiCall<Signup>(`/api/runs/${runId}/signup`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // No delete endpoint documented for signups
};

// Roster endpoints
export interface RosterSlot {
  // id: string; // Slot ID? Or is it user_id/char_id?
  user_id: string;
  character_id: string;
  assigned_role: "Tank" | "Healer" | "DPS";
}

export interface RosterInput {
  user_id: string;
  character_id: string;
  assigned_role: "Tank" | "Healer" | "DPS";
}

export const rosterApi = {
  get: (runId: string) =>
    apiCall<RosterSlot[]>(`/api/runs/${runId}/roster`),
  add: (runId: string, data: RosterInput) =>
    apiCall<RosterSlot>(`/api/runs/${runId}/roster`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // No explicit remove endpoint. Maybe 'add' handles updates.
};
