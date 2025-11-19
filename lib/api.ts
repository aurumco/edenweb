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
  logout: () => apiCall<void>("/api/auth/logout", { method: "GET" }),
  getProfile: () => apiCall<UserProfile>("/api/profile"),
};

// Character endpoints
export interface CharacterInput {
  char_name: string;
  char_class: string;
  ilevel: number;
  specs: string[];
}

export interface Character {
  id: string;
  char_name: string;
  char_class: string;
  ilevel: number;
  specs: string[];
  wcl_logs?: number;
  status?: "Available" | "Unavailable";
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
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: "Available" | "Unavailable") =>
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
  roster_channel_id: string;
  embed_text?: string;
  capacity?: number;
}

export interface Run {
  id: string;
  server_id: string;
  title: string;
  difficulty: "Mythic" | "Heroic" | "Normal";
  scheduled_at: string;
  roster_channel_id: string;
  embed_text?: string;
  capacity: number;
  status: "Pending" | "Active" | "Completed";
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
  update: (serverId: string, runId: string, data: Partial<RunInput>) =>
    apiCall<Run>(`/api/runs/${serverId}/${runId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (serverId: string, runId: string) =>
    apiCall<void>(`/api/runs/${serverId}/${runId}`, { method: "DELETE" }),
  complete: (serverId: string, runId: string) =>
    apiCall<Run>(`/api/runs/${serverId}/${runId}/complete`, {
      method: "POST",
    }),
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
}

export const signupApi = {
  list: (serverId: string, runId: string) =>
    apiCall<Signup[]>(`/api/runs/${serverId}/${runId}/signups`),
  create: (serverId: string, runId: string, data: SignupInput) =>
    apiCall<Signup>(`/api/runs/${serverId}/${runId}/signup`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (serverId: string, runId: string, signupId: string) =>
    apiCall<void>(`/api/runs/${serverId}/${runId}/signups/${signupId}`, {
      method: "DELETE",
    }),
};

// Roster endpoints
export interface RosterSlot {
  id: string;
  run_id: string;
  role: "Tank" | "Healer" | "DPS";
  character_id?: string;
  position: number;
}

export interface RosterInput {
  character_id: string;
  role: "Tank" | "Healer" | "DPS";
}

export const rosterApi = {
  get: (serverId: string, runId: string) =>
    apiCall<RosterSlot[]>(`/api/runs/${serverId}/${runId}/roster`),
  add: (serverId: string, runId: string, data: RosterInput) =>
    apiCall<RosterSlot>(`/api/runs/${serverId}/${runId}/roster`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  remove: (serverId: string, runId: string, slotId: string) =>
    apiCall<void>(`/api/runs/${serverId}/${runId}/roster/${slotId}`, {
      method: "DELETE",
    }),
};
