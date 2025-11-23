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

  try {
    // Handle 204 No Content or empty responses
    if (response.status === 204) {
      return {} as T;
    }
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
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
  logout: () => apiCall<void>("/api/auth/logout", { method: "GET" }),
  getProfile: () => apiCall<UserProfile>("/api/profile"),
};

// Character endpoints
export interface CharacterSpec {
  spec: string;
  role: "DPS" | "TANK" | "HEALER";
  type?: string;
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
  wcl_logs?: number; // Assuming this might be returned or calculated on backend, keeping it for now
  status?: "AVAILABLE" | "UNAVAILABLE";
}

export const characterApi = {
  list: () => apiCall<Character[]>("/api/characters"),
  create: (data: CharacterInput) =>
    apiCall<Character>("/api/characters", {
      method: "POST",
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
  difficulty: "Mythic" | "Heroic" | "Normal";
  scheduled_at: string;
  tank_capacity: number;
  healer_capacity: number;
  dps_capacity: number;
  discord_channel_id: string;
  roster_channel_id: string;
  embed_text: string;
}

export interface Run {
  id: string;
  server_id: string;
  title: string;
  difficulty: "Mythic" | "Heroic" | "Normal";
  scheduled_at: string;
  tank_capacity: number;
  healer_capacity: number;
  dps_capacity: number;
  roster_channel_id: string;
  discord_channel_id: string;
  embed_text?: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED"; // Updated to match likely backend enum (usually caps in DB or based on doc status update example)
  created_at: string;
  updated_at: string;
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
  updateStatus: (runId: string, status: string) =>
    apiCall<Run>(`/api/runs/${runId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  delete: (runId: string) =>
    apiCall<void>(`/api/runs/${runId}`, { method: "DELETE" }),
  announce: (runId: string) =>
    apiCall<void>(`/api/runs/${runId}/announce`, { method: "POST" }),
};

// Signup endpoints
export interface SignupInput {
  signup_type: "MAIN" | "ALT" | "BENCH";
}

export interface Signup {
  id: string;
  user_id: string;
  run_id: string;
  character_id: string;
  signup_type: "MAIN" | "ALT" | "BENCH";
  created_at: string;
  // Including potential user/character expansion if api provides it
  user?: { username: string, avatar: string };
  character?: Character;
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
export interface RosterInput {
  user_id: string;
  character_id: string;
  assigned_role: "TANK" | "HEALER" | "DPS"; // Caps based on other enums usually
}

export interface RosterSlot {
  id: string;
  run_id: string;
  user_id: string;
  character_id: string;
  assigned_role: "TANK" | "HEALER" | "DPS";
  character?: Character;
  user?: { username: string };
}

export const rosterApi = {
  get: (runId: string) =>
    apiCall<RosterSlot[]>(`/api/runs/${runId}/roster`),
  add: (runId: string, data: RosterInput) =>
    apiCall<RosterSlot>(`/api/runs/${runId}/roster`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
