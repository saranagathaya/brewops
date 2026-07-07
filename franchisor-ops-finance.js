// ══ MACHINES — full CRUD + service logging wired to Supabase ══
let MACHINES = [];
let ALL_OUTLETS_FOR_MACHINES = [];

async function loadMachines() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data: machines } = await sb.from('machines').select('*, outlets(name, location)').eq('brand_id', window.MY_PROFILE.brand_id);
  const { data: outlets } = await sb.from('outlets').select('id, name, location').eq('brand_id', window.MY_PROFILE.brand_id);

  MACHINES = machines || [];
  ALL_OUTLETS_FOR_MACHINES = outlets || [];

  renderMachineKpis();
  renderMachinesList();
  populateMachineOutletSelect();
  updateSidebarBadges();
}

function renderMachineKpis() {
  const ok = MACHINES.filter(m => m.status === 'ok').length;
  const dueSoon = MACHINES.filter(m => m.status === 'due_soon');
  const overdue = MACHINES.filter(m => m.status === 'overdue' || m.status === 'emergency');
  const outletsWithMachine = new Set(MACHINES.map(m => m.outlet_id));
  const noMachine = ALL_OUTLETS_FOR_MACHINES.filter(o => !outletsWithMachine.has(o.id)).length;

  document.getElementById('kpi-machines-ok').textContent = ok;
  document.getElementById('kpi-service-due').textContent = dueSoon.length;
  document.getElementById('kpi-service-due-sub').textContent = dueSoon[0] ? `${dueSoon[0].outlets?.name||'—'}` : '';
  document.getElementById('kpi-overdue').textContent = overdue.length;
  document.getElementById('kpi-overdue-sub').textContent = overdue[0] ? `${overdue[0].outlets?.name||'—'}` : '';
  document.getElementById('kpi-no-machine').textContent = noMachine;
  document.getElementById('machines-subtitle').textContent = `${MACHINES.length} machine${MACHINES.length===1?'':'s'} across ${ALL_OUTLETS_FOR_MACHINES.length} outlet${ALL_OUTLETS_FOR_MACHINES.length===1?'':'s'}`;
}

function renderMachinesList() {
  const list = document.getElementById('machines-list');
  if (!MACHINES.length) {
    list.innerHTML = `<div style="padding:30px;color:var(--text3)">No machines added yet — click "+ Add Machine" to register one for an outlet.</div>`;
    return;
  }

  list.innerHTML = MACHINES.map(m => {
    const dotCls = m.status === 'ok' ? 'dot-green' : m.status === 'due_soon' ? 'dot-amber' : 'dot-red';
    const daysLeft = m.next_service_due ? Math.ceil((new Date(m.next_service_due) - new Date()) / 86400000) : null;
    const isOverdue = m.status === 'overdue' || m.status === 'emergency';
    const dateInfo = m.next_service_due
      ? (isOverdue
          ? `<span style="color:var(--red-text)">Was due: ${new Date(m.next_service_due).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} · ${Math.abs(daysLeft)} DAYS OVERDUE</span>`
          : `Last service: ${m.last_service_at ? new Date(m.last_service_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—'} · Next: ${new Date(m.next_service_due).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`)
      : 'No service schedule set';

    return `<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border);${isOverdue?'background:var(--red-dim);border-radius:var(--r-sm);padding:8px;margin:4px -4px':''}">
      <span class="dot ${dotCls}"></span>
      <div style="flex:1">
        <div style="font-weight:500;font-size:13px">${m.outlets?.name||'Unknown outlet'} — ${m.model}</div>
        <div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">${dateInfo}</div>
      </div>
      ${isOverdue
        ? `<button class="topbar-btn red-btn" onclick="openLogServiceModal('${m.outlet_id}')">Dispatch Now</button>`
        : `<span class="status-pill ${m.status==='ok'?'status-green':'status-amber'}">${daysLeft!==null ? (daysLeft+' days left') : (m.status==='due_soon'?'Due soon':'OK')}</span>`}
      <button class="topbar-btn" style="font-size:11px;padding:4px 10px" onclick="openEditMachineModal('${m.id}')">Edit</button>
      <button class="topbar-btn" style="font-size:11px;padding:4px 10px" onclick="openLogServiceModal('${m.outlet_id}')">Log Service</button>
    </div>`;
  }).join('');
}

function populateMachineOutletSelect() {
  const sel = document.getElementById('machine-outlet');
  if (!sel) return;
  const usedOutletIds = new Set(MACHINES.map(m => m.outlet_id));
  const editId = document.getElementById('machine-edit-id').value;
  const editingMachine = MACHINES.find(m => m.id === editId);
  sel.innerHTML = ALL_OUTLETS_FOR_MACHINES
    .filter(o => !usedOutletIds.has(o.id) || (editingMachine && editingMachine.outlet_id === o.id))
    .map(o => `<option value="${o.id}">${o.name} — ${o.location}</option>`).join('');
}

function openAddMachineModal() {
  document.getElementById('machine-modal-title').textContent = 'Add Machine';
  document.getElementById('machine-edit-id').value = '';
  document.getElementById('machine-model').value = '';
  document.getElementById('machine-serial').value = '';
  document.getElementById('machine-last-service').value = '';
  document.getElementById('machine-next-service').value = '';
  document.getElementById('machine-status').value = 'ok';
  populateMachineOutletSelect();
  if (!document.getElementById('machine-outlet').options.length) {
    showToast('All outlets already have a machine assigned', 'ℹ️');
    return;
  }
  openModal('modal-machine');
}

function openEditMachineModal(id) {
  const m = MACHINES.find(x => x.id === id);
  if (!m) return;
  document.getElementById('machine-modal-title').textContent = 'Edit Machine';
  document.getElementById('machine-edit-id').value = m.id;
  document.getElementById('machine-model').value = m.model;
  document.getElementById('machine-serial').value = m.serial_number || '';
  document.getElementById('machine-last-service').value = m.last_service_at || '';
  document.getElementById('machine-next-service').value = m.next_service_due || '';
  document.getElementById('machine-status').value = m.status;
  populateMachineOutletSelect();
  document.getElementById('machine-outlet').value = m.outlet_id;
  openModal('modal-machine');
}

