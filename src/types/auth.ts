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
