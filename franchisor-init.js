// ══ SUPABASE CONFIG ══
// Replace with your values from supabase.com → Settings → API
const SUPABASE_URL = 'https://fjmzsxslnzrtgcilttly.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zCZlpiOEgr0nQWt9Tp331g_wVxuaTb-'; // publishable key (public by design; legacy JWT anon key retired)

let sb = null;

async function initSupabase() {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✓ Franchisor Supabase connected');

    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      await loadProfileAndEnterApp(session.user.id);
    } else {
      document.getElementById('auth-gate').style.display = 'flex';
    }
  } catch(e) {
    console.error('Supabase connection failed:', e.message);
    showAuthError('Cannot connect — check your internet connection.');
  }
}

async function loadProfileAndEnterApp(userId) {
  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !profile) {
    showAuthError('Could not load your profile. Please try again.');
    await sb.auth.signOut();
    return;
  }

  // Platform admins oversee every brand and never see the regular
  // franchisor dashboard at all — a completely separate, much simpler
  // view that's only reachable by this one role.
  if (profile.role === 'platform_admin') {
    window.MY_PROFILE = profile;
    document.getElementById('auth-gate').style.display = 'none';
    document.getElementById('platform-admin-app').style.display = 'flex';
    await loadPlatformBrands();
    return;
  }

  if (profile.role !== 'franchisor') {
    showAuthError('This account is not registered as a franchisor.');
    await sb.auth.signOut();
    return;
  }

  window.MY_PROFILE = profile;
  const greetEl = document.querySelector('.section-title');
  if (greetEl && profile.full_name) greetEl.textContent = `Good morning, ${profile.full_name.split(' ')[0]}`;

  const { data: { user } } = await sb.auth.getUser();
  updateUserPill(profile, user?.email);

  document.getElementById('auth-gate').style.display = 'none';
  await loadDashboard();
  await loadDashboardOverview();
  await updateSidebarBadges();
  subscribeToAllOrders();
  subscribeToCMS();
}

// ── Sidebar nav badges — previously hardcoded demo numbers (Outlet Network "1",
// Machines "2", Complaints "3", Rent Tracker "2") that never changed regardless
// of real data. Each badge now reflects a real count, fetched fresh at startup
// rather than waiting for the user to visit that page first.
async function updateSidebarBadges() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const bid = window.MY_PROFILE.brand_id;
  try {
    const [healthRes, machinesRes, rentRes, issuesRes] = await Promise.all([
      sb.from('outlet_health').select('machine_status, rent_status').eq('brand_id', bid),
      sb.from('machines').select('status').eq('brand_id', bid),
      sb.from('rent_schedules').select('next_due_at').eq('brand_id', bid),
      sb.from('issues').select('id').eq('status', 'open').eq('brand_id', bid)
    ]);

    // Outlet Network — outlets not fully healthy (machine + rent both OK)
    const health = healthRes.data || [];
    const unhealthyOutlets = health.filter(o => !(o.machine_status === 'ok' && o.rent_status === 'current')).length;
    setBadge('badge-outlet-network', unhealthyOutlets);

    // Machines — anything not 'ok' (due_soon, overdue, emergency)
    const machines = machinesRes.data || [];
    const machinesNeedingAttention = machines.filter(m => m.status !== 'ok').length;
    setBadge('badge-machines', machinesNeedingAttention);

    // Rent Tracker — overdue OR due within 10 days, same threshold renderRentList() uses
    const rents = rentRes.data || [];
    const today = new Date();
    const rentNeedingAttention = rents.filter(r => {
      if (!r.next_due_at) return false;
      const daysLeft = Math.ceil((new Date(r.next_due_at) - today) / 86400000);
      return daysLeft <= 10; // covers both overdue (negative) and due-soon
    }).length;
    setBadge('badge-rent', rentNeedingAttention, 'amber');

    // Complaints — open issues reported by franchisees (issues table)
    setBadge('badge-complaints', (issuesRes.data || []).length);
  } catch (e) {
    console.warn('updateSidebarBadges error:', e?.message || e);
  }
}

// Sets a badge's count and hides it entirely when zero, rather than
// showing an alarming red "0" — a badge with nothing to report shouldn't
// draw attention at all.
function setBadge(id, count, colorClass) {
  const el = document.getElementById(id);
  if (!el) return;
  if (count > 0) {
    el.textContent = count;
    el.style.display = 'inline-block';
    el.className = 'nav-badge' + (colorClass ? ' ' + colorClass : '');
  } else {
    el.style.display = 'none';
  }
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('auth-form-login').style.display = isLogin ? 'block' : 'none';
  document.getElementById('auth-form-signup').style.display = isLogin ? 'none' : 'block';
  document.getElementById('auth-tab-login').style.background = isLogin ? 'var(--brand,#8B1A1A)' : 'transparent';
  document.getElementById('auth-tab-login').style.color = isLogin ? 'white' : 'var(--text2,#ccc)';
  document.getElementById('auth-tab-signup').style.background = isLogin ? 'transparent' : 'var(--brand,#8B1A1A)';
  document.getElementById('auth-tab-signup').style.color = isLogin ? 'var(--text2,#ccc)' : 'white';
  document.getElementById('auth-error').style.display = 'none';
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showAuthError('Please enter email and password.'); return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Logging in...';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Log In';

  if (error) { showAuthError(error.message); return; }
  await loadProfileAndEnterApp(data.user.id);
}