async function saveMachine() {
  const id = document.getElementById('machine-edit-id').value;
  const outlet_id = document.getElementById('machine-outlet').value;
  const model = document.getElementById('machine-model').value.trim();
  const serial_number = document.getElementById('machine-serial').value.trim() || null;
  const last_service_at = document.getElementById('machine-last-service').value || null;
  const next_service_due = document.getElementById('machine-next-service').value || null;
  const status = document.getElementById('machine-status').value;

  if (!outlet_id || !model) { showToast('Outlet and model are required', '⚠️'); return; }
  if (!sb) return;

  const payload = { outlet_id, model, serial_number, last_service_at, next_service_due, status, brand_id: window.MY_PROFILE?.brand_id, updated_at: new Date().toISOString() };
  const btn = document.getElementById('machine-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const { error } = id
    ? await sb.from('machines').update(payload).eq('id', id)
    : await sb.from('machines').insert(payload);
  btn.disabled = false; btn.textContent = 'Save Machine';

  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-machine');
  showToast(id ? 'Machine updated ✓' : 'Machine added ✓', '🔧');
  loadMachines();
}

function openLogServiceModal(outletId) {
  document.getElementById('log-machine-outlet-id').value = outletId;
  document.getElementById('log-event-type').value = 'routine_service';
  document.getElementById('log-event-notes').value = '';
  document.getElementById('log-mark-resolved').checked = true;
  openModal('modal-log-service');
}

async function saveServiceLog() {
  const outlet_id = document.getElementById('log-machine-outlet-id').value;
  const event_type = document.getElementById('log-event-type').value;
  const notes = document.getElementById('log-event-notes').value.trim() || null;
  const markResolved = document.getElementById('log-mark-resolved').checked;
  if (!sb) return;

  const btn = document.getElementById('log-service-save-btn');
  btn.disabled = true; btn.textContent = 'Logging...';

  const { error } = await sb.from('machine_logs').insert({ outlet_id, event_type, notes, brand_id: window.MY_PROFILE?.brand_id });

  if (!error && markResolved && (event_type === 'routine_service' || event_type === 'emergency_service')) {
    const today = new Date().toISOString().split('T')[0];
    const nextDue = new Date(); nextDue.setMonth(nextDue.getMonth() + 3);
    await sb.from('machines').update({
      status: 'ok', last_service_at: today, next_service_due: nextDue.toISOString().split('T')[0]
    }).eq('outlet_id', outlet_id);
  }

  btn.disabled = false; btn.textContent = 'Log Event';
  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-log-service');
  showToast('Service event logged ✓', '🔧');
  loadMachines();
}

// ══ RENT TRACKER — full CRUD wired to Supabase ══
let RENT_SCHEDULES = [];
let ALL_OUTLETS_FOR_RENT = [];

async function loadRentSchedules() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data: rents } = await sb.from('rent_schedules').select('*, outlets(name, location)').eq('brand_id', window.MY_PROFILE.brand_id).order('next_due_at');
  const { data: outlets } = await sb.from('outlets').select('id, name, location').eq('brand_id', window.MY_PROFILE.brand_id);

  RENT_SCHEDULES = rents || [];
  ALL_OUTLETS_FOR_RENT = outlets || [];

  renderRentList();
  populateRentOutletSelect();
  updateSidebarBadges();
}

function renderRentList() {
  const list = document.getElementById('rent-list');
  document.getElementById('rent-count').textContent = `${RENT_SCHEDULES.length} outlet${RENT_SCHEDULES.length===1?'':'s'}`;
  document.getElementById('rent-subtitle').textContent = RENT_SCHEDULES.length
    ? 'Manage monthly rent schedules per outlet'
    : 'No rent schedules yet';

  if (!RENT_SCHEDULES.length) {
    list.innerHTML = `<div style="padding:30px;color:var(--text3)">No rent schedules yet — click "+ Add Rent Schedule" to set one up for an outlet.</div>`;
    return;
  }

  const today = new Date();
  list.innerHTML = RENT_SCHEDULES.map(r => {
    const dueDate = r.next_due_at ? new Date(r.next_due_at) : null;
    const daysLeft = dueDate ? Math.ceil((dueDate - today) / 86400000) : null;
    const isOverdue = daysLeft !== null && daysLeft < 0;
    const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 10;
    const dotCls = isOverdue ? '' : (isDueSoon ? 'dot-amber' : '');
    const dotStyle = isOverdue ? 'style="background:var(--red-text)"' : (isDueSoon ? '' : 'style="background:var(--text3)"');
    const dateColor = isOverdue ? 'var(--red-text)' : (isDueSoon ? 'var(--amber-text)' : 'var(--text3)');
    const dateLabel = dueDate
      ? (isOverdue ? `Overdue since ${dueDate.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} · ${Math.abs(daysLeft)} days late`
         : `Due ${dueDate.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} · ${daysLeft} days`)
      : 'No due date set';

    return `<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="openEditRentModal('${r.id}')">
      <span class="dot ${dotCls}" ${dotStyle}></span>
      <div style="flex:1">
        <div style="font-weight:500">${r.outlets?.name||'Unknown outlet'} — LKR ${Math.round(r.monthly_amount/100).toLocaleString()}</div>
        <div style="font-size:11px;color:${dateColor};font-family:var(--font-mono)">${dateLabel}</div>
      </div>
      <button class="topbar-btn" style="font-size:11px" onclick="event.stopPropagation();sendRentReminder('${r.outlets?.name}')">Remind</button>
      <button class="topbar-btn" style="font-size:11px" onclick="event.stopPropagation();markRentPaid('${r.id}')">Mark Paid</button>
    </div>`;
  }).join('');
}

