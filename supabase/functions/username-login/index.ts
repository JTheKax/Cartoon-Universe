import { createClient } from 'npm:@supabase/supabase-js@2';

const origin = Deno.env.get('SITE_ORIGIN') ?? 'https://cartoon-universe-3.onrender.com';
// Preserve the configured original origin and allow the allocated gateway only.
// Origin controls browser compatibility; password authentication remains mandatory.
const allowedOrigins = new Set([origin, 'https://cartoon-universe-gateway.onrender.com']);

Deno.serve(async (request) => {
  const requestOrigin = request.headers.get('Origin');
  const allowed = requestOrigin !== null && allowedOrigins.has(requestOrigin);
  const cors = {
    ...(allowed && requestOrigin ? { 'Access-Control-Allow-Origin': requestOrigin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'apikey, content-type',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  };
  const reply = (status: number, data: Record<string, unknown>) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (request.method === 'OPTIONS') return allowed
    ? new Response(null, { status: 204, headers: cors })
    : reply(403, { error: 'Forbidden' });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (!allowed) return reply(403, { error: 'Forbidden' });
  const url = Deno.env.get('SUPABASE_URL');
  const adminKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !adminKey || !publicKey) return reply(503, { error: 'Unavailable' });
  let username: unknown, password: unknown;
  try { ({ username, password } = await request.json()); } catch { return reply(400, { error: 'Invalid request' }); }
  if (typeof username !== 'string' || !/^[A-Za-z0-9_]{3,20}$/.test(username) ||
      typeof password !== 'string' || password.length < 1 || password.length > 1024)
    return reply(401, { error: 'Invalid credentials' });
  try {
    const admin = createClient(url, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: lookupError } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
    if (lookupError || !profile) return reply(401, { error: 'Invalid credentials' });
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id);
    const email = userData?.user?.email;
    if (userError || !email) return reply(401, { error: 'Invalid credentials' });
    const publicClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
    if (error || !data.session) return reply(401, { error: 'Invalid credentials' });
    return reply(200, { access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch {
    return reply(503, { error: 'Unavailable' });
  }
});
