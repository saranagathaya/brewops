// ══ REVENUE & PAYMENTS — read-only aggregate view ══
async function loadRevenuePage() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data: invoices } = await sb.from('invoices').select('*, outlets(name)').eq('brand_id', window.MY_PROFILE.brand_id);
  const { data: payments } = await sb.from('supplier_payments').select('amount, status').eq('brand_id', window.MY_PROFILE.brand_id);

  const inv = invoices || [];
  const cycleRevenue = inv.reduce((sum,i) => sum + i.revenue_amount, 0);
  const collected = inv.filter(i => i.status === 'paid').reduce((sum,i) => sum + i.total_due, 0);
  const outstanding = inv.filter(i => i.status !== 'paid').reduce((sum,i) => sum + i.total_due, 0);
  const pendingCount = inv.filter(i => i.status !== 'paid').length;
  const totalDue = inv.reduce((sum,i) => sum + i.total_due, 0);
  const collectionRate = totalDue > 0 ? Math.round((collected/totalDue)*100) : 0;
  const supplierPayable = (payments||[]).filter(p => p.status !== 'paid').reduce((sum,p) => sum + p.amount, 0);

  const fmt = n => Math.round(n/100) >= 1000 ? `${(Math.round(n/100)/1000).toFixed(0)}K` : Math.round(n/100).toLocaleString();

  document.getElementById('revenue-subtitle').textContent = `${inv.length} invoice${inv.length===1?'':'s'} this billing cycle`;
  document.getElementById('kpi-cycle-revenue').textContent = `LKR ${fmt(cycleRevenue)}`;
  document.getElementById('kpi-collected').textContent = `LKR ${fmt(collected)}`;
  document.getElementById('kpi-collected-sub').textContent = `${collectionRate}% rate`;
  document.getElementById('kpi-outstanding').textContent = `LKR ${fmt(outstanding)}`;
  document.getElementById('kpi-outstanding-sub').textContent = `${pendingCount} pending`;
  document.getElementById('kpi-payable').textContent = `LKR ${fmt(supplierPayable)}`;

  const list = document.getElementById('revenue-by-outlet');
  if (!inv.length) {
    list.innerHTML = `<div style="padding:30px;color:var(--text3)">No invoices yet — create one from the Invoices page to see payment status here.</div>`;
    return;
  }

  list.innerHTML = inv.map(i => {
    const isOverdue = i.status !== 'paid' && new Date(i.period_end) < new Date();
    const statusCfg = i.status === 'paid' ? ['status-green', 'Paid ✓'] : isOverdue ? ['status-red', 'Overdue'] : ['status-amber', 'Pending'];
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="flex:1;font-size:13px"><strong>${i.outlets?.name||'Unknown'}</strong></span>
      <span style="font-family:var(--font-mono);font-weight:500">LKR ${Math.round(i.total_due/100).toLocaleString()}</span>
      <span class="status-pill ${statusCfg[0]}">${statusCfg[1]}</span>
    </div>`;
  }).join('');
}

// ══ COUPON ANALYTICS — read-only aggregate view ══
async function loadCouponAnalytics() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data } = await sb.from('coupons').select('*').eq('brand_id', window.MY_PROFILE.brand_id).order('total_used', { ascending: false });
  const coupons = data || [];

  const totalUsed = coupons.reduce((sum,c) => sum + (c.total_used||0), 0);
  // Estimate only — actual redeemed amounts aren't tracked per-redemption, this is
  // discount_value × total_used as an approximation for percent/fixed types.
  const estTotalDiscount = coupons.reduce((sum,c) => {
    if (c.discount_type === 'fixed') return sum + (c.discount_value * (c.total_used||0));
    return sum; // percent/free discounts can't be estimated without order totals
  }, 0);
  const mostUsed = coupons[0];
  const avgDiscount = totalUsed > 0 ? Math.round(estTotalDiscount / totalUsed) : 0;

  document.getElementById('coupon-analytics-subtitle').textContent = `${coupons.length} campaign${coupons.length===1?'':'s'} tracked`;
  document.getElementById('ca-total-used').textContent = totalUsed;
  document.getElementById('ca-total-discount').textContent = `LKR ${Math.round(estTotalDiscount/100).toLocaleString()}`;
  document.getElementById('ca-most-used').textContent = mostUsed ? mostUsed.code : '—';
  document.getElementById('ca-most-used-sub').textContent = mostUsed ? `${mostUsed.total_used||0}× total` : '';
  document.getElementById('ca-avg-discount').textContent = avgDiscount > 0 ? `LKR ${Math.round(avgDiscount/100)}` : '—';

  const list = document.getElementById('coupon-performance-list');
  if (!coupons.length) {
    list.innerHTML = `<div style="padding:30px;color:var(--text3)">No coupons yet — create one from Coupon Campaigns to see performance here.</div>`;
    return;
  }

  const descMap = { percent: v => `${v}% off`, fixed: v => `LKR ${Math.round(v/100)} off`, free: () => 'Free item' };
  list.innerHTML = coupons.map(c => `
    <div class="coupon-cms-item">
      <div class="coupon-code-tag">${c.code}</div>
      <div class="cci-desc">${descMap[c.discount_type] ? descMap[c.discount_type](c.discount_value) : c.discount_type}</div>
      <div class="cci-usage">${c.total_used||0}× used</div>
      <div class="cci-status" style="background:${c.is_active?'var(--green-dim)':'var(--red-dim)'};color:${c.is_active?'var(--green-text)':'var(--red-text)'}">${c.is_active?'Active':'Inactive'}</div>
    </div>`).join('');
}

// ══ BEVERAGE ANALYTICS — read-only aggregate view ══
async function loadBeverageAnalytics() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data: items } = await sb.from('order_items').select('name, quantity').eq('brand_id', window.MY_PROFILE.brand_id);
  const { count: menuCount } = await sb.from('menu_items').select('id', { count: 'exact', head: true }).eq('brand_id', window.MY_PROFILE.brand_id);

  const rows = items || [];
  document.getElementById('bev-total-varieties').textContent = menuCount ?? 0;

  if (!rows.length) {
    document.getElementById('bev-analytics-subtitle').textContent = 'No sales data yet';
    document.getElementById('bev-most-popular').textContent = '—';
    document.getElementById('bev-trend').textContent = 'Not enough data';
    document.getElementById('bev-trend-sub').textContent = 'Needs 2+ months of orders';
    document.getElementById('bev-total-orders').textContent = '0';
    document.getElementById('bev-ranking-list').innerHTML = `<div style="padding:30px;color:var(--text3)">No beverage sales recorded yet — rankings will appear here once customers start ordering.</div>`;
    return;
  }

  // Aggregate quantity sold per beverage name
  const counts = {};
  rows.forEach(r => { counts[r.name] = (counts[r.name]||0) + (r.quantity||1); });
  const ranked = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  const totalQty = ranked.reduce((s,[,q]) => s+q, 0);

  document.getElementById('bev-analytics-subtitle').textContent = `Based on ${totalQty} items sold across ${ranked.length} beverage${ranked.length===1?'':'s'}`;
  document.getElementById('bev-most-popular').textContent = ranked[0][0];
  document.getElementById('bev-most-popular-sub').textContent = `${Math.round((ranked[0][1]/totalQty)*100)}% of all orders`;
  document.getElementById('bev-total-orders').textContent = totalQty;

  // Trend comparison needs real month-over-month data — only show if we have it
  document.getElementById('bev-trend').textContent = 'Not enough data';
  document.getElementById('bev-trend-sub').textContent = 'Needs 2+ months of order history';

  const colors = ['var(--green-text)','var(--accent)','var(--blue)','var(--purple)','var(--blue-text)'];
  const barCls = ['bar-green','',''  ,'',''];
  const list = document.getElementById('bev-ranking-list');
  list.innerHTML = ranked.slice(0,10).map(([name,qty],i) => {
    const pct = Math.round((qty/totalQty)*100);
    const widthPct = Math.round((qty/ranked[0][1])*100);
    const color = colors[i] || 'var(--text3)';
    return `<div class="bev-row">
      <div class="bev-rank">${i+1}</div>
      <div class="bev-name">${name}</div>
      <div class="bev-bar-wrap"><div class="mini-bar"><div class="mini-bar-fill" style="width:${widthPct}%;background:${color}"></div></div></div>
      <div class="bev-count">${qty}</div>
      <div class="bev-pct">${pct}%</div>
    </div>`;
  }).join('');
}

// ══ NETWORK INSIGHTS — real computed metrics, no fabricated predictions ══
async function loadAiInsights() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const bid = window.MY_PROFILE.brand_id;
  const [{ data: outlets }, { data: machines }, { data: stock }, { data: invoices }, { data: rents }, { data: health }] = await Promise.all([
    sb.from('outlets').select('id, name').eq('brand_id', bid),
    sb.from('machines').select('*, outlets(name)').eq('brand_id', bid),
    sb.from('stock').select('*, outlets(name)').eq('brand_id', bid),
    sb.from('invoices').select('*, outlets(name)').eq('brand_id', bid),
    sb.from('rent_schedules').select('*, outlets(name)').eq('brand_id', bid),
    sb.from('outlet_health').select('*').eq('brand_id', bid)
  ]);

  const outletCount = (outlets||[]).length;

  if (outletCount === 0) {
    document.getElementById('ai-score-num').textContent = '—';
    document.getElementById('ai-score-verdict').textContent = 'No data yet';
    document.getElementById('ai-summary').textContent = 'Add outlets, machines, and stock records to start seeing network health here.';
    document.getElementById('ai-revenue-card').innerHTML = `<div style="padding:10px;color:var(--text3)">No outlets yet</div>`;
    document.getElementById('ai-risks-card').innerHTML = `<div style="padding:10px;color:var(--text3)">No outlets yet</div>`;
    document.getElementById('ai-observations-card').innerHTML = `<div style="padding:10px;color:var(--text3)">No outlets yet</div>`;
    return;
  }

  // ── Real risk detection (no fabricated probabilities) ──
  const risks = [];
  (machines||[]).forEach(m => {
    if (m.status === 'overdue' || m.status === 'emergency') {
      const days = m.next_service_due ? Math.abs(Math.ceil((new Date(m.next_service_due)-new Date())/86400000)) : null;
      risks.push({ icon:'⚙', cls:'critical', title:'Machine overdue for service', desc:`${m.outlets?.name||'Outlet'}${days!==null?` — ${days} days overdue`:''}` });
    }
  });
  (stock||[]).forEach(s => {
    const pct = Math.round((s.current_qty/s.max_qty)*100);
    if (pct < 25) risks.push({ icon:'📦', cls:'warning', title:'Low stock', desc:`${s.outlets?.name||'Outlet'} — ${s.item_name} at ${pct}%` });
  });
  (invoices||[]).forEach(i => {
    if (i.status !== 'paid' && new Date(i.period_end) < new Date()) {
      const days = Math.ceil((new Date()-new Date(i.period_end))/86400000);
      risks.push({ icon:'💳', cls:'info', title:'Overdue invoice', desc:`${i.outlets?.name||'Outlet'} — ${days}d overdue` });
    }
  });
  (rents||[]).forEach(r => {
    if (r.status === 'overdue') risks.push({ icon:'🏠', cls:'critical', title:'Rent overdue', desc:`${r.outlets?.name||'Outlet'} — LKR ${Math.round(r.monthly_amount/100).toLocaleString()}` });
  });

  // ── Real health score: starts at 100, deducts for each real issue found ──
  let score = 100;
  score -= risks.filter(r=>r.cls==='critical').length * 15;
  score -= risks.filter(r=>r.cls==='warning').length * 8;
  score -= risks.filter(r=>r.cls==='info').length * 5;
  score = Math.max(0, Math.min(100, score));

  const verdict = score >= 85 ? ['Healthy', 'var(--green-text)'] : score >= 60 ? ['Needs attention', 'var(--amber-text)'] : ['At risk', 'var(--red-text)'];
  document.getElementById('ai-score-num').textContent = score;
  document.getElementById('ai-score-verdict').textContent = verdict[0];
  document.getElementById('ai-score-verdict').style.color = verdict[1];

  const totalCups = (health||[]).reduce((s,h) => s+(h.cups_today||0), 0);
  const totalRevenue = (health||[]).reduce((s,h) => s+(h.revenue_today||0), 0);
  document.getElementById('ai-summary').textContent = risks.length
    ? `${outletCount} outlet${outletCount===1?'':'s'} tracked. ${totalCups} cups sold today across the network (LKR ${Math.round(totalRevenue/100).toLocaleString()}). ${risks.length} issue${risks.length===1?'':'s'} need attention below.`
    : `${outletCount} outlet${outletCount===1?'':'s'} tracked. ${totalCups} cups sold today (LKR ${Math.round(totalRevenue/100).toLocaleString()}). No active risks detected.`;

  // ── Revenue card (real, from outlet_health) ──
  const revCard = document.getElementById('ai-revenue-card');
  if (!health || !health.length) {
    revCard.innerHTML = `<div style="padding:10px;color:var(--text3)">No revenue data yet today</div>`;
  } else {
    const sorted = [...health].sort((a,b) => b.revenue_today - a.revenue_today);
    revCard.innerHTML = `
      <div class="fin-row"><span class="fin-label">Revenue today</span><span class="fin-amount green">LKR ${Math.round(totalRevenue/100).toLocaleString()}</span></div>
      <div class="fin-row"><span class="fin-label">Cups sold today</span><span class="fin-amount">${totalCups}</span></div>
      <div class="fin-row"><span class="fin-label">Best performing</span><span class="fin-amount" style="color:var(--accent2)">${sorted[0]?.name || '—'}</span></div>
      <div class="fin-row"><span class="fin-label">Live orders now</span><span class="fin-amount">${(health||[]).reduce((s,h)=>s+(h.live_orders||0),0)}</span></div>`;
  }

  // ── Risks card ──
  const riskCard = document.getElementById('ai-risks-card');
  riskCard.innerHTML = risks.length
    ? risks.slice(0,5).map((r,i) => `<div class="alert-item" ${i===Math.min(risks.length,5)-1?'style="border:none"':''}><div class="alert-icon ${r.cls}">${r.icon}</div><div><div class="alert-title">${r.title}</div><div class="alert-desc">${r.desc}</div></div></div>`).join('')
    : `<div style="padding:10px;color:var(--text3)">No active risks — network looks healthy.</div>`;

  // ── Observations card (real, derived from actual data patterns) ──
  const obsCard = document.getElementById('ai-observations-card');
  const observations = [];
  const { data: coupons } = await sb.from('coupons').select('code, total_used, is_active').eq('brand_id', window.MY_PROFILE?.brand_id).order('total_used', { ascending: false }).limit(1);
  if (coupons && coupons[0] && coupons[0].total_used > 0) {
    observations.push(`"${coupons[0].code}" is your most-used coupon (${coupons[0].total_used}× redeemed)`);
  }
  const healthyOutlets = (machines||[]).filter(m => m.status === 'ok').length;
  if ((machines||[]).length) observations.push(`${healthyOutlets}/${machines.length} machines are operating normally`);
  if (!observations.length) observations.push('Not enough activity yet to surface observations — check back once you have more orders, coupons, and stock data.');

  obsCard.innerHTML = observations.map(o => `<div class="fin-row" style="border-bottom:1px solid var(--border)"><span class="fin-label" style="line-height:1.5">${o}</span></div>`).join('');
}

// ══ DASHBOARD — real aggregated overview ══
async function loadDashboardOverview() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const bid = window.MY_PROFILE.brand_id;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = window.MY_PROFILE?.full_name?.split(' ')[0] || '';
  document.getElementById('dash-greeting').textContent = name ? `${greeting}, ${name}` : greeting;

  const [{ data: outlets }, { data: health }, { data: machines }, { data: stock }, { data: invoices }, { data: rents } ] = await Promise.all([
    sb.from('outlets').select('id, name').eq('brand_id', bid),
    sb.from('outlet_health').select('*').eq('brand_id', bid),
    sb.from('machines').select('*, outlets(name)').eq('brand_id', bid),
    sb.from('stock').select('*, outlets(name)').eq('brand_id', bid),
    sb.from('invoices').select('*, outlets(name)').eq('brand_id', bid),
    sb.from('rent_schedules').select('*, outlets(name)').eq('brand_id', bid)
  ]);

  document.getElementById('dash-subtitle').textContent = `Network overview · ${(outlets||[]).length} outlet${(outlets||[]).length===1?'':'s'}`;
  document.getElementById('dash-outlet-count').textContent = `Live · ${(outlets||[]).length} outlets`;

  if (!outlets || !outlets.length) {
    document.getElementById('dash-score-num').textContent = '—';
    document.getElementById('dash-summary').textContent = 'Add your first outlet from Outlet Network to start seeing data here.';
    document.getElementById('dash-revenue').textContent = 'LKR 0';
    document.getElementById('dash-live-orders').textContent = '0';
    document.getElementById('dash-cups').textContent = '0';
    document.getElementById('dash-outstanding').textContent = 'LKR 0';
    document.getElementById('outlet-matrix-body').innerHTML = `<tr><td colspan="6" style="padding:30px;color:var(--text3);text-align:center">No outlets yet — <a href="#" onclick="navigate('network',null);return false;" style="color:var(--accent2)">add one to get started</a></td></tr>`;
    document.getElementById('dash-alerts').innerHTML = `<div style="padding:10px;color:var(--text3)">No alerts yet</div>`;
    document.getElementById('dash-revenue-summary').innerHTML = `<div style="padding:10px;color:var(--text3)">No data yet</div>`;
    document.getElementById('dash-top-beverages').innerHTML = `<div style="padding:10px;color:var(--text3)">No sales yet</div>`;
    return;
  }

  // ── KPIs ──
  const totalRevenue = (health||[]).reduce((s,h) => s+(h.revenue_today||0), 0);
  const totalCups = (health||[]).reduce((s,h) => s+(h.cups_today||0), 0);
  const liveOrders = (health||[]).reduce((s,h) => s+(h.live_orders||0), 0);
  const outstanding = (invoices||[]).filter(i=>i.status!=='paid').reduce((s,i)=>s+i.total_due,0);

  document.getElementById('dash-revenue').textContent = `LKR ${Math.round(totalRevenue/100).toLocaleString()}`;
  document.getElementById('dash-live-orders').textContent = liveOrders;
  document.getElementById('dash-cups').textContent = totalCups.toLocaleString();
  document.getElementById('dash-outstanding').textContent = `LKR ${Math.round(outstanding/100).toLocaleString()}`;

  // ── Health score + risks (reuse same logic as Network Insights) ──
  const risks = [];
  (machines||[]).forEach(m => { if (m.status==='overdue'||m.status==='emergency') risks.push({icon:'🔧',cls:'critical',title:'Machine Service Overdue',desc:`${m.outlets?.name||'Outlet'}`}); });
  (stock||[]).forEach(s => { const pct=Math.round((s.current_qty/s.max_qty)*100); if (pct<25) risks.push({icon:'📦',cls:'critical',title:'Critical Stock',desc:`${s.outlets?.name||'Outlet'} — ${s.item_name} ${pct}%`}); });
  (invoices||[]).forEach(i => { if (i.status!=='paid' && new Date(i.period_end)<new Date()) risks.push({icon:'💳',cls:'warning',title:'Payment Overdue',desc:`${i.outlets?.name||'Outlet'} — LKR ${Math.round(i.total_due/100).toLocaleString()}`}); });
  if (liveOrders>0) risks.push({icon:'⚡',cls:'info',title:`${liveOrders} Active App Orders`,desc:'Live orders across network now'});

  let score = 100;
  score -= risks.filter(r=>r.cls==='critical').length*15;
  score -= risks.filter(r=>r.cls==='warning').length*8;
  score = Math.max(0, Math.min(100, score));
  document.getElementById('dash-score-num').textContent = score;
  document.getElementById('dash-summary').innerHTML = `Network health <strong style="color:var(--green-text)">${score}/100</strong>. ${totalCups} cups sold today (LKR ${Math.round(totalRevenue/100).toLocaleString()}) across ${(outlets||[]).length} outlet${(outlets||[]).length===1?'':'s'}. ${risks.length} item${risks.length===1?'':'s'} need attention.`;

  document.getElementById('dash-alert-count').textContent = `${risks.length} active`;
  document.getElementById('dash-alerts').innerHTML = risks.length
    ? risks.slice(0,5).map(r => `<div class="alert-item"><div class="alert-icon ${r.cls}">${r.icon}</div><div><div class="alert-title">${r.title}</div><div class="alert-desc">${r.desc}</div></div></div>`).join('')
    : `<div style="padding:10px;color:var(--text3)">No active alerts — network looks healthy.</div>`;

  // ── Outlet matrix ──
  const tbody = document.getElementById('outlet-matrix-body');
  tbody.innerHTML = (health||[]).map(h => {
    const isHealthy = h.machine_status==='ok' && h.rent_status==='current';
    const statusCls = isHealthy?'status-green':(h.machine_status==='overdue'?'status-red':'status-amber');
    const statusLbl = isHealthy?'Healthy':(h.machine_status==='overdue'?'Critical':'Warning');
    const stockItem = (stock||[]).find(s=>s.outlets?.name===h.name);
    const stockPct = stockItem ? Math.round((stockItem.current_qty/stockItem.max_qty)*100) : null;
    return `<tr onclick="navigate('network',null)">
      <td><div style="font-weight:500">${h.name}</div><div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">${h.location||''}</div></td>
      <td><span class="status-pill ${statusCls}"><span class="dot ${statusCls.replace('status-','dot-')}"></span>${statusLbl}</span></td>
      <td>${h.cups_today}</td>
      <td style="font-family:var(--font-mono)">${Math.round(h.revenue_today/100).toLocaleString()}</td>
      <td>${stockPct!==null ? `<div class="mini-bar"><div class="mini-bar-fill ${stockPct<25?'bar-red':stockPct<50?'bar-amber':'bar-green'}" style="width:${stockPct}%"></div></div>` : '<span style="color:var(--text3);font-size:11px">—</span>'}</td>
      <td><span class="status-pill ${h.machine_status==='ok'?'status-green':h.machine_status==='overdue'?'status-red':'status-amber'}" style="font-size:10px">${h.machine_status ? h.machine_status.toUpperCase() : 'NONE'}</span></td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="padding:30px;color:var(--text3);text-align:center">No data yet today</td></tr>`;

  // ── Revenue summary ──
  const collected = (invoices||[]).filter(i=>i.status==='paid').reduce((s,i)=>s+i.total_due,0);
  document.getElementById('dash-revenue-summary').innerHTML = `
    <div class="fin-row"><span class="fin-label">Collected</span><span class="fin-amount green">LKR ${Math.round(collected/100).toLocaleString()}</span></div>
    <div class="fin-row"><span class="fin-label">Outstanding</span><span class="fin-amount red">LKR ${Math.round(outstanding/100).toLocaleString()}</span></div>
    <div class="fin-row"><span class="fin-label">Total invoices</span><span class="fin-amount">${(invoices||[]).length}</span></div>`;

  // ── Top beverages (reuse order_items aggregation) ──
  const { data: items } = await sb.from('order_items').select('name, quantity').eq('brand_id', bid);
  const counts = {};
  (items||[]).forEach(r => { counts[r.name] = (counts[r.name]||0) + (r.quantity||1); });
  const ranked = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const totalQty = ranked.reduce((s,[,q])=>s+q,0);
  document.getElementById('dash-top-beverages').innerHTML = ranked.length
    ? ranked.map(([name,qty],i) => `<div class="bev-row"><div class="bev-rank">${i+1}</div><div class="bev-name">${name}</div><div class="bev-bar-wrap"><div class="mini-bar"><div class="mini-bar-fill bar-green" style="width:${Math.round((qty/ranked[0][1])*100)}%"></div></div></div><div class="bev-count">${qty}</div><div class="bev-pct">${Math.round((qty/totalQty)*100)}%</div></div>`).join('')
    : `<div style="padding:10px;color:var(--text3)">No sales recorded yet</div>`;
}

// ══ USER PROFILE PILL — real name/email + logout ══
function toggleUserMenu() {
  const menu = document.getElementById('user-dropdown-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}
document.addEventListener('click', (e) => {
  const menu = document.getElementById('user-dropdown-menu');
  const pill = document.querySelector('.user-pill');
  if (menu && menu.style.display === 'block' && !pill.contains(e.target) && !menu.contains(e.target)) {
    menu.style.display = 'none';
  }
});

function updateUserPill(profile, email) {
  const name = profile?.full_name || email || 'Franchisor';
  const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  document.getElementById('user-avatar-initials').textContent = initials || 'F';
  document.getElementById('user-display-name').textContent = name;
  document.getElementById('user-dropdown-email').textContent = email || '';
}

async function doFranchisorLogout() {
  if (!confirm('Log out of BrewOps?')) return;
  if (sb) await sb.auth.signOut();
  location.reload();
}