function populateRentOutletSelect() {
  const sel = document.getElementById('rent-outlet');
  if (!sel) return;
  const usedOutletIds = new Set(RENT_SCHEDULES.map(r => r.outlet_id));
  const editId = document.getElementById('rent-edit-id').value;
  const editingRent = RENT_SCHEDULES.find(r => r.id === editId);
  sel.innerHTML = ALL_OUTLETS_FOR_RENT
    .filter(o => !usedOutletIds.has(o.id) || (editingRent && editingRent.outlet_id === o.id))
    .map(o => `<option value="${o.id}">${o.name} — ${o.location}</option>`).join('');
}

function openAddRentModal() {
  document.getElementById('rent-modal-title').textContent = 'Add Rent Schedule';
  document.getElementById('rent-edit-id').value = '';
  document.getElementById('rent-amount').value = '';
  document.getElementById('rent-due-day').value = '1';
  document.getElementById('rent-last-paid').value = '';
  document.getElementById('rent-next-due').value = '';
  document.getElementById('rent-delete-btn').style.display = 'none';
  populateRentOutletSelect();
  if (!document.getElementById('rent-outlet').options.length) {
    showToast('All outlets already have a rent schedule', 'ℹ️');
    return;
  }
  openModal('modal-rent');
}

function openEditRentModal(id) {
  const r = RENT_SCHEDULES.find(x => x.id === id);
  if (!r) return;
  document.getElementById('rent-modal-title').textContent = 'Edit Rent Schedule';
  document.getElementById('rent-edit-id').value = r.id;
  document.getElementById('rent-amount').value = Math.round(r.monthly_amount/100);
  document.getElementById('rent-due-day').value = r.due_day || 1;
  document.getElementById('rent-last-paid').value = r.last_paid_at || '';
  document.getElementById('rent-next-due').value = r.next_due_at || '';
  document.getElementById('rent-delete-btn').style.display = 'block';
  populateRentOutletSelect();
  document.getElementById('rent-outlet').value = r.outlet_id;
  openModal('modal-rent');
}

function rentStatusFor(nextDueStr) {
  if (!nextDueStr) return 'current';
  const days = Math.ceil((new Date(nextDueStr) - new Date()) / 86400000);
  if (days < 0) return 'overdue';
  if (days <= 10) return 'due_soon';
  return 'current';
}

async function saveRentSchedule() {
  const id = document.getElementById('rent-edit-id').value;
  const outlet_id = document.getElementById('rent-outlet').value;
  const amountInput = document.getElementById('rent-amount').value;
  const due_day = parseInt(document.getElementById('rent-due-day').value) || 1;
  const last_paid_at = document.getElementById('rent-last-paid').value || null;
  const next_due_at = document.getElementById('rent-next-due').value || null;

  if (!outlet_id || !amountInput) { showToast('Outlet and monthly rent are required', '⚠️'); return; }
  if (!sb) return;

  const payload = {
    outlet_id, due_day, last_paid_at, next_due_at,
    monthly_amount: Math.round(parseFloat(amountInput) * 100),
    status: rentStatusFor(next_due_at),
    brand_id: window.MY_PROFILE?.brand_id
  };

  const btn = document.getElementById('rent-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const { error } = id
    ? await sb.from('rent_schedules').update(payload).eq('id', id)
    : await sb.from('rent_schedules').insert(payload);
  btn.disabled = false; btn.textContent = 'Save Schedule';

  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-rent');
  showToast(id ? 'Rent schedule updated ✓' : 'Rent schedule added ✓', '🏠');
  loadRentSchedules();
}

async function deleteRentSchedule() {
  const id = document.getElementById('rent-edit-id').value;
  if (!id) return;
  if (!confirm('Delete this rent schedule?')) return;
  const { error } = await sb.from('rent_schedules').delete().eq('id', id);
  if (error) { showToast('Failed to delete: ' + error.message, '⚠️'); return; }
  closeModal('modal-rent');
  showToast('Rent schedule deleted', '🗑️');
  loadRentSchedules();
}

async function markRentPaid(id) {
  const r = RENT_SCHEDULES.find(x => x.id === id);
  if (!r) return;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Compute next due date safely — advance one month from TODAY, then
  // snap to the due_day if it's a valid day-of-month (1-28, avoiding
  // month-length edge cases). Build the date with explicit y/m/d args
  // instead of mutating with setMonth/setDate to avoid JS rollover bugs.
  let nextYear = today.getFullYear();
  let nextMonth = today.getMonth() + 1; // advance one month
  if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }
  const validDueDay = (r.due_day && r.due_day >= 1 && r.due_day <= 28) ? r.due_day : today.getDate();
  const nextDue = new Date(nextYear, nextMonth, validDueDay);
  const nextDueStr = nextDue.toISOString().split('T')[0];

  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  const { error } = await sb.from('rent_schedules').update({
    last_paid_at: todayStr,
    next_due_at: nextDueStr,
    status: 'current'
  }).eq('id', id);

  if (btn) { btn.disabled = false; btn.textContent = 'Mark Paid'; }

  if (error) { showToast('Failed to update: ' + error.message, '⚠️'); return; }
  showToast(`Payment recorded for ${r.outlets?.name||'outlet'} — next due ${nextDue.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} ✓`, '🏠');
  loadRentSchedules();
}

function sendRentReminder(outletName) {
  // No SMS/email system wired yet — this is a placeholder notice.
  showToast(`Reminder noted for ${outletName||'outlet'} (no notification system connected yet)`, '🏠');
}

// ══ STOCK & SUPPLY — full CRUD wired to Supabase ══
let STOCK_ROWS = [];
let ALL_OUTLETS_FOR_STOCK = [];
let STOCK_REQUEST_ROWS = [];

