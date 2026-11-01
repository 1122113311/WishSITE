(() => {
  const config = window.WISH_SUPABASE_CONFIG || {};
  const baseUrl = String(config.url || '').trim().replace(/\/+$/, '');
  const publishableKey = String(config.publishableKey || '').trim();
  const tableUrl = `${baseUrl}/rest/v1/product_reservations`;
  const configured = Boolean(baseUrl && publishableKey);

  const readResponse = async (response) => {
    const body = await response.text();
    let data = null;
    try { data = body ? JSON.parse(body) : null; } catch { data = body; }
    if (!response.ok) {
      const message = typeof data === 'object' && data?.message ? data.message : `Supabase ответил с ошибкой ${response.status}.`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return data;
  };

  const headers = (accessToken = '') => ({
    apikey: publishableKey,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  });

  const listPublic = async () => {
    if (!configured) return [];
    const response = await fetch(`${tableUrl}?select=category,product_id,product_name,created_at&order=created_at.desc`, {
      headers: headers(),
      cache: 'no-store'
    });
    return readResponse(response);
  };

  const reserve = async ({ category, productId, productName }) => {
    if (!configured) throw new Error('Бронирование ещё не настроено.');
    const response = await fetch(tableUrl, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ category, product_id: productId, product_name: productName })
    });
    if (response.status === 409) return { alreadyReserved: true };
    await readResponse(response);
    return { alreadyReserved: false };
  };

  const signInAdmin = async (email, password) => {
    if (!configured) throw new Error('Сначала настрой URL и publishable key Supabase в supabase-config.js.');
    const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return readResponse(response);
  };

  const listForAdmin = async (accessToken) => {
    const response = await fetch(`${tableUrl}?select=category,product_id,product_name,created_at&order=created_at.desc`, {
      headers: headers(accessToken),
      cache: 'no-store'
    });
    return readResponse(response);
  };

  const cancel = async (accessToken, reservation) => {
    const query = new URLSearchParams({
      category: `eq.${reservation.category}`,
      product_id: `eq.${reservation.product_id}`
    });
    const response = await fetch(`${tableUrl}?${query}`, {
      method: 'DELETE',
      headers: { ...headers(accessToken), Prefer: 'return=representation' }
    });
    const deleted = await readResponse(response);
    if (!Array.isArray(deleted) || deleted.length === 0) {
      throw new Error('Supabase не удалил бронь. Проверь, что аккаунт добавлен в reservation_admins.');
    }
    return deleted.length;
  };

  window.WishReservations = { isConfigured: () => configured, listPublic, reserve, signInAdmin, listForAdmin, cancel };
})();

