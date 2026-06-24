export interface Session {
  userId: string;
  email: string;
}

export interface SessionProvider {
  getSession(): Promise<Session | null>;
}

export class DemoSessionProvider implements SessionProvider {
  constructor(private readonly session: Session | null) {}
  async getSession(): Promise<Session | null> {
    return this.session;
  }
}

export interface SupabaseLike {
  auth: { getUser(): Promise<{ data: { user: { id: string; email?: string } | null } }> };
}

export function createSupabaseSessionProvider(client: SupabaseLike): SessionProvider {
  return {
    async getSession() {
      const { data } = await client.auth.getUser();
      if (!data.user) return null;
      return { userId: data.user.id, email: data.user.email ?? '' };
    },
  };
}