async function loadStock() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data: stock } = await sb.from('stock').select('*, outlets(name)').eq('brand_id', window.MY_PROFILE.brand_id).order('item_name');
  const { data: outlets } = await sb.from('outlets').select('id, name, location').eq('brand_id', window.MY_PROFILE.brand_id);

  STOCK_ROWS = stock || [];
  ALL_OUTLETS_FOR_STOCK = outlets || [];

  renderStockTable();
  populateStockOutletSelect();
  loadStockRequests();
}

// ── Stock Top-Up Requests (franchisee → franchisor fulfillment) ──
// Reads real submissions from the franchisee app's "Request Stock Top-Up"
// button (stock_requests table) — previously had zero franchisor-side UI,
// so requests went in but were never visible or actionable here.
async function loadStockRequests() {
  const wrap = document.getElementById('stock-requests-list');
  if (!sb || !window.MY_PROFILE?.brand_id) { wrap.innerHTML = `<div style="padding:30px;color:var(--text3)">Not connected</div>`; return; }

  const { data, error } = await sb.from('stock_requests')
    .select('*, outlets(name)')
    .eq('brand_id', window.MY_PROFILE.brand_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    wrap.innerHTML = `<div style="padding:30px;color:var(--text3)">Error loading requests: ${error.message}</div>`;
    return;
  }

  STOCK_REQUEST_ROWS = data || [];
  const pendingCount = STOCK_REQUEST_ROWS.filter(r => r.status === 'pending').length;
  const subEl = document.getElementById('stock-requests-subtitle');
  if (subEl) subEl.textContent = pendingCount ? `${pendingCount} pending` : 'All caught up';

  if (!STOCK_REQUEST_ROWS.length) {
    wrap.innerHTML = `<div style="padding:30px;color:var(--text3)">No stock requests yet — franchisees can request top-ups from their Stock page.</div>`;
    return;
  }

  wrap.innerHTML = STOCK_REQUEST_ROWS.map(r => {
    const outletName = r.outlets?.name || 'Unknown outlet';
    const items = Array.isArray(r.items) ? r.items.map(i => i.name || i).join(', ') : '';
    const urgencyCls = r.urgency === 'urgent' ? 'status-red' : r.urgency === 'normal' ? 'status-amber' : 'status-blue';
    const statusCls = r.status === 'fulfilled' ? 'status-green' : 'status-blue';
    const when = new Date(r.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    const fulfilledWhen = r.fulfilled_at ? new Date(r.fulfilled_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : null;

    return `<div style="padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
        <span style="font-size:11px;font-family:var(--font-mono);color:var(--text3)">${outletName}</span>
        <span class="status-pill ${urgencyCls}" style="font-size:10px">${(r.urgency||'normal').toUpperCase()}</span>
        <span class="status-pill ${statusCls}" style="font-size:10px">${r.status === 'fulfilled' ? 'FULFILLED · ' + fulfilledWhen : 'PENDING'}</span>
        <span style="font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-left:auto">Requested ${when}</span>
      </div>
      <div style="font-size:13px;color:var(--text2);line-height:1.5">${items || 'No items specified'}</div>
      ${r.notes ? `<div style="font-size:12px;color:var(--text3);margin-top:3px">${r.notes}</div>` : ''}
      ${r.status !== 'fulfilled' ? `<div style="margin-top:8px"><button class="btn btn-primary" style="font-size:11px;padding:5px 12px" onclick="fulfillStockRequest('${r.id}')">Mark Fulfilled</button></div>` : ''}
    </div>`;
  }).join('');
}

async function fulfillStockRequest(id) {
  if (!sb) return;
  const request = STOCK_REQUEST_ROWS.find(r => r.id === id);
  if (!request) return;

  // Fulfilling a request previously only timestamped it — it never
  // actually restocked anything, so the Stock Levels table would still
  // show the item as low even after a "delivery" was marked complete.
  // A real top-up delivery refills to a full stock cycle, so each named
  // item resets to its own max_qty (matching max_qty's own definition as
  // "full delivery" amount — see Stock & Supply's Add Item form).
  const itemNames = Array.isArray(request.items) ? request.items.map(i => i.name || i) : [];
  if (itemNames.length) {
    const { data: stockRows } = await sb.from('stock')
      .select('id, item_name, max_qty')
      .eq('outlet_id', request.outlet_id)
      .in('item_name', itemNames);

    for (const row of (stockRows || [])) {
      await sb.from('stock').update({ current_qty: row.max_qty, updated_at: new Date().toISOString() }).eq('id', row.id);
    }
  }

  const { error } = await sb.from('stock_requests')
    .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  showToast('Marked as fulfilled ✓ — stock topped up', '📦');
  loadStock(); // refreshes both Stock Levels and (via its own internal call) the requests list
}

// ══ COMPLAINTS & ISSUES — real franchisee-reported issues, replaces the
// page's old hardcoded Kandy/Galle examples (which had no Supabase backing
// at all). "Suggestion / Improvement" is one of the real category options
// in the franchisee app's Report Issue form, so suggestions are just a
// filtered view of the same table — not a separate fake feature.
let ISSUES_ROWS = [];

async function loadComplaints() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data, error } = await sb.from('issues')
    .select('*, outlets(name)')
    .eq('brand_id', window.MY_PROFILE.brand_id)
    .order('created_at', { ascending: false });

  const listEl = document.getElementById('complaints-list');
  const suggEl = document.getElementById('suggestions-list');
  if (error) {
    listEl.innerHTML = `<div style="padding:30px;color:var(--text3)">Error loading issues: ${error.message}</div>`;
    suggEl.innerHTML = '';
    return;
  }

  ISSUES_ROWS = data || [];
  renderComplaints();
}

