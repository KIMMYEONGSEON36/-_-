(function () {
  const config = window.DESIGN_FLOW_SUPABASE || {};
  const baseUrl = String(config.url || "").replace(/\/$/, "");
  const publishableKey = config.publishableKey || "";
  const sessionKey = "design-flow-auth-session-v1";

  function getStoredSession() {
    try { return JSON.parse(localStorage.getItem(sessionKey) || "null"); }
    catch { return null; }
  }

  function storeSession(session) {
    if (session) localStorage.setItem(sessionKey, JSON.stringify(session));
    else localStorage.removeItem(sessionKey);
  }

  async function authRequest(path, body) {
    const response = await fetch(`${baseUrl}/auth/v1/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: publishableKey },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.msg || payload.message || payload.error_description || "로그인 요청을 처리하지 못했습니다.");
    return payload;
  }

  async function getSession() {
    let session = getStoredSession();
    if (!session) return null;
    if (session.expires_at && session.expires_at > Math.floor(Date.now() / 1000) + 60) return session;
    if (!session.refresh_token) { storeSession(null); return null; }
    try {
      const next = await authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
      session = { ...next, expires_at: Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600) };
      storeSession(session);
      return session;
    } catch {
      storeSession(null);
      return null;
    }
  }

  async function api(path, options = {}) {
    if (!baseUrl || !publishableKey) throw new Error("Supabase URL과 Publishable key 설정이 없습니다.");
    const session = options.public ? null : await getSession();
    const headers = {
      apikey: publishableKey,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.prefer ? { Prefer: options.prefer } : {})
    };
    const response = await fetch(`${baseUrl}${path}`, { method: options.method || "GET", headers, body: options.body ? JSON.stringify(options.body) : undefined });
    if (response.status === 204) return null;
    const raw = await response.text();
    const payload = raw ? JSON.parse(raw) : null;
    if (!response.ok) throw new Error(payload?.message || payload?.msg || payload?.hint || `Supabase 요청 실패 (${response.status})`);
    return payload;
  }

  function queryString(values = {}) {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => params.set(key, value));
    return params.toString();
  }

  window.DesignFlowData = {
    ready: Boolean(baseUrl && publishableKey),
    async signIn(email, password) {
      const session = await authRequest("token?grant_type=password", { email, password });
      storeSession({ ...session, expires_at: Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600) });
      return session.user;
    },
    async signOut() {
      const session = await getSession();
      try { if (session) await api("/auth/v1/logout", { method: "POST" }); }
      finally { storeSession(null); }
    },
    getSession,
    async getProfile() {
      const session = await getSession();
      if (!session?.user?.id) return null;
      const rows = await api(`/rest/v1/profiles?select=user_id,display_name,role&user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`);
      return rows?.[0] || null;
    },
    async select(table, filters = {}, order = "") {
      const params = { select: "*", ...filters };
      if (order) params.order = order;
      return api(`/rest/v1/${table}?${queryString(params)}`);
    },
    async insert(table, value, isPublic = false) {
      return api(`/rest/v1/${table}`, { method: "POST", body: value, prefer: "return=minimal", public: isPublic });
    },
    async update(table, id, value) {
      return api(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: value, prefer: "return=minimal" });
    },
    async remove(table, id) {
      return api(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
    }
  };
})();
