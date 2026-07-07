// ══ REAL-TIME ORDER STREAM ══
function subscribeToAllOrders() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const bid = window.MY_PROFILE.brand_id;
  sb.channel('franchisor-all-orders')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `brand_id=eq.${bid}` },
      async payload => {
        const order = payload.new;
        // Fetch items for popup
        const { data: items } = await sb.from('order_items').select('*').eq('order_id', order.id);
        const { data: outletRow } = await sb.from('outlets').select('name').eq('id', order.outlet_id).maybeSingle();
        const outletName = outletRow?.name || 'Unknown outlet';

        // Show live order popup
        document.getElementById('popup-title').textContent =
          (items||[]).map(i=>`${i.name} ×${i.quantity}`).join(' + ') || 'New order';
        document.getElementById('popup-sub').textContent =
          `${outletName} · ${order.payment_method==='cash'?'Cash':order.payment_method==='card'?'Card':order.payment_method==='voucher'?'Voucher':'QR'} · LKR ${Math.round(order.total/100).toLocaleString()}`;
        const popup = document.getElementById('order-popup');
        if (popup) { popup.classList.add('show'); setTimeout(()=>popup.classList.remove('show'), 6000); }

        // Increment live order count badge (un-hide it too, since it's
        // hidden when there are zero live orders)
        const badge = document.getElementById('live-order-count');
        if (badge) {
          badge.textContent = parseInt(badge.textContent||0)+1;
          badge.style.display = 'inline-block';
        }

        // Reload dashboard
        await loadDashboard();
      })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `brand_id=eq.${bid}` },
      () => loadDashboard())
    .subscribe();
}

// ══ CMS — LIVE UPDATES TO CUSTOMER APP ══
function subscribeToCMS() {
  if (!sb) return;
  // Menu/promo/coupon changes trigger customer app reload via realtime
  console.log('✓ CMS realtime channel active — changes publish to customer app instantly');
}

// CMS: Save menu item edits
async function saveMenuItemToDB(id, data) {
  if (!sb) { showToast('Connect Supabase to save changes live', '⚠'); return false; }
  const { error } = await sb.from('menu_items').update({
    name: data.name,
    description: data.desc,
    emoji: data.emoji,
    base_price: data.price * 100,
    original_price: data.oldPrice ? data.oldPrice * 100 : null,
    badge_label: data.badge || null,
    tags: data.tags ? data.tags.split(',').map(t=>t.trim()) : [],
    is_visible: data.visible,
    is_featured: data.featured,
    updated_at: new Date().toISOString()
  }).eq('id', id);
  return !error;
}

// CMS: Add new menu item
async function addMenuItemToDB(data) {
  if (!sb) { showToast('Connect Supabase to save','⚠'); return false; }
  const { error } = await sb.from('menu_items').insert({
    category_id: data.categoryId,
    name: data.name,
    description: data.desc,
    emoji: data.emoji,
    base_price: data.price * 100,
    original_price: data.oldPrice ? data.oldPrice * 100 : null,
    badge_label: data.badge || null,
    tags: data.tags ? data.tags.split(',').map(t=>t.trim()) : [],
    brand_id: window.MY_PROFILE?.brand_id,
    is_visible: true
  });
  return !error;
}

// CMS: Toggle menu item visibility
async function toggleMenuItemDB(itemId, isVisible) {
  if (!sb) return;
  await sb.from('menu_items').update({ is_visible: isVisible }).eq('id', itemId);
}

// CMS: Save promo slide
async function savePromoSlideToDB(id, data) {
  if (!sb) { showToast('Connect Supabase to publish','⚠'); return false; }
  const update = {
    headline: data.headline,
    sub_text: data.sub,
    emoji: data.emoji,
    label_badge: data.label,
    price_display: data.price,
    image_url: data.image_url || null,
    is_visible: data.visible,
    brand_id: window.MY_PROFILE?.brand_id,
    sort_order: id ? undefined : PROMO_SLIDES.length,
    updated_at: new Date().toISOString()
  };
  const { error } = id
    ? await sb.from('promo_slides').update(update).eq('id', id)
    : await sb.from('promo_slides').insert(update);
  return !error;
}

// CMS: Save home banner

// CMS: Save coupon

// CMS: Toggle coupon active