function renderComplaints() {
  const listEl = document.getElementById('complaints-list');
  const suggEl = document.getElementById('suggestions-list');

  // Issues = everything except suggestions, suggestions = that one category —
  // both views share the same underlying rows, just filtered differently.
  const issues = ISSUES_ROWS.filter(i => i.category !== 'Suggestion / Improvement');
  const suggestions = ISSUES_ROWS.filter(i => i.category === 'Suggestion / Improvement');

  const openIssues = issues.filter(i => i.status === 'open');
  document.getElementById('complaints-open-count').textContent = `${openIssues.length} unresolved`;
  document.getElementById('suggestions-count').textContent = `${suggestions.length} total`;

  listEl.innerHTML = issues.length ? issues.map(issueRowHTML).join('') :
    `<div style="padding:30px;color:var(--text3)">No issues reported yet — franchisees can report issues from their outlet app.</div>`;

  suggEl.innerHTML = suggestions.length ? suggestions.map(suggestionRowHTML).join('') :
    `<div style="padding:30px;color:var(--text3)">No suggestions submitted yet.</div>`;
}

function issueRowHTML(i) {
  const sevCls = i.severity === 'high' ? 'status-red' : i.severity === 'low' ? 'status-green' : 'status-amber';
  const sevLabel = (i.severity || 'medium').charAt(0).toUpperCase() + (i.severity || 'medium').slice(1);
  const timeLabel = timeAgoLabel(i.created_at);
  const isOpen = i.status === 'open';
  return `<div style="padding:12px 0;border-bottom:1px solid var(--border)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
      <span style="font-size:11px;font-family:var(--font-mono);color:var(--text3)">${i.outlets?.name || 'Unknown outlet'}</span>
      <span class="status-pill ${sevCls}" style="font-size:10px">${sevLabel}</span>
      <span style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">${i.category || 'Other'}</span>
      <span style="font-size:11px;color:var(--text3);font-family:var(--font-mono);margin-left:auto">${timeLabel}</span>
    </div>
    <div style="font-size:13px;color:var(--text2);line-height:1.5">${i.description}</div>
    <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
      ${isOpen
        ? `<button class="btn btn-primary" style="font-size:11px;padding:5px 12px" onclick="resolveIssue('${i.id}')">Mark Resolved</button>`
        : `<span class="status-pill status-green" style="font-size:10px">✓ Resolved ${i.resolved_at ? timeAgoLabel(i.resolved_at) : ''}</span>
           <button class="btn btn-ghost" style="font-size:11px;padding:5px 12px" onclick="reopenIssue('${i.id}')">Reopen</button>`}
    </div>
  </div>`;
}

function suggestionRowHTML(i) {
  const dateLabel = new Date(i.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
  return `<div style="padding:12px 0;border-bottom:1px solid var(--border)">
    <div style="font-size:12px;font-family:var(--font-mono);color:var(--text3);margin-bottom:5px">${i.outlets?.name || 'Unknown outlet'} · ${dateLabel}</div>
    <div style="font-size:13px;color:var(--text2);line-height:1.5">${i.description}</div>
  </div>`;
}

// Reuses the same relative-time formatting convention the franchisee app
// already established (timeAgoLabel) rather than inventing a second one.
function timeAgoLabel(timestamp) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}

