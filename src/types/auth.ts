export type RegisterRequest = {
  user_name: string;
  email: string;
  password: string;
  organization_name: string;
};

export type RegisterResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    is_active: boolean;
    created_at: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    created_at: string;
  };
  membership: {
    id: string;
    role: "ADMIN" | "MANAGER" | "AGENT" | "REQUESTER";
    is_active: boolean;
    created_at: string;
  };
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
};

export type AuthOrganization = {
  id: string;
  name: string;
  slug: string;
};

export type AuthMembership = {
  id: string;
  role: "ADMIN" | "MANAGER" | "AGENT" | "REQUESTER";
  is_active: boolean;
};

export type MeResponse = {
  user: AuthUser;
  organization: AuthOrganization;
  membership: AuthMembership;
};

export type LogoutResponse = {
  message: string;
  token_revoked: boolean;
};