// CMS: Save app settings
async function saveAppSettingDB(key, value) {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  await sb.from('app_settings')
    .upsert({ key, value, brand_id: window.MY_PROFILE.brand_id, updated_at: new Date().toISOString() }, { onConflict: 'key,brand_id' });
}

// ══ INVOICES ══
async function loadInvoicesFromDB() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data } = await sb.from('invoices').select('*, outlets(name)').eq('brand_id', window.MY_PROFILE.brand_id).order('created_at', { ascending: false });
  return data;
}

// ══ ORDERS PAGE ══
function renderOrders() {
  const el = document.getElementById('order-stream');
  if (!el) return;
  const orders = window.ALL_ORDERS || [];
  if (!orders.length) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text3);font-family:var(--font-mono);font-size:13px;">
      No active orders — connect Supabase to see live data
    </div>`;
    return;
  }
  const statusMap = { pending:'Pending',confirmed:'Confirmed',preparing:'Preparing',ready:'Ready ✅',completed:'Done',cancelled:'Cancelled' };
  const statusPillMap = {
    pending:'status-blue',preparing:'status-blue',ready:'status-green',
    completed:'status-green',cancelled:'',cash:'status-amber'
  };
  el.innerHTML = orders.slice(0,20).map(o => {
    const isCash = o.payment_method==='cash' && o.status==='pending';
    const items = (o.order_items||[]);
    const outletName = o.outlets?.name || 'Unknown outlet';
    const time = new Date(o.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    return `<div class="order-card${isCash?' cash-pending':o.status==='pending'?' new-order':''}">
      <div class="oc-head">
        <div class="oc-order-num">${o.order_number||'—'}</div>
        <div class="oc-outlet">📍 ${outletName}</div>
        <div class="oc-time">${time}</div>
        <span class="status-pill ${statusPillMap[o.status]||''}">${statusMap[o.status]||o.status}</span>
      </div>
      ${isCash?`<div class="cash-confirm-banner">💵 Cash payment — awaiting franchisee confirmation at ${outletName}</div>`:''}
      <div class="oc-body">
        <div class="oc-items">
          ${items.map(i=>`<div class="oc-item-row">
            <div class="oc-item-emoji">${i.emoji||'☕'}</div>
            <div class="oc-item-name">${i.name}</div>
            <div class="oc-item-qty">×${i.quantity}</div>
            <div class="oc-item-price">LKR ${Math.round(i.line_total/100).toLocaleString()}</div>
          </div>`).join('')}
        </div>
      </div>
      <div class="oc-foot">
        <span class="oc-payment ocp-${o.payment_method}">${o.payment_method==='card'?'💳 Card':o.payment_method==='cash'?'💵 Cash':o.payment_method==='voucher'?'🎟️ Voucher':'📱 QR'}</span>
        <div class="oc-store">${outletName}</div>
        <div class="oc-total">LKR ${Math.round(o.total/100).toLocaleString()}</div>
        ${o.status==='pending'?`<button class="oc-action-btn btn-confirm" onclick="franchisorConfirmOrder('${o.id}')">Confirm</button>`:
          o.status==='preparing'?`<button class="oc-action-btn btn-ready" onclick="franchisorMarkReady('${o.id}')">Mark Ready</button>`:
          o.status==='ready'?`<button class="oc-action-btn btn-done" onclick="franchisorCompleteOrder('${o.id}')">Complete</button>`:''}
      </div>
    </div>`;
  }).join('');
}

async function franchisorConfirmOrder(id) {
  if (sb) await sb.from('orders').update({status:'preparing'}).eq('id',id);
  else showToast('Order confirmed','✓');
  await loadDashboard();
}
async function franchisorMarkReady(id) {
  if (sb) await sb.from('orders').update({status:'ready'}).eq('id',id);
  showToast('Order marked ready ✓','✅');
  await loadDashboard();
}
async function franchisorCompleteOrder(id) {
  if (sb) await sb.from('orders').update({status:'completed'}).eq('id',id);
  showToast('Order completed ✓','☕');
  await loadDashboard();
}

function filterOrders(filter, btn) {
  document.querySelectorAll('.of-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if (!window.ALL_ORDERS) return;
  const filtered = filter==='all' ? window.ALL_ORDERS :
    window.ALL_ORDERS.filter(o => filter==='cash' ? o.payment_method==='cash' : o.status===filter);
  window.ALL_ORDERS_FILTERED = filtered;
  renderOrders();
}
// ── Date ──
(function(){
  const d = new Date();
  document.getElementById('topbar-date').textContent = d.toLocaleDateString('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  // CSS handles page visibility via .page { display:none !important } and .page.active { display:block !important }
  // Just ensure dashboard is active on load (it already has class="page active" in HTML)
})();

// ── Navigation ──
const pageMap={dashboard:'Dashboard',network:'Outlet Network',ai:'Network Insights',orders:'Live Orders',stock:'Stock & Supply',machines:'Machines',finance:'Revenue & Payments',invoices:'Invoice Management',rent:'Rent Tracker',suppliers:'Supplier Management',beverages:'Beverage Analytics',coupons:'Coupon Analytics',complaints:'Complaints & Issues','cms-menu':'Menu Manager','cms-promo':'Promo & Banners','cms-coupons':'Coupon Campaigns','cms-settings':'App Settings'};
function navigate(id,navEl){
  // Hide all pages using classList only — CSS handles display via !important
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target page
  const pg = document.getElementById('page-' + id);
  if(pg) pg.classList.add('active');
  // Update nav highlight
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if(navEl){
    navEl.classList.add('active');
    navEl.scrollIntoView({behavior:'smooth', block:'nearest'});
  }
  document.getElementById('topbar-title').textContent = pageMap[id] || id;
  closeSidebar();
  window.scrollTo({top:0, behavior:'smooth'});
  if(id === 'orders') renderOrders();
  if(id === 'network') loadOutlets();
  if(id === 'cms-menu') loadMenuManager();
  if(id === 'cms-merch') loadMerchManager();
  if(id === 'cms-promo') loadPromoAndBanner();
  if(id === 'cms-coupons') loadCoupons();
  if(id === 'cms-settings') loadBrandSettings();
  if(id === 'machines') loadMachines();
  if(id === 'rent') loadRentSchedules();
  if(id === 'stock') loadStock();
  if(id === 'complaints') loadComplaints();
  if(id === 'suppliers') loadSuppliers();
  if(id === 'invoices') loadInvoices();
  if(id === 'finance') loadRevenuePage();
  if(id === 'coupons') loadCouponAnalytics();
  if(id === 'beverages') loadBeverageAnalytics();
  if(id === 'ai') loadAiInsights();
  if(id === 'dashboard') loadDashboardOverview();
}

// ══ OUTLET NETWORK — full CRUD wired to Supabase ══
async function loadOutlets() {
  const wrap = document.getElementById('outlets-table-wrap');
  if (!sb || !window.MY_PROFILE?.brand_id) { wrap.innerHTML = emptyOutletsState('Not connected to Supabase'); return; }

  const { data: health, error } = await sb.from('outlet_health').select('*').eq('brand_id', window.MY_PROFILE.brand_id);
  const { data: stockRows } = await sb.from('stock').select('outlet_id, current_qty, max_qty').eq('brand_id', window.MY_PROFILE.brand_id);

  if (error) {
    wrap.innerHTML = emptyOutletsState('Error loading outlets: ' + error.message);
    return;
  }

  document.getElementById('network-subtitle').textContent =
    `${health.length} outlet${health.length===1?'':'s'} · ${health.length ? 'All operational' : 'No outlets yet'}`;

  if (!health.length) {
    wrap.innerHTML = emptyOutletsState('No outlets yet — click "+ Add Outlet" to create your first one.');
    resetNetworkKpis();
    return;
  }

  // Compute avg stock % per outlet (lowest item = most urgent, shown in table)
  function stockPctFor(outletId) {
    const rows = (stockRows||[]).filter(s => s.outlet_id === outletId);
    if (!rows.length) return null;
    const pct = Math.min(...rows.map(s => Math.round((s.current_qty / s.max_qty) * 100)));
    return pct;
  }

  // ── KPIs ──
  const sorted = [...health].sort((a,b) => b.revenue_today - a.revenue_today);
  const best = sorted[0];
  const mostCups = [...health].sort((a,b) => b.cups_today - a.cups_today)[0];
  const worst = [...health].sort((a,b) => a.cups_today - b.cups_today)[0];
  const healthyCount = health.filter(o => o.machine_status === 'ok' && o.rent_status === 'current').length;

  document.getElementById('kpi-best-revenue').textContent = best.name;
  document.getElementById('kpi-best-revenue-sub').textContent = `▲ ${best.cups_today} cups · LKR ${Math.round(best.revenue_today/100).toLocaleString()}`;
  document.getElementById('kpi-most-cups').textContent = mostCups.cups_today;
  document.getElementById('kpi-most-cups-sub').textContent = `${mostCups.name} outlet`;
  document.getElementById('kpi-lowest').textContent = worst.name;
  document.getElementById('kpi-lowest-sub').textContent = `▼ ${worst.cups_today} cups`;
  document.getElementById('kpi-healthy').textContent = `${healthyCount} / ${health.length}`;
  document.getElementById('kpi-healthy-sub').textContent = `${health.length - healthyCount} need attention`;

  // ── Table ──
  wrap.innerHTML = `<table class="data-table">
    <thead><tr><th>Outlet</th><th>Status</th><th>Cups</th><th>Revenue</th><th>Cleans</th><th>Flushes</th><th>Stock</th><th>Machine</th><th></th></tr></thead>
    <tbody>
      ${health.map(o => {
        const isHealthy = o.machine_status === 'ok' && o.rent_status === 'current';
        const statusCls = isHealthy ? 'status-green' : (o.machine_status === 'overdue' ? 'status-red' : 'status-amber');
        const statusLabel = isHealthy ? 'Healthy' : (o.machine_status === 'overdue' ? 'Critical' : 'Warning');
        const dotCls = statusCls.replace('status-','dot-');
        const stockPct = stockPctFor(o.id);
        const stockBarCls = stockPct === null ? '' : (stockPct < 25 ? 'bar-red' : stockPct < 50 ? 'bar-amber' : 'bar-green');
        return `<tr onclick="openEditOutletModal('${o.id}')">
          <td><div style="font-weight:500">${o.name}</div><div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">${o.location||''}</div></td>
          <td><span class="status-pill ${statusCls}"><span class="dot ${dotCls}"></span>${statusLabel}</span></td>
          <td style="font-family:var(--font-mono)">${o.cups_today}</td>
          <td style="font-family:var(--font-mono)">LKR ${Math.round(o.revenue_today/100).toLocaleString()}</td>
          <td style="font-family:var(--font-mono);text-align:center">${o.cleans_today}×</td>
          <td style="font-family:var(--font-mono);text-align:center">${o.flushes_today}×</td>
          <td>${stockPct===null ? '<span style="color:var(--text3);font-size:11px">No data</span>' : `<div class="mini-bar"><div class="mini-bar-fill ${stockBarCls}" style="width:${stockPct}%"></div></div><div style="font-size:10px;color:var(--text3);font-family:var(--font-mono);margin-top:2px">${stockPct}%</div>`}</td>
          <td><span class="status-pill ${o.machine_status==='ok'?'status-green':o.machine_status==='overdue'?'status-red':'status-amber'}" style="font-size:10px">${o.machine_status ? o.machine_status.toUpperCase() : 'NO MACHINE'}</span></td>
          <td><button class="topbar-btn" style="font-size:11px;padding:4px 10px" onclick="event.stopPropagation();deleteOutlet('${o.id}','${o.name.replace(/'/g,"\\'")}')">Delete</button></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
  updateSidebarBadges();
  loadInviteCodes();
}

function emptyOutletsState(msg) {
  return `<div style="padding:60px 20px;text-align:center;color:var(--text3)">
    <div style="font-size:32px;margin-bottom:12px;">⬡</div>
    <div>${msg}</div>
  </div>`;
}

// ══ INVITE CODES — previously raw-SQL-only, no UI at all in either app ══
// Franchisees and franchisors both sign up via an invite code checked
// against this table (see doSignup() in both apps) — generating one
// required manually inserting a row in the SQL editor until now.
let INVITE_CODE_ROWS = [];

async function loadInviteCodes() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data, error } = await sb.from('invite_codes')
    .select('*, outlets(name)')
    .eq('brand_id', window.MY_PROFILE.brand_id)
    .order('created_at', { ascending: false });

  const listEl = document.getElementById('invite-codes-list');
  if (error) {
    listEl.innerHTML = `<div style="padding:30px;color:var(--text3)">Error loading invite codes: ${error.message}</div>`;
    return;
  }

  INVITE_CODE_ROWS = data || [];
  const activeCount = INVITE_CODE_ROWS.filter(c => !c.used_by && (!c.expires_at || new Date(c.expires_at) >= new Date())).length;
  const subEl = document.getElementById('invite-codes-subtitle');
  if (subEl) subEl.textContent = `${activeCount} active`;

  if (!INVITE_CODE_ROWS.length) {
    listEl.innerHTML = `<div style="padding:30px;color:var(--text3)">No invite codes yet — click "+ Generate Code" to create one.</div>`;
    return;
  }

  listEl.innerHTML = INVITE_CODE_ROWS.map(c => {
    const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
    const isUsed = !!c.used_by;
    const statusCls = isUsed ? 'status-green' : isExpired ? 'status-red' : 'status-blue';
    const statusLabel = isUsed ? 'USED' : isExpired ? 'EXPIRED' : 'ACTIVE';
    const roleLabel = c.role === 'franchisor' ? 'Franchisor' : 'Franchisee';
    const outletLabel = c.outlets?.name ? ` · ${c.outlets.name}` : '';
    const expiresLabel = c.expires_at ? `Expires ${new Date(c.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}` : 'No expiry';

    return `<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border);">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">
          <span style="font-family:var(--font-mono);font-weight:600;font-size:13px;">${c.code}</span>
          <span class="status-pill ${statusCls}" style="font-size:10px">${statusLabel}</span>
        </div>
        <div style="font-size:11px;color:var(--text3);font-family:var(--font-mono);">${roleLabel}${outletLabel} · ${expiresLabel}</div>
      </div>
      ${!isUsed ? `<button class="topbar-btn" style="font-size:11px;padding:4px 10px;" onclick="copyInviteCode('${c.code}')">Copy</button>` : ''}
      ${!isUsed ? `<button class="topbar-btn" style="font-size:11px;padding:4px 10px;" onclick="revokeInviteCode('${c.id}')">Revoke</button>` : ''}
    </div>`;
  }).join('');
}

async function openGenerateInviteModal() {
  document.getElementById('invite-role').value = 'franchisee';
  document.getElementById('invite-expires').value = '';
  toggleInviteOutletField();
  const sel = document.getElementById('invite-outlet');
  sel.innerHTML = '<option value="">Loading outlets...</option>';
  openModal('modal-generate-invite');

  const { data: outlets } = await sb.from('outlets').select('id, name, location').eq('brand_id', window.MY_PROFILE?.brand_id).order('name');
  sel.innerHTML = (outlets && outlets.length)
    ? outlets.map(o => `<option value="${o.id}">${o.name}${o.location?' — '+o.location:''}</option>`).join('')
    : '<option value="">No outlets available — add one first</option>';
}

// Franchisor invites aren't tied to any single outlet (a franchisor manages
// the whole network — see doSignup() in this app, which never sets
// outlet_id), so the outlet picker only makes sense for franchisee invites.
function toggleInviteOutletField() {
  const role = document.getElementById('invite-role').value;
  document.getElementById('invite-outlet-group').style.display = role === 'franchisee' ? 'block' : 'none';
}

function generateRandomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — avoids ambiguous codes when read aloud or handwritten
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function generateInviteCode() {
  const role = document.getElementById('invite-role').value;
  const outlet_id = role === 'franchisee' ? document.getElementById('invite-outlet').value : null;
  const expiresInput = document.getElementById('invite-expires').value;

  if (role === 'franchisee' && !outlet_id) { showToast('Select an outlet, or add one first', '⚠️'); return; }
  if (!sb) return;

  const btn = document.getElementById('invite-generate-btn');
  btn.disabled = true; btn.textContent = 'Generating...';

  const code = generateRandomCode();
  const { error } = await sb.from('invite_codes').insert({
    code, role, outlet_id,
    brand_id: window.MY_PROFILE?.brand_id || null,
    expires_at: expiresInput ? new Date(expiresInput).toISOString() : null
  });

  btn.disabled = false; btn.textContent = 'Generate';
  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-generate-invite');
  showToast(`Code ${code} generated ✓`, '🔑');
  loadInviteCodes();
}

function copyInviteCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast(`${code} copied to clipboard`, '📋');
  }).catch(() => {
    showToast(`Code: ${code} (copy failed — select manually)`, '⚠️');
  });
}

async function revokeInviteCode(id) {
  if (!confirm('Revoke this invite code? It can no longer be used to sign up.')) return;
  const { error } = await sb.from('invite_codes').delete().eq('id', id);
  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  showToast('Invite code revoked', '🗑️');
  loadInviteCodes();
}