async function resolveIssue(id) {
  if (!sb) return;
  const { error } = await sb.from('issues')
    .update({ status: 'closed', resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  showToast('Issue marked resolved ✓', '✓');
  loadComplaints();
  updateSidebarBadges();
}

async function reopenIssue(id) {
  if (!sb) return;
  const { error } = await sb.from('issues')
    .update({ status: 'open', resolved_at: null })
    .eq('id', id);
  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  showToast('Issue reopened', '◌');
  loadComplaints();
  updateSidebarBadges();
}

function renderStockTable() {
  const wrap = document.getElementById('stock-table-wrap');
  document.getElementById('stock-subtitle').textContent = `${STOCK_ROWS.length} stock item${STOCK_ROWS.length===1?'':'s'} tracked`;

  if (!STOCK_ROWS.length) {
    wrap.innerHTML = `<div style="padding:30px;color:var(--text3)">No stock items tracked yet — click "+ Add Stock Item" to start tracking inventory for an outlet.</div>`;
    return;
  }

  // Pivot: group by outlet, collect distinct item names as columns
  const outletIds = [...new Set(STOCK_ROWS.map(s => s.outlet_id))];
  const itemNames = [...new Set(STOCK_ROWS.map(s => s.item_name))];

  const rows = outletIds.map(oid => {
    const outletName = STOCK_ROWS.find(s => s.outlet_id === oid)?.outlets?.name || 'Unknown';
    const cells = itemNames.map(name => {
      const item = STOCK_ROWS.find(s => s.outlet_id === oid && s.item_name === name);
      if (!item) return `<td><span style="color:var(--text3);font-size:11px">—</span></td>`;
      const pct = Math.round((item.current_qty / item.max_qty) * 100);
      const barCls = pct < 25 ? 'bar-red' : pct < 50 ? 'bar-amber' : 'bar-green';
      const textCls = pct < 25 ? 'var(--red-text)' : pct < 50 ? 'var(--amber-text)' : 'var(--text3)';
      const flag = pct < 25 ? ' ⚑' : '';
      return `<td onclick="openEditStockModal('${item.id}')" style="cursor:pointer">
        <div class="mini-bar"><div class="mini-bar-fill ${barCls}" style="width:${pct}%"></div></div>
        <div style="font-size:10px;color:${textCls};font-family:var(--font-mono)">${pct}%${flag}</div>
      </td>`;
    }).join('');

    const lowestPct = Math.min(...itemNames.map(name => {
      const item = STOCK_ROWS.find(s => s.outlet_id === oid && s.item_name === name);
      return item ? Math.round((item.current_qty / item.max_qty) * 100) : 100;
    }));
    const urgency = lowestPct < 25 ? `<span class="status-pill status-red">Dispatch TODAY</span>`
      : lowestPct < 50 ? `<span class="status-pill status-amber">Within 3 days</span>`
      : `<span class="status-pill status-green">Next week</span>`;

    return `<tr><td style="font-weight:500">${outletName}</td>${cells}<td>${urgency}</td></tr>`;
  }).join('');

  wrap.innerHTML = `<table class="data-table" style="min-width:700px">
    <thead><tr><th>Outlet</th>${itemNames.map(n=>`<th>${n}</th>`).join('')}<th>Urgency</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function populateStockOutletSelect() {
  const sel = document.getElementById('stock-outlet');
  if (!sel) return;
  sel.innerHTML = ALL_OUTLETS_FOR_STOCK.map(o => `<option value="${o.id}">${o.name} — ${o.location}</option>`).join('');
}

function openAddStockModal() {
  document.getElementById('stock-modal-title').textContent = 'Add Stock Item';
  document.getElementById('stock-edit-id').value = '';
  document.getElementById('stock-item-name').value = '';
  document.getElementById('stock-unit').value = 'g';
  document.getElementById('stock-current-qty').value = '';
  document.getElementById('stock-max-qty').value = '';
  document.getElementById('stock-low-threshold').value = '';
  document.getElementById('stock-delete-btn').style.display = 'none';
  populateStockOutletSelect();
  if (!ALL_OUTLETS_FOR_STOCK.length) { showToast('Add an outlet first', '⚠️'); return; }
  openModal('modal-stock');
}

function openEditStockModal(id) {
  const s = STOCK_ROWS.find(x => x.id === id);
  if (!s) return;
  document.getElementById('stock-modal-title').textContent = 'Edit Stock Item';
  document.getElementById('stock-edit-id').value = s.id;
  document.getElementById('stock-item-name').value = s.item_name;
  document.getElementById('stock-unit').value = s.unit;
  document.getElementById('stock-current-qty').value = s.current_qty;
  document.getElementById('stock-max-qty').value = s.max_qty;
  document.getElementById('stock-low-threshold').value = s.low_threshold;
  document.getElementById('stock-delete-btn').style.display = 'block';
  populateStockOutletSelect();
  document.getElementById('stock-outlet').value = s.outlet_id;
  openModal('modal-stock');
}

async function saveStockItem() {
  const id = document.getElementById('stock-edit-id').value;
  const outlet_id = document.getElementById('stock-outlet').value;
  const item_name = document.getElementById('stock-item-name').value.trim();
  const unit = document.getElementById('stock-unit').value;
  const current_qty = parseFloat(document.getElementById('stock-current-qty').value);
  const max_qty = parseFloat(document.getElementById('stock-max-qty').value);
  const low_threshold = parseFloat(document.getElementById('stock-low-threshold').value) || max_qty * 0.2;

  if (!outlet_id || !item_name || isNaN(current_qty) || isNaN(max_qty)) {
    showToast('Outlet, item name, and quantities are required', '⚠️'); return;
  }
  if (!sb) return;

  const payload = { outlet_id, item_name, unit, current_qty, max_qty, low_threshold, brand_id: window.MY_PROFILE?.brand_id, updated_at: new Date().toISOString() };
  const btn = document.getElementById('stock-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const { error } = id
    ? await sb.from('stock').update(payload).eq('id', id)
    : await sb.from('stock').insert(payload);
  btn.disabled = false; btn.textContent = 'Save Item';

  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-stock');
  showToast(id ? 'Stock item updated ✓' : 'Stock item added ✓', '📦');
  loadStock();
}

async function deleteStockItem() {
  const id = document.getElementById('stock-edit-id').value;
  if (!id) return;
  if (!confirm('Delete this stock item?')) return;
  const { error } = await sb.from('stock').delete().eq('id', id);
  if (error) { showToast('Failed to delete: ' + error.message, '⚠️'); return; }
  closeModal('modal-stock');
  showToast('Stock item deleted', '🗑️');
  loadStock();
}

// ══ SUPPLIERS — full CRUD wired to Supabase ══
let SUPPLIERS = [];
let SUPPLIER_PAYMENTS = [];

async function loadSuppliers() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data: suppliers } = await sb.from('suppliers').select('*').eq('brand_id', window.MY_PROFILE.brand_id).order('created_at');
  const { data: payments } = await sb.from('supplier_payments').select('*').eq('brand_id', window.MY_PROFILE.brand_id);

  SUPPLIERS = suppliers || [];
  SUPPLIER_PAYMENTS = payments || [];
  renderSuppliersGrid();
}

function renderSuppliersGrid() {
  const grid = document.getElementById('suppliers-grid');
  document.getElementById('suppliers-subtitle').textContent = `${SUPPLIERS.length} supplier${SUPPLIERS.length===1?'':'s'}`;

  if (!SUPPLIERS.length) {
    grid.innerHTML = `<div style="padding:30px;color:var(--text3)">No suppliers yet — click "+ Add Supplier" to add your first one.</div>`;
    return;
  }

  grid.innerHTML = SUPPLIERS.map(s => {
    const payments = SUPPLIER_PAYMENTS.filter(p => p.supplier_id === s.id);
    const outstanding = payments.filter(p => p.status !== 'paid').reduce((sum,p) => sum + p.amount, 0);
    const paidThisCycle = payments.filter(p => p.status === 'paid').reduce((sum,p) => sum + p.amount, 0);
    const nextDue = payments.filter(p => p.status !== 'paid' && p.due_date).sort((a,b) => new Date(a.due_date)-new Date(b.due_date))[0];
    const isOverdue = nextDue && new Date(nextDue.due_date) < new Date();
    const daysUntilDue = nextDue ? Math.ceil((new Date(nextDue.due_date) - new Date()) / 86400000) : null;

    return `<div class="card">
      <div class="card-head"><span>◈</span><span class="card-title">${s.name}</span><button class="topbar-btn" style="font-size:10px;padding:3px 8px;margin-left:auto" onclick="openEditSupplierModal('${s.id}')">Edit</button></div>
      <div class="card-body">
        <div class="fin-row"><span class="fin-label">Outstanding</span><span class="fin-amount ${outstanding>0?(isOverdue?'red':'amber'):''}">LKR ${Math.round(outstanding/100).toLocaleString()}</span></div>
        <div class="fin-row"><span class="fin-label">Paid this cycle</span><span class="fin-amount green">LKR ${Math.round(paidThisCycle/100).toLocaleString()}</span></div>
        <div class="fin-row"><span class="fin-label">Payment due</span><span class="fin-amount ${isOverdue?'red':'amber'}">${nextDue ? (isOverdue ? `${new Date(nextDue.due_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} — ${Math.abs(daysUntilDue)}d overdue!` : `${new Date(nextDue.due_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} (${daysUntilDue}d)`) : 'No pending payments'}</span></div>
        ${nextDue
          ? `<button class="btn ${isOverdue?'btn-danger':'btn-primary'}" style="width:100%;margin-top:10px" onclick="markPaymentPaid('${nextDue.id}','${s.name.replace(/'/g,"\\'")}')">${isOverdue?'Pay NOW ':'Pay '}LKR ${Math.round(nextDue.amount/100).toLocaleString()}</button>`
          : `<button class="btn btn-ghost" style="width:100%;margin-top:10px" onclick="openAddPaymentModal('${s.id}')">+ Add Payment</button>`}
      </div>
    </div>`;
  }).join('');
}

function openAddSupplierModal() {
  document.getElementById('supplier-modal-title').textContent = 'Add Supplier';
  document.getElementById('supplier-edit-id').value = '';
  document.getElementById('supplier-name').value = '';
  document.getElementById('supplier-contact').value = '';
  document.getElementById('supplier-email').value = '';
  document.getElementById('supplier-notes').value = '';
  document.getElementById('supplier-delete-btn').style.display = 'none';
  openModal('modal-supplier');
}

function openEditSupplierModal(id) {
  const s = SUPPLIERS.find(x => x.id === id);
  if (!s) return;
  document.getElementById('supplier-modal-title').textContent = 'Edit Supplier';
  document.getElementById('supplier-edit-id').value = s.id;
  document.getElementById('supplier-name').value = s.name;
  document.getElementById('supplier-contact').value = s.contact || '';
  document.getElementById('supplier-email').value = s.email || '';
  document.getElementById('supplier-notes').value = s.notes || '';
  document.getElementById('supplier-delete-btn').style.display = 'block';
  openModal('modal-supplier');
}

async function saveSupplier() {
  const id = document.getElementById('supplier-edit-id').value;
  const name = document.getElementById('supplier-name').value.trim();
  const contact = document.getElementById('supplier-contact').value.trim() || null;
  const email = document.getElementById('supplier-email').value.trim() || null;
  const notes = document.getElementById('supplier-notes').value.trim() || null;

  if (!name) { showToast('Supplier name is required', '⚠️'); return; }
  if (!sb) return;

  const payload = { name, contact, email, notes, brand_id: window.MY_PROFILE?.brand_id };
  const btn = document.getElementById('supplier-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const { error } = id
    ? await sb.from('suppliers').update(payload).eq('id', id)
    : await sb.from('suppliers').insert(payload);
  btn.disabled = false; btn.textContent = 'Save Supplier';

  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-supplier');
  showToast(id ? 'Supplier updated ✓' : 'Supplier added ✓', '◈');
  loadSuppliers();
}

async function deleteSupplier() {
  const id = document.getElementById('supplier-edit-id').value;
  if (!id) return;
  if (!confirm('Delete this supplier? This will fail if there are existing payment records.')) return;
  const { error } = await sb.from('suppliers').delete().eq('id', id);
  if (error) { showToast('Cannot delete — supplier has payment history', '⚠️'); return; }
  closeModal('modal-supplier');
  showToast('Supplier deleted', '🗑️');
  loadSuppliers();
}

function openAddPaymentModal(supplierId) {
  document.getElementById('payment-supplier-id').value = supplierId;
  document.getElementById('payment-amount').value = '';
  document.getElementById('payment-due-date').value = '';
  document.getElementById('payment-description').value = '';
  openModal('modal-payment');
}

async function saveSupplierPayment() {
  const supplier_id = document.getElementById('payment-supplier-id').value;
  const amountInput = document.getElementById('payment-amount').value;
  const due_date = document.getElementById('payment-due-date').value || null;
  const description = document.getElementById('payment-description').value.trim() || null;

  if (!amountInput) { showToast('Amount is required', '⚠️'); return; }
  if (!sb) return;

  const amount = Math.round(parseFloat(amountInput) * 100);
  const status = due_date && new Date(due_date) < new Date() ? 'overdue' : 'pending';

  const btn = document.getElementById('payment-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const { error } = await sb.from('supplier_payments').insert({ supplier_id, amount, due_date, description, status, brand_id: window.MY_PROFILE?.brand_id });
  btn.disabled = false; btn.textContent = 'Add Payment';

  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-payment');
  showToast('Payment added ✓', '◈');
  loadSuppliers();
}

async function markPaymentPaid(paymentId, supplierName) {
  if (!confirm(`Mark this payment to ${supplierName} as paid?`)) return;
  const { error } = await sb.from('supplier_payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', paymentId);
  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  showToast(`Payment to ${supplierName} marked paid ✓`, '✓');
  loadSuppliers();
}

// ══ INVOICES — full CRUD wired to Supabase ══
let INVOICES = [];
let ALL_OUTLETS_FOR_INVOICES = [];

async function loadInvoices() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data: invoices } = await sb.from('invoices').select('*, outlets(name)').eq('brand_id', window.MY_PROFILE.brand_id).order('created_at', { ascending: false });
  const { data: outlets } = await sb.from('outlets').select('id, name, location').eq('brand_id', window.MY_PROFILE.brand_id);

  INVOICES = invoices || [];
  ALL_OUTLETS_FOR_INVOICES = outlets || [];

  renderInvoicesList();
}

function renderInvoicesList() {
  const list = document.getElementById('invoices-list');
  document.getElementById('invoices-subtitle').textContent = `${INVOICES.length} invoice${INVOICES.length===1?'':'s'}`;

  if (!INVOICES.length) {
    list.innerHTML = `<div style="padding:30px;color:var(--text3)">No invoices yet — click "+ Create Invoice" to bill an outlet for this cycle.</div>`;
    return;
  }

  list.innerHTML = INVOICES.map(inv => {
    const today = new Date();
    const isOverdue = inv.status !== 'paid' && new Date(inv.period_end) < today;
    const statusCfg = {
      paid: ['status-green', 'Paid'],
      sent: ['status-amber', 'Pending'],
      draft: ['', 'Draft'],
      overdue: ['status-red', 'Overdue']
    };
    const effectiveStatus = isOverdue && inv.status === 'sent' ? 'overdue' : inv.status;
    const [cls, label] = statusCfg[effectiveStatus] || ['', effectiveStatus];
    const amountColor = effectiveStatus === 'overdue' ? 'var(--red-text)' : effectiveStatus === 'paid' ? 'var(--accent2)' : '';

    const actionBtn = effectiveStatus === 'paid'
      ? `<button class="topbar-btn" style="font-size:11px;padding:4px 10px" onclick="showToast('Invoice ${inv.invoice_number} — view in Supabase for now','📄')">View</button>`
      : effectiveStatus === 'overdue'
      ? `<button class="topbar-btn red-btn" style="font-size:11px;padding:4px 10px" onclick="markInvoicePaid('${inv.id}','${inv.invoice_number}')">Mark Paid</button>`
      : `<button class="topbar-btn" style="font-size:11px;padding:4px 10px" onclick="markInvoicePaid('${inv.id}','${inv.invoice_number}')">Mark Paid</button>`;

    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);width:130px">${inv.invoice_number}</div>
      <div style="flex:1;font-size:13px"><strong>${inv.outlets?.name||'Unknown'}</strong></div>
      <div style="font-family:var(--font-mono);font-weight:500;color:${amountColor}">LKR ${Math.round(inv.total_due/100).toLocaleString()}</div>
      <span class="status-pill ${cls}">${label}</span>
      ${actionBtn}
      <button class="topbar-btn" style="font-size:11px;padding:4px 10px;color:var(--red-text)" onclick="deleteInvoice('${inv.id}','${inv.invoice_number}')">Delete</button>
    </div>`;
  }).join('');
}