async function doSignup() {
  const full_name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const invite_code = document.getElementById('signup-invite').value.trim().toUpperCase();

  if (!full_name || !email || !password || !invite_code) {
    showAuthError('Please fill in all fields.'); return;
  }
  if (password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }

  const btn = document.getElementById('signup-btn');
  btn.disabled = true; btn.textContent = 'Validating invite code...';

  const { data: invite, error: inviteErr } = await sb.from('invite_codes')
    .select('*').eq('code', invite_code).eq('role', 'franchisor').maybeSingle();

  if (inviteErr || !invite) {
    btn.disabled = false; btn.textContent = 'Create Account';
    showAuthError('Invalid invite code.'); return;
  }
  if (invite.used_by) {
    btn.disabled = false; btn.textContent = 'Create Account';
    showAuthError('This invite code has already been used.'); return;
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    btn.disabled = false; btn.textContent = 'Create Account';
    showAuthError('This invite code has expired.'); return;
  }

  btn.textContent = 'Creating account...';
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { role: 'franchisor', full_name } }
  });

  if (error) {
    btn.disabled = false; btn.textContent = 'Create Account';
    showAuthError(error.message); return;
  }
  if (!data.session) {
    btn.disabled = false; btn.textContent = 'Create Account';
    showAuthError('Account created! Check your email to confirm, then log in.');
    switchAuthTab('login');
    return;
  }

  // Create the profile row directly (the DB trigger can't run on
  // Supabase-managed auth.users, so we do this client-side instead)
  const { error: profileErr } = await sb.from('profiles').upsert({
    id: data.user.id, role: 'franchisor', full_name, phone: null, brand_id: invite.brand_id
  });
  if (profileErr) {
    btn.disabled = false; btn.textContent = 'Create Account';
    showAuthError('Account created but profile setup failed: ' + profileErr.message);
    return;
  }

  // Mark the invite code as used
  await sb.from('invite_codes').update({ used_by: data.user.id, used_at: new Date().toISOString() })
    .eq('code', invite_code).is('used_by', null);

  btn.disabled = false; btn.textContent = 'Create Account';
  await loadProfileAndEnterApp(data.user.id);
}

// ══ LOAD DASHBOARD DATA ══
// NOTE: this now only loads order data for the Live Orders page —
// the actual dashboard overview rendering lives in loadDashboardOverview().
async function loadDashboard() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  try {
    const ordersRes = await sb.from('orders')
      .select('id,outlet_id,status,total,payment_method,created_at,order_items(*),outlets(name)')
      .not('status','eq','cancelled')
      .eq('brand_id', window.MY_PROFILE.brand_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (ordersRes.data) {
      window.ALL_ORDERS = ordersRes.data;
      renderOrders();
      const liveTotal = ordersRes.data.filter(o => o.status !== 'completed').length;
      const liveLabelEl = document.getElementById('live-count-label');
      if (liveLabelEl) liveLabelEl.textContent = `${liveTotal} active`;
    }

    // ── Live Orders KPI cards (previously hardcoded "247", "8", "LKR 78,400",
    // "LKR 317" regardless of brand or real data) — scoped to today only,
    // separate from the order-list query above which intentionally looks
    // back further than just today.
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const { data: todayOrders } = await sb.from('orders')
      .select('status, payment_method, payment_status, total')
      .not('status','eq','cancelled')
      .eq('brand_id', window.MY_PROFILE.brand_id)
      .gte('created_at', todayStart.toISOString());

    const today = todayOrders || [];
    const liveNow = today.filter(o => o.status !== 'completed').length;
    // Any non-card method left unconfirmed needs a franchisee tap to
    // resolve (cash/QR/voucher all share the same "Confirm Payment" flow
    // in the franchisee app) -- previously cash-only, but QR/voucher used
    // to be marked 'paid' at insert with no real confirmation, so this
    // undercounted once that was fixed.
    const cashPending = today.filter(o => o.payment_method !== 'card' && o.payment_status === 'pending').length;
    const appRevenue = today.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgOrder = today.length ? Math.round(appRevenue / today.length / 100) : 0;

    const setKpi = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    setKpi('kpi-orders-today', today.length);
    setKpi('kpi-orders-today-delta', today.length ? `${liveNow} live right now` : 'No orders yet today');
    setKpi('kpi-cash-pending', cashPending);
    setKpi('kpi-cash-pending-delta', cashPending ? 'Awaiting franchisee confirm' : 'None pending');
    setKpi('kpi-app-revenue', `LKR ${Math.round(appRevenue/100).toLocaleString()}`);
    setKpi('kpi-app-revenue-delta', today.length ? 'via customer app' : 'No revenue yet today');
    setKpi('kpi-avg-order', `LKR ${avgOrder.toLocaleString()}`);
    setKpi('kpi-avg-order-delta', today.length ? `${today.length} order${today.length===1?'':'s'} today` : 'No orders yet today');

    // Sidebar nav badge (previously hardcoded "4", only ever incremented by
    // the realtime subscription below — never given a real starting value).
    // Hidden at zero, same convention as the other sidebar badges, since a
    // pulsing animated "0" would misleadingly suggest something live is happening.
    const navBadge = document.getElementById('live-order-count');
    if (navBadge) navBadge.style.display = liveNow > 0 ? 'inline-block' : 'none';
    if (navBadge && liveNow > 0) navBadge.textContent = liveNow;

  } catch(e) {
    console.warn('Dashboard load error:', e);
  }
}


// Update the outlet matrix table from DB