function openCreateInvoiceModal() {
  document.getElementById('inv-outlet').innerHTML = ALL_OUTLETS_FOR_INVOICES.map(o => `<option value="${o.id}">${o.name} — ${o.location}</option>`).join('');
  document.getElementById('inv-period-start').value = '';
  document.getElementById('inv-period-end').value = '';
  document.getElementById('inv-revenue').value = '';
  document.getElementById('inv-fee-pct').value = '12';
  document.getElementById('inv-account').value = '';
  document.getElementById('inv-notes').value = '';
  if (!ALL_OUTLETS_FOR_INVOICES.length) { showToast('Add an outlet first', '⚠️'); return; }
  openModal('modal-invoice');
}

async function saveInvoice(sendNow) {
  const outlet_id = document.getElementById('inv-outlet').value;
  const period_start = document.getElementById('inv-period-start').value;
  const period_end = document.getElementById('inv-period-end').value;
  const revenueInput = document.getElementById('inv-revenue').value;
  const feePct = parseFloat(document.getElementById('inv-fee-pct').value) || 12;
  const payment_account = document.getElementById('inv-account').value.trim() || null;
  const notes = document.getElementById('inv-notes').value.trim() || null;

  if (!outlet_id || !period_start || !period_end || !revenueInput) {
    showToast('Outlet, period, and revenue are required', '⚠️'); return;
  }
  if (!sb) return;

  const revenue_amount = Math.round(parseFloat(revenueInput) * 100);
  const franchise_fee = Math.round(revenue_amount * (feePct / 100));
  const invoice_number = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

  const btn = sendNow ? document.getElementById('inv-send-btn') : document.getElementById('inv-draft-btn');
  btn.disabled = true; btn.textContent = 'Saving...';

  const { error } = await sb.from('invoices').insert({
    invoice_number, outlet_id, period_start, period_end,
    revenue_amount, franchise_fee_pct: feePct, franchise_fee,
    total_due: franchise_fee, payment_account, notes,
    brand_id: window.MY_PROFILE?.brand_id,
    status: sendNow ? 'sent' : 'draft'
  });

  btn.disabled = false; btn.textContent = sendNow ? 'Create & Send' : 'Save Draft';

  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-invoice');
  showToast(sendNow ? `Invoice ${invoice_number} created & sent ✓` : `Invoice ${invoice_number} saved as draft`, '📩');
  loadInvoices();
}

async function markInvoicePaid(id, invoiceNumber) {
  if (!confirm(`Mark ${invoiceNumber} as paid?`)) return;
  const { error } = await sb.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
  if (error) {
    // If this is the missing-column trigger error, give a clearer message
    if (error.message && error.message.includes('updated_at')) {
      showToast('Database needs a quick fix — run brewops-fix-invoices-column.sql in Supabase', '⚠️');
    } else {
      showToast('Failed: ' + error.message, '⚠️');
    }
    return;
  }
  showToast(`${invoiceNumber} marked paid ✓`, '✓');
  loadInvoices();
}

async function deleteInvoice(id, invoiceNumber) {
  if (!confirm(`Delete invoice ${invoiceNumber}? This cannot be undone — use this only for invoices created by mistake.`)) return;
  const { error } = await sb.from('invoices').delete().eq('id', id);
  if (error) { showToast('Failed to delete: ' + error.message, '⚠️'); return; }
  showToast(`${invoiceNumber} deleted`, '🗑️');
  loadInvoices();
}

