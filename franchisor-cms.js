// ══ BRAND SETTINGS (franchisor's own brand — name, logo, color theme) ══
// Replaces the old "Brand & App Identity" card, which had no real ids
// at all and was read via a fragile input[value="..."] CSS selector that
// matched the original HTML default, not whatever the franchisor actually
// typed. Now backed directly by the brands table.
async function loadBrandSettings() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data: brand, error } = await sb.from('brands').select('*').eq('id', window.MY_PROFILE.brand_id).maybeSingle();

  const subEl = document.getElementById('cms-settings-subtitle');
  if (subEl && brand) subEl.textContent = `Customer app configuration · ${brand.name}`;

  const statusEl = document.getElementById('brand-settings-status');
  if (error || !brand) {
    if (statusEl) statusEl.textContent = '';
    return;
  }
  if (statusEl) statusEl.textContent = `● Live — /${brand.slug}`;

  document.getElementById('brand-settings-name').value = brand.name || '';
  document.getElementById('brand-settings-tagline').value = brand.tagline || '';
  document.getElementById('brand-settings-primary-color').value = brand.primary_color || '#8B1A1A';
  document.getElementById('brand-settings-secondary-color').value = brand.secondary_color || '#A52020';
  document.getElementById('brand-settings-accent-color').value = brand.accent_color || '#D4AF37';
  document.getElementById('brand-settings-contact-email').value = brand.contact_email || '';
  document.getElementById('brand-settings-contact-phone').value = brand.contact_phone || '';
  resetImagePicker('brand-settings-logo-file', 'brand-settings-logo-preview', 'brand-settings-logo-url', brand.logo_url);
}

async function saveBrandSettings() {
  if (!sb || !window.MY_PROFILE?.brand_id) { showToast('No brand on this account', '⚠️'); return; }
  const name = document.getElementById('brand-settings-name').value.trim();
  const tagline = document.getElementById('brand-settings-tagline').value.trim() || null;
  const primary_color = document.getElementById('brand-settings-primary-color').value;
  const secondary_color = document.getElementById('brand-settings-secondary-color').value;
  const accent_color = document.getElementById('brand-settings-accent-color').value;
  const contact_email = document.getElementById('brand-settings-contact-email').value.trim() || null;
  const contact_phone = document.getElementById('brand-settings-contact-phone').value.trim() || null;

  if (!name) { showToast('Brand name is required', '⚠️'); return; }

  const btn = document.getElementById('brand-settings-save-btn');
  btn.disabled = true; btn.textContent = 'Uploading logo...';
  const logo_url = await uploadPendingImage('brand-settings-logo-file', 'brand-settings-logo-url', 'brand-logos');

  btn.textContent = 'Saving...';
  const { error } = await sb.from('brands').update({
    name, tagline, primary_color, secondary_color, accent_color,
    contact_email, contact_phone, logo_url, updated_at: new Date().toISOString()
  }).eq('id', window.MY_PROFILE.brand_id);

  btn.disabled = false; btn.textContent = 'Save Brand Settings';
  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  showToast('Brand settings saved ✓', '☕');
  loadBrandSettings();
}

function resetNetworkKpis() {
  ['kpi-best-revenue','kpi-most-cups','kpi-lowest','kpi-healthy'].forEach(id => document.getElementById(id).textContent = '—');
  ['kpi-best-revenue-sub','kpi-most-cups-sub','kpi-lowest-sub','kpi-healthy-sub'].forEach(id => document.getElementById(id).textContent = '—');
}

function openAddOutletModal() {
  document.getElementById('outlet-modal-title').textContent = 'Add Outlet';
  document.getElementById('outlet-edit-id').value = '';
  document.getElementById('outlet-name').value = '';
  document.getElementById('outlet-location').value = '';
  document.getElementById('outlet-address').value = '';
  document.getElementById('outlet-active').checked = true;
  openModal('modal-outlet');
}

async function openEditOutletModal(id) {
  if (!sb) return;
  const { data: outlet, error } = await sb.from('outlets').select('*').eq('id', id).maybeSingle();
  if (error || !outlet) { showToast('Could not load outlet', '⚠️'); return; }
  document.getElementById('outlet-modal-title').textContent = 'Edit Outlet';
  document.getElementById('outlet-edit-id').value = outlet.id;
  document.getElementById('outlet-name').value = outlet.name;
  document.getElementById('outlet-location').value = outlet.location || '';
  document.getElementById('outlet-address').value = outlet.address || '';
  document.getElementById('outlet-active').checked = outlet.is_active;
  openModal('modal-outlet');
}

async function saveOutlet() {
  const id = document.getElementById('outlet-edit-id').value;
  const name = document.getElementById('outlet-name').value.trim();
  const location = document.getElementById('outlet-location').value.trim();
  const address = document.getElementById('outlet-address').value.trim();
  const is_active = document.getElementById('outlet-active').checked;

  if (!name || !location) { showToast('Name and location are required', '⚠️'); return; }
  if (!sb) { showToast('Not connected to Supabase', '⚠️'); return; }

  const btn = document.getElementById('outlet-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';

  const payload = { name, location, address: address || null, is_active, brand_id: window.MY_PROFILE?.brand_id };
  const { error } = id
    ? await sb.from('outlets').update(payload).eq('id', id)
    : await sb.from('outlets').insert(payload);

  btn.disabled = false; btn.textContent = 'Save Outlet';

  if (error) { showToast('Failed to save: ' + error.message, '⚠️'); return; }

  closeModal('modal-outlet');
  showToast(id ? 'Outlet updated ✓' : 'Outlet added ✓', '⬡');
  loadOutlets();
}

async function deleteOutlet(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone and will fail if the outlet has existing orders, stock, or staff assigned.`)) return;
  if (!sb) return;

  const { error } = await sb.from('outlets').delete().eq('id', id);
  if (error) {
    showToast('Cannot delete — outlet has linked records (orders, stock, etc.)', '⚠️');
    return;
  }
  showToast(`${name} deleted`, '🗑️');
  loadOutlets();
}

// ══ MENU MANAGER — full CRUD wired to Supabase ══
let MENU_CATEGORIES = [];
let MENU_ITEMS = [];
let ACTIVE_CAT_ID = null;

async function loadMenuManager() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data: cats } = await sb.from('menu_categories').select('*').eq('brand_id', window.MY_PROFILE.brand_id).order('sort_order');
  const { data: items } = await sb.from('menu_items').select('*').eq('brand_id', window.MY_PROFILE.brand_id).order('sort_order');

  MENU_CATEGORIES = cats || [];
  MENU_ITEMS = items || [];

  if (!ACTIVE_CAT_ID && MENU_CATEGORIES.length) ACTIVE_CAT_ID = MENU_CATEGORIES[0].id;

  renderCatGrid();
  renderItemsList();
  populateCategorySelect();
}

function renderCatGrid() {
  const grid = document.getElementById('cms-cat-grid');
  const catCards = MENU_CATEGORIES.map(c => {
    const count = MENU_ITEMS.filter(i => i.category_id === c.id).length;
    const active = c.id === ACTIVE_CAT_ID;
    return `<div class="cat-card${active?' active-cat':''}" onclick="selectMenuCat('${c.id}')">
      <div class="cat-icon">${c.icon||''}</div>
      <div class="cat-label">${c.name}</div>
      <div class="cat-count">${count} item${count===1?'':'s'}</div>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button class="topbar-btn" style="font-size:10px;padding:2px 8px" onclick="event.stopPropagation();openEditCatModal('${c.id}')">Edit</button>
        <button class="topbar-btn" style="font-size:10px;padding:2px 8px" onclick="event.stopPropagation();deleteCategory('${c.id}','${c.name.replace(/'/g,"\\'")}')">Delete</button>
      </div>
    </div>`;
  }).join('');

  const addCard = `<div class="cat-card" onclick="openAddCatModal()" style="border-style:dashed;justify-content:center;">
    <div style="font-size:20px;color:var(--text3)">+</div><div class="cat-label" style="color:var(--text3)">Add Category</div>
  </div>`;

  grid.innerHTML = MENU_CATEGORIES.length
    ? catCards + addCard
    : `<div style="padding:20px;color:var(--text3)">No categories yet — add your first one.</div>` + addCard;
}

function selectMenuCat(id) {
  ACTIVE_CAT_ID = id;
  renderCatGrid();
  renderItemsList();
}

function renderItemsList() {
  const cat = MENU_CATEGORIES.find(c => c.id === ACTIVE_CAT_ID);
  const items = MENU_ITEMS.filter(i => i.category_id === ACTIVE_CAT_ID);
  const listEl = document.getElementById('cms-items-list');

  document.getElementById('cms-active-cat-icon').textContent = cat ? (cat.icon||'') : '';
  document.getElementById('cms-active-cat-title').textContent = cat ? `${cat.name} — ${items.length} item${items.length===1?'':'s'}` : 'No category selected';

  const visibleCount = items.filter(i => i.is_visible).length;
  document.getElementById('cms-menu-status').innerHTML = items.length
    ? (visibleCount === items.length
        ? `<span style="color:var(--green-text)">● All visible</span>`
        : `<span style="color:var(--amber-text)">● ${visibleCount}/${items.length} visible</span>`)
    : '';

  if (!cat) { listEl.innerHTML = `<div style="padding:30px;color:var(--text3)">Add a category first.</div>`; return; }
  if (!items.length) { listEl.innerHTML = `<div style="padding:30px;color:var(--text3)">No items in this category yet — click "+ Add Beverage" above.</div>`; return; }

  listEl.innerHTML = items.map(i => `
    <div class="cms-menu-item">
      <div class="cmi-emoji" style="${i.image_url?'width:40px;height:40px;border-radius:8px;overflow:hidden;':''}">${i.image_url ? `<img src="${i.image_url}" style="width:100%;height:100%;object-fit:cover">` : (i.emoji||'☕')}</div>
      <div class="cmi-info"><div class="cmi-name">${i.name}</div><div class="cmi-meta">LKR ${Math.round(i.base_price/100)} · ${(i.tags||[]).join(' / ')||'No tags'}</div></div>
      <div class="cmi-price">LKR ${Math.round(i.base_price/100)}</div>
      <div class="cmi-toggle">
        <button class="toggle-switch ${i.is_visible?'on':''}" onclick="toggleItemVisibility('${i.id}', ${!i.is_visible})" title="${i.is_visible?'Visible':'Hidden'} to customers"></button>
        <button class="cmi-edit" onclick="openEditItemModal('${i.id}')">Edit</button>
        <button class="cmi-edit" onclick="deleteMenuItem('${i.id}','${i.name.replace(/'/g,"\\'")}')">Delete</button>
      </div>
    </div>`).join('');
}

function populateCategorySelect() {
  const sel = document.getElementById('item-category');
  if (!sel) return;
  sel.innerHTML = MENU_CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// ── Category CRUD ──
function openAddCatModal() {
  document.getElementById('cat-modal-title').textContent = 'Add Category';
  document.getElementById('cat-edit-id').value = '';
  document.getElementById('cat-name').value = '';
  document.getElementById('cat-icon').value = '';
  openModal('modal-add-cat');
}

function openEditCatModal(id) {
  const cat = MENU_CATEGORIES.find(c => c.id === id);
  if (!cat) return;
  document.getElementById('cat-modal-title').textContent = 'Edit Category';
  document.getElementById('cat-edit-id').value = cat.id;
  document.getElementById('cat-name').value = cat.name;
  document.getElementById('cat-icon').value = cat.icon || '';
  openModal('modal-add-cat');
}

async function saveCategory() {
  const id = document.getElementById('cat-edit-id').value;
  const name = document.getElementById('cat-name').value.trim();
  const icon = document.getElementById('cat-icon').value.trim() || null;
  if (!name) { showToast('Category name is required', '⚠️'); return; }
  if (!sb) return;

  const btn = document.getElementById('cat-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const payload = { name, icon, brand_id: window.MY_PROFILE?.brand_id, sort_order: id ? undefined : MENU_CATEGORIES.length };
  const { error } = id
    ? await sb.from('menu_categories').update({ name, icon }).eq('id', id)
    : await sb.from('menu_categories').insert(payload);
  btn.disabled = false; btn.textContent = 'Save Category';

  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-add-cat');
  showToast(id ? 'Category updated ✓' : 'Category added ✓', '☕');
  loadMenuManager();
}

async function deleteCategory(id, name) {
  if (!confirm(`Delete "${name}"? Items in this category will become uncategorized, not deleted.`)) return;
  const { error } = await sb.from('menu_categories').delete().eq('id', id);
  if (error) { showToast('Failed to delete: ' + error.message, '⚠️'); return; }
  if (ACTIVE_CAT_ID === id) ACTIVE_CAT_ID = null;
  showToast(`${name} deleted`, '🗑️');
  loadMenuManager();
}

// ── Menu Item CRUD ──
// ── Beverage Customer Options editor (Size/Temperature/Sweetness/Milk) ──
// Each category is a freeform list of {label, upcharge} the franchisor can
// add/edit/remove per beverage — replaces the old one-size-fits-all default
// set that every beverage was stuck with regardless of what actually applies.
const OPTION_CATEGORIES = [
  { key: 'size_options', title: 'Size' },
  { key: 'temp_options', title: 'Temperature' },
  { key: 'sugar_options', title: 'Sweetness' },
  { key: 'milk_options', title: 'Milk' },
];
let CURRENT_ITEM_OPTIONS = {};   // { size_options: [{label,upcharge}], ... } — upcharge in whole LKR while editing
let CURRENT_DETAIL_BLOCKS = [];  // [{type:'text'|'image', content}]

function renderOptionsEditor() {
  const wrap = document.getElementById('item-options-editor');
  wrap.innerHTML = OPTION_CATEGORIES.map(cat => {
    const rows = (CURRENT_ITEM_OPTIONS[cat.key] || []);
    return `<div style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:6px;">${cat.title}</div>
      <div id="opt-rows-${cat.key}">
        ${rows.map((opt, idx) => optionRowHTML(cat.key, idx, opt)).join('')}
      </div>
      <button type="button" class="btn btn-ghost" style="font-size:11px;padding:4px 10px;" onclick="addOptionRow('${cat.key}')">+ Add ${cat.title} Option</button>
      ${!rows.length ? `<div style="font-size:11px;color:var(--text3);margin-top:4px;">No options — this category will be hidden for customers on this beverage.</div>` : ''}
    </div>`;
  }).join('');
}

function optionRowHTML(catKey, idx, opt) {
  return `<div style="display:flex;gap:8px;margin-bottom:6px;align-items:center;" id="opt-row-${catKey}-${idx}">
    <input class="form-input" style="flex:1;" placeholder="Label (e.g. Large)" value="${opt.label||''}" oninput="updateOptionField('${catKey}',${idx},'label',this.value)">
    <input type="number" class="form-input" style="width:110px;" placeholder="+LKR 0" value="${opt.upcharge||0}" oninput="updateOptionField('${catKey}',${idx},'upcharge',this.value)">
    <button type="button" class="btn btn-ghost" style="padding:6px 10px;" onclick="removeOptionRow('${catKey}',${idx})">✕</button>
  </div>`;
}

function addOptionRow(catKey) {
  if (!CURRENT_ITEM_OPTIONS[catKey]) CURRENT_ITEM_OPTIONS[catKey] = [];
  CURRENT_ITEM_OPTIONS[catKey].push({ label: '', upcharge: 0 });
  renderOptionsEditor();
}

function removeOptionRow(catKey, idx) {
  CURRENT_ITEM_OPTIONS[catKey].splice(idx, 1);
  renderOptionsEditor();
}

function updateOptionField(catKey, idx, field, value) {
  CURRENT_ITEM_OPTIONS[catKey][idx][field] = field === 'upcharge' ? (parseFloat(value) || 0) : value;
}

// ── Beverage Detail Blocks editor (scrollable "more info" content) ──
function renderDetailBlocksEditor() {
  const wrap = document.getElementById('item-detail-blocks-editor');
  if (!CURRENT_DETAIL_BLOCKS.length) {
    wrap.innerHTML = `<div style="font-size:11px;color:var(--text3);">No extra content yet.</div>`;
    return;
  }
  wrap.innerHTML = CURRENT_DETAIL_BLOCKS.map((block, idx) => {
    if (block.type === 'image') {
      return `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;border:1px solid var(--border2);border-radius:var(--r-sm);padding:8px;">
        <div style="width:56px;height:42px;border-radius:6px;overflow:hidden;flex-shrink:0;background:var(--bg4);">${block.content?`<img src="${block.content}" style="width:100%;height:100%;object-fit:cover">`:''}</div>
        <input type="file" id="detail-block-file-${idx}" accept="image/*" style="display:none" onchange="handleDetailBlockImageSelect(${idx})">
        <button type="button" class="btn btn-ghost" style="font-size:11px;" onclick="document.getElementById('detail-block-file-${idx}').click()">Choose Photo</button>
        <button type="button" class="btn btn-ghost" style="margin-left:auto;padding:6px 10px;" onclick="removeDetailBlock(${idx})">✕</button>
      </div>`;
    }
    return `<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;">
      <textarea class="form-textarea" style="flex:1;min-height:60px;" placeholder="Paragraph text..." oninput="updateDetailBlockText(${idx},this.value)">${block.content||''}</textarea>
      <button type="button" class="btn btn-ghost" style="padding:6px 10px;" onclick="removeDetailBlock(${idx})">✕</button>
    </div>`;
  }).join('');
}

function addDetailBlock(type) {
  CURRENT_DETAIL_BLOCKS.push({ type, content: '' });
  renderDetailBlocksEditor();
}

function removeDetailBlock(idx) {
  CURRENT_DETAIL_BLOCKS.splice(idx, 1);
  renderDetailBlocksEditor();
}

function updateDetailBlockText(idx, value) {
  CURRENT_DETAIL_BLOCKS[idx].content = value;
}

async function handleDetailBlockImageSelect(idx) {
  const fileInput = document.getElementById(`detail-block-file-${idx}`);
  const file = fileInput.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Image too large — max 5MB', '⚠️'); return; }

  // Detail block photos upload immediately on selection (rather than
  // deferring to save time like the main item photo) since there can be
  // several of them and tracking multiple pending files adds real
  // complexity for little benefit here — immediate upload keeps this simple.
  showToast('Uploading photo...', '⏳');
  const ext = file.name.split('.').pop();
  const path = `menu-items/detail-blocks/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const { error } = await sb.storage.from('brewops-images').upload(path, file, { contentType: file.type });
  if (error) { showToast('Upload failed: ' + error.message, '⚠️'); return; }
  const { data: pub } = sb.storage.from('brewops-images').getPublicUrl(path);
  CURRENT_DETAIL_BLOCKS[idx].content = pub.publicUrl;
  renderDetailBlocksEditor();
  showToast('Photo uploaded ✓', '✓');
}

function openAddItemModal() {
  document.getElementById('item-modal-title').textContent = 'Add New Beverage';
  document.getElementById('item-edit-id').value = '';
  document.getElementById('item-name').value = '';
  document.getElementById('item-emoji').value = '';
  document.getElementById('item-description').value = '';
  document.getElementById('item-price').value = '';
  document.getElementById('item-original-price').value = '';
  document.getElementById('item-tags').value = '';
  document.getElementById('item-badge').value = '';
  document.getElementById('item-visible').checked = true;
  resetImagePicker('item-image-file','item-image-preview','item-image-url', null);
  populateCategorySelect();
  if (ACTIVE_CAT_ID) document.getElementById('item-category').value = ACTIVE_CAT_ID;

  // New beverage starts with the same sensible defaults customers always
  // saw before this feature existed, rather than zero options by default.
  CURRENT_ITEM_OPTIONS = {
    size_options: [{label:'Regular',upcharge:0},{label:'Large',upcharge:80}],
    temp_options: [{label:'Hot',upcharge:0},{label:'Iced',upcharge:0}],
    sugar_options: [{label:'No Sugar',upcharge:0},{label:'Standard',upcharge:0},{label:'Extra Sweet',upcharge:0}],
    milk_options: [{label:'Full Cream',upcharge:0},{label:'Oat Milk',upcharge:60},{label:'Soy Milk',upcharge:60}],
  };
  CURRENT_DETAIL_BLOCKS = [];
  renderOptionsEditor();
  renderDetailBlocksEditor();
  openModal('modal-add-item');
}

function openEditItemModal(id) {
  const item = MENU_ITEMS.find(i => i.id === id);
  if (!item) return;
  document.getElementById('item-modal-title').textContent = 'Edit Beverage';
  document.getElementById('item-edit-id').value = item.id;
  document.getElementById('item-name').value = item.name;
  document.getElementById('item-emoji').value = item.emoji || '';
  document.getElementById('item-description').value = item.description || '';
  document.getElementById('item-price').value = Math.round(item.base_price/100);
  document.getElementById('item-original-price').value = item.original_price ? Math.round(item.original_price/100) : '';
  document.getElementById('item-tags').value = (item.tags||[]).join(', ');
  document.getElementById('item-badge').value = item.badge_label || '';
  document.getElementById('item-visible').checked = item.is_visible;
  resetImagePicker('item-image-file','item-image-preview','item-image-url', item.image_url);
  populateCategorySelect();
  document.getElementById('item-category').value = item.category_id || '';

  // Load real per-item options (upcharges stored in cents in DB, shown in
  // whole LKR while editing — converted back to cents on save).
  CURRENT_ITEM_OPTIONS = {};
  OPTION_CATEGORIES.forEach(cat => {
    const raw = Array.isArray(item[cat.key]) ? item[cat.key] : [];
    CURRENT_ITEM_OPTIONS[cat.key] = raw.map(o => ({
      label: (o && o.label) ? o.label : String(o),
      upcharge: Math.round((o && typeof o.upcharge === 'number' ? o.upcharge : 0) / 100)
    }));
  });
  CURRENT_DETAIL_BLOCKS = Array.isArray(item.detail_blocks) ? JSON.parse(JSON.stringify(item.detail_blocks)) : [];
  renderOptionsEditor();
  renderDetailBlocksEditor();
  openModal('modal-add-item');
}

async function saveMenuItem() {
  const id = document.getElementById('item-edit-id').value;
  const name = document.getElementById('item-name').value.trim();
  const emoji = document.getElementById('item-emoji').value.trim() || null;
  const description = document.getElementById('item-description').value.trim();
  const priceInput = document.getElementById('item-price').value;
  const origPriceInput = document.getElementById('item-original-price').value;
  const category_id = document.getElementById('item-category').value;
  const tags = document.getElementById('item-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const badge_label = document.getElementById('item-badge').value.trim() || null;
  const is_visible = document.getElementById('item-visible').checked;

  if (!name || !priceInput || !category_id) { showToast('Name, price, and category are required', '⚠️'); return; }
  // Each option row needs a real label — silently saving blank-labeled
  // options would show an empty choice in the customer app.
  for (const cat of OPTION_CATEGORIES) {
    const rows = CURRENT_ITEM_OPTIONS[cat.key] || [];
    if (rows.some(o => !o.label || !o.label.trim())) {
      showToast(`Every ${cat.title} option needs a label`, '⚠️');
      return;
    }
  }
  if (!sb) return;

  const btn = document.getElementById('item-save-btn');
  btn.disabled = true; btn.textContent = 'Uploading photo...';
  const image_url = await uploadPendingImage('item-image-file', 'item-image-url', 'menu-items');

  // Convert each option's upcharge back to cents for storage, matching
  // base_price/original_price's existing convention.
  const optionsPayload = {};
  OPTION_CATEGORIES.forEach(cat => {
    optionsPayload[cat.key] = (CURRENT_ITEM_OPTIONS[cat.key] || []).map(o => ({
      label: o.label.trim(),
      upcharge: Math.round((o.upcharge || 0) * 100)
    }));
  });

  const payload = {
    name, emoji, description: description || null,
    base_price: Math.round(parseFloat(priceInput) * 100),
    original_price: origPriceInput ? Math.round(parseFloat(origPriceInput) * 100) : null,
    category_id, tags, badge_label, is_visible, image_url,
    brand_id: window.MY_PROFILE?.brand_id,
    detail_blocks: CURRENT_DETAIL_BLOCKS.filter(b => b.content && b.content.trim()),
    ...optionsPayload
  };

  btn.textContent = 'Saving...';
  const { error } = id
    ? await sb.from('menu_items').update(payload).eq('id', id)
    : await sb.from('menu_items').insert(payload);
  btn.disabled = false; btn.textContent = 'Save Beverage';

  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-add-item');
  showToast(id ? 'Beverage updated ✓' : 'Beverage added ✓', '☕');
  loadMenuManager();
}

async function toggleItemVisibility(id, newState) {
  const { error } = await sb.from('menu_items').update({ is_visible: newState }).eq('id', id);
  if (error) { showToast('Failed to update', '⚠️'); return; }
  showToast(newState ? 'Item visible in customer app ✓' : 'Item hidden from customer app', '👁');
  loadMenuManager();
}

async function deleteMenuItem(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  const { error } = await sb.from('menu_items').delete().eq('id', id);
  if (error) { showToast('Cannot delete — item has existing orders linked to it', '⚠️'); return; }
  showToast(`${name} deleted`, '🗑️');
  loadMenuManager();
}

// ══ MERCH & BEANS MANAGER — coffee beans/souvenirs, separate from beverage menu ══
let MERCH_CATEGORIES = [];
let MERCH_ITEMS = [];
let ACTIVE_MERCH_CAT_ID = null;

async function loadMerchManager() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data: cats } = await sb.from('merch_categories').select('*').eq('brand_id', window.MY_PROFILE.brand_id).order('sort_order');
  const { data: items } = await sb.from('merch_items').select('*').eq('brand_id', window.MY_PROFILE.brand_id).order('sort_order');

  MERCH_CATEGORIES = cats || [];
  MERCH_ITEMS = items || [];

  if (!ACTIVE_MERCH_CAT_ID && MERCH_CATEGORIES.length) ACTIVE_MERCH_CAT_ID = MERCH_CATEGORIES[0].id;

  renderMerchCatGrid();
  renderMerchItemsList();
  populateMerchCategorySelect();
}

function renderMerchCatGrid() {
  const grid = document.getElementById('cms-merch-cat-grid');
  const catCards = MERCH_CATEGORIES.map(c => {
    const count = MERCH_ITEMS.filter(i => i.category_id === c.id).length;
    const active = c.id === ACTIVE_MERCH_CAT_ID;
    return `<div class="cat-card${active?' active-cat':''}" onclick="selectMerchCat('${c.id}')">
      <div class="cat-icon">${c.icon||''}</div>
      <div class="cat-label">${c.name}</div>
      <div class="cat-count">${count} item${count===1?'':'s'}</div>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button class="topbar-btn" style="font-size:10px;padding:2px 8px" onclick="event.stopPropagation();openEditMerchCatModal('${c.id}')">Edit</button>
        <button class="topbar-btn" style="font-size:10px;padding:2px 8px" onclick="event.stopPropagation();deleteMerchCategory('${c.id}','${c.name.replace(/'/g,"\\'")}')">Delete</button>
      </div>
    </div>`;
  }).join('');

  const addCard = `<div class="cat-card" onclick="openAddMerchCatModal()" style="border-style:dashed;justify-content:center;">
    <div style="font-size:20px;color:var(--text3)">+</div><div class="cat-label" style="color:var(--text3)">Add Category</div>
  </div>`;

  grid.innerHTML = MERCH_CATEGORIES.length
    ? catCards + addCard
    : `<div style="padding:20px;color:var(--text3)">No categories yet — add your first one (e.g. "Coffee Beans", "Souvenirs").</div>` + addCard;
}

function selectMerchCat(id) {
  ACTIVE_MERCH_CAT_ID = id;
  renderMerchCatGrid();
  renderMerchItemsList();
}

function renderMerchItemsList() {
  const cat = MERCH_CATEGORIES.find(c => c.id === ACTIVE_MERCH_CAT_ID);
  const items = MERCH_ITEMS.filter(i => i.category_id === ACTIVE_MERCH_CAT_ID);
  const listEl = document.getElementById('cms-merch-items-list');

  document.getElementById('cms-merch-active-cat-icon').textContent = cat ? (cat.icon||'') : '';
  document.getElementById('cms-merch-active-cat-title').textContent = cat ? `${cat.name} — ${items.length} item${items.length===1?'':'s'}` : 'No category selected';

  const visibleCount = items.filter(i => i.is_visible).length;
  document.getElementById('cms-merch-status').innerHTML = items.length
    ? (visibleCount === items.length
        ? `<span style="color:var(--green-text)">● All visible</span>`
        : `<span style="color:var(--amber-text)">● ${visibleCount}/${items.length} visible</span>`)
    : '';

  if (!cat) { listEl.innerHTML = `<div style="padding:30px;color:var(--text3)">Add a category first.</div>`; return; }
  if (!items.length) { listEl.innerHTML = `<div style="padding:30px;color:var(--text3)">No products in this category yet — click "+ Add Product" above.</div>`; return; }

  listEl.innerHTML = items.map(i => {
    const outOfStock = (i.stock_qty || 0) <= 0;
    return `
    <div class="cms-menu-item">
      <div class="cmi-emoji" style="${i.image_url?'width:40px;height:40px;border-radius:8px;overflow:hidden;':''}">${i.image_url ? `<img src="${i.image_url}" style="width:100%;height:100%;object-fit:cover">` : (i.emoji||'🛍️')}</div>
      <div class="cmi-info"><div class="cmi-name">${i.name}</div><div class="cmi-meta">LKR ${Math.round(i.base_price/100)} · ${outOfStock ? '<span style="color:var(--red-text)">Out of stock</span>' : `${i.stock_qty} in stock`}</div></div>
      <div class="cmi-price">LKR ${Math.round(i.base_price/100)}</div>
      <div class="cmi-toggle">
        <button class="toggle-switch ${i.is_visible?'on':''}" onclick="toggleMerchItemVisibility('${i.id}', ${!i.is_visible})" title="${i.is_visible?'Visible':'Hidden'} to customers"></button>
        <button class="cmi-edit" onclick="openEditMerchItemModal('${i.id}')">Edit</button>
        <button class="cmi-edit" onclick="deleteMerchItem('${i.id}','${i.name.replace(/'/g,"\\'")}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function populateMerchCategorySelect() {
  const sel = document.getElementById('merch-item-category');
  if (!sel) return;
  sel.innerHTML = MERCH_CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// ── Merch Category CRUD ──
function openAddMerchCatModal() {
  document.getElementById('merch-cat-modal-title').textContent = 'Add Category';
  document.getElementById('merch-cat-edit-id').value = '';
  document.getElementById('merch-cat-name').value = '';
  document.getElementById('merch-cat-icon').value = '';
  openModal('modal-add-merch-cat');
}

function openEditMerchCatModal(id) {
  const cat = MERCH_CATEGORIES.find(c => c.id === id);
  if (!cat) return;
  document.getElementById('merch-cat-modal-title').textContent = 'Edit Category';
  document.getElementById('merch-cat-edit-id').value = cat.id;
  document.getElementById('merch-cat-name').value = cat.name;
  document.getElementById('merch-cat-icon').value = cat.icon || '';
  openModal('modal-add-merch-cat');
}

async function saveMerchCategory() {
  const id = document.getElementById('merch-cat-edit-id').value;
  const name = document.getElementById('merch-cat-name').value.trim();
  const icon = document.getElementById('merch-cat-icon').value.trim() || null;
  if (!name) { showToast('Category name is required', '⚠️'); return; }
  if (!sb) return;

  const btn = document.getElementById('merch-cat-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const payload = { name, icon, brand_id: window.MY_PROFILE?.brand_id, sort_order: id ? undefined : MERCH_CATEGORIES.length };
  const { error } = id
    ? await sb.from('merch_categories').update({ name, icon }).eq('id', id)
    : await sb.from('merch_categories').insert(payload);
  btn.disabled = false; btn.textContent = 'Save Category';

  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-add-merch-cat');
  showToast(id ? 'Category updated ✓' : 'Category added ✓', '🛍️');
  loadMerchManager();
}

async function deleteMerchCategory(id, name) {
  if (!confirm(`Delete "${name}"? Products in this category will become uncategorized, not deleted.`)) return;
  const { error } = await sb.from('merch_categories').delete().eq('id', id);
  if (error) { showToast('Failed to delete: ' + error.message, '⚠️'); return; }
  if (ACTIVE_MERCH_CAT_ID === id) ACTIVE_MERCH_CAT_ID = null;
  showToast(`${name} deleted`, '🗑️');
  loadMerchManager();
}

// ── Merch Item CRUD ──
// ── Merch Product Detail Blocks editor (scrollable "more info" content) ──
// Mirrors the beverage detail blocks editor exactly (same block shape,
// same upload behavior) so both product types render identically on the
// customer side — merch just has its own state array and own modal ids.
let CURRENT_MERCH_DETAIL_BLOCKS = [];

function renderMerchDetailBlocksEditor() {
  const wrap = document.getElementById('merch-item-detail-blocks-editor');
  if (!CURRENT_MERCH_DETAIL_BLOCKS.length) {
    wrap.innerHTML = `<div style="font-size:11px;color:var(--text3);">No extra content yet.</div>`;
    return;
  }
  wrap.innerHTML = CURRENT_MERCH_DETAIL_BLOCKS.map((block, idx) => {
    if (block.type === 'image') {
      return `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;border:1px solid var(--border2);border-radius:var(--r-sm);padding:8px;">
        <div style="width:56px;height:42px;border-radius:6px;overflow:hidden;flex-shrink:0;background:var(--bg4);">${block.content?`<img src="${block.content}" style="width:100%;height:100%;object-fit:cover">`:''}</div>
        <input type="file" id="merch-detail-block-file-${idx}" accept="image/*" style="display:none" onchange="handleMerchDetailBlockImageSelect(${idx})">
        <button type="button" class="btn btn-ghost" style="font-size:11px;" onclick="document.getElementById('merch-detail-block-file-${idx}').click()">Choose Photo</button>
        <button type="button" class="btn btn-ghost" style="margin-left:auto;padding:6px 10px;" onclick="removeMerchDetailBlock(${idx})">✕</button>
      </div>`;
    }
    return `<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;">
      <textarea class="form-textarea" style="flex:1;min-height:60px;" placeholder="Paragraph text..." oninput="updateMerchDetailBlockText(${idx},this.value)">${block.content||''}</textarea>
      <button type="button" class="btn btn-ghost" style="padding:6px 10px;" onclick="removeMerchDetailBlock(${idx})">✕</button>
    </div>`;
  }).join('');
}

function addMerchDetailBlock(type) {
  CURRENT_MERCH_DETAIL_BLOCKS.push({ type, content: '' });
  renderMerchDetailBlocksEditor();
}

function removeMerchDetailBlock(idx) {
  CURRENT_MERCH_DETAIL_BLOCKS.splice(idx, 1);
  renderMerchDetailBlocksEditor();
}

function updateMerchDetailBlockText(idx, value) {
  CURRENT_MERCH_DETAIL_BLOCKS[idx].content = value;
}

async function handleMerchDetailBlockImageSelect(idx) {
  const fileInput = document.getElementById(`merch-detail-block-file-${idx}`);
  const file = fileInput.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Image too large — max 5MB', '⚠️'); return; }

  showToast('Uploading photo...', '⏳');
  const ext = file.name.split('.').pop();
  const path = `merch/detail-blocks/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const { error } = await sb.storage.from('brewops-images').upload(path, file, { contentType: file.type });
  if (error) { showToast('Upload failed: ' + error.message, '⚠️'); return; }
  const { data: pub } = sb.storage.from('brewops-images').getPublicUrl(path);
  CURRENT_MERCH_DETAIL_BLOCKS[idx].content = pub.publicUrl;
  renderMerchDetailBlocksEditor();
  showToast('Photo uploaded ✓', '✓');
}

function openAddMerchItemModal() {
  document.getElementById('merch-item-modal-title').textContent = 'Add New Product';
  document.getElementById('merch-item-edit-id').value = '';
  document.getElementById('merch-item-name').value = '';
  document.getElementById('merch-item-emoji').value = '';
  document.getElementById('merch-item-description').value = '';
  document.getElementById('merch-item-price').value = '';
  document.getElementById('merch-item-original-price').value = '';
  document.getElementById('merch-item-stock').value = '';
  document.getElementById('merch-item-badge').value = '';
  document.getElementById('merch-item-visible').checked = true;
  resetImagePicker('merch-item-image-file','merch-item-image-preview','merch-item-image-url', null);
  populateMerchCategorySelect();
  if (ACTIVE_MERCH_CAT_ID) document.getElementById('merch-item-category').value = ACTIVE_MERCH_CAT_ID;
  CURRENT_MERCH_DETAIL_BLOCKS = [];
  renderMerchDetailBlocksEditor();
  openModal('modal-add-merch-item');
}

function openEditMerchItemModal(id) {
  const item = MERCH_ITEMS.find(i => i.id === id);
  if (!item) return;
  document.getElementById('merch-item-modal-title').textContent = 'Edit Product';
  document.getElementById('merch-item-edit-id').value = item.id;
  document.getElementById('merch-item-name').value = item.name;
  document.getElementById('merch-item-emoji').value = item.emoji || '';
  document.getElementById('merch-item-description').value = item.description || '';
  document.getElementById('merch-item-price').value = Math.round(item.base_price/100);
  document.getElementById('merch-item-original-price').value = item.original_price ? Math.round(item.original_price/100) : '';
  document.getElementById('merch-item-stock').value = item.stock_qty || 0;
  document.getElementById('merch-item-badge').value = item.badge_label || '';
  document.getElementById('merch-item-visible').checked = item.is_visible;
  resetImagePicker('merch-item-image-file','merch-item-image-preview','merch-item-image-url', item.image_url);
  populateMerchCategorySelect();
  document.getElementById('merch-item-category').value = item.category_id || '';
  CURRENT_MERCH_DETAIL_BLOCKS = Array.isArray(item.detail_blocks) ? JSON.parse(JSON.stringify(item.detail_blocks)) : [];
  renderMerchDetailBlocksEditor();
  openModal('modal-add-merch-item');
}

async function saveMerchItem() {
  const id = document.getElementById('merch-item-edit-id').value;
  const name = document.getElementById('merch-item-name').value.trim();
  const emoji = document.getElementById('merch-item-emoji').value.trim() || null;
  const description = document.getElementById('merch-item-description').value.trim();
  const priceInput = document.getElementById('merch-item-price').value;
  const origPriceInput = document.getElementById('merch-item-original-price').value;
  const category_id = document.getElementById('merch-item-category').value;
  const stockInput = document.getElementById('merch-item-stock').value;
  const badge_label = document.getElementById('merch-item-badge').value.trim() || null;
  const is_visible = document.getElementById('merch-item-visible').checked;

  if (!name || !priceInput || !category_id) { showToast('Name, price, and category are required', '⚠️'); return; }
  if (!sb) return;

  const btn = document.getElementById('merch-item-save-btn');
  btn.disabled = true; btn.textContent = 'Uploading photo...';
  const image_url = await uploadPendingImage('merch-item-image-file', 'merch-item-image-url', 'merch');

  const payload = {
    name, emoji, description: description || null,
    base_price: Math.round(parseFloat(priceInput) * 100),
    original_price: origPriceInput ? Math.round(parseFloat(origPriceInput) * 100) : null,
    category_id, stock_qty: stockInput ? Math.round(parseFloat(stockInput)) : 0,
    badge_label, is_visible, image_url,
    brand_id: window.MY_PROFILE?.brand_id,
    detail_blocks: CURRENT_MERCH_DETAIL_BLOCKS.filter(b => b.content && b.content.trim())
  };

  btn.textContent = 'Saving...';
  const { error } = id
    ? await sb.from('merch_items').update(payload).eq('id', id)
    : await sb.from('merch_items').insert(payload);
  btn.disabled = false; btn.textContent = 'Save Product';

  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-add-merch-item');
  showToast(id ? 'Product updated ✓' : 'Product added ✓', '🛍️');
  loadMerchManager();
}

async function toggleMerchItemVisibility(id, newState) {
  const { error } = await sb.from('merch_items').update({ is_visible: newState }).eq('id', id);
  if (error) { showToast('Failed to update', '⚠️'); return; }
  showToast(newState ? 'Product visible in customer app ✓' : 'Product hidden from customer app', '👁');
  loadMerchManager();
}

async function deleteMerchItem(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  const { error } = await sb.from('merch_items').delete().eq('id', id);
  if (error) { showToast('Cannot delete — product has existing orders linked to it', '⚠️'); return; }
  showToast(`${name} deleted`, '🗑️');
  loadMerchManager();
}

// ══ COUPON CAMPAIGNS — full CRUD wired to Supabase ══
let COUPONS = [];

async function loadCoupons() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data } = await sb.from('coupons').select('*').eq('brand_id', window.MY_PROFILE.brand_id).order('created_at', { ascending: false });
  COUPONS = data || [];
  renderCouponsList();
}

function renderCouponsList() {
  const list = document.getElementById('coupons-list');
  const activeCount = COUPONS.filter(c => c.is_active).length;
  document.getElementById('coupon-active-count').textContent = `${activeCount} Active Campaign${activeCount===1?'':'s'}`;
  document.getElementById('coupon-subtitle').textContent = `${COUPONS.length} coupon${COUPONS.length===1?'':'s'} · Create and manage customer-facing coupons`;

  if (!COUPONS.length) {
    list.innerHTML = `<div style="padding:30px;color:var(--text3)">No coupons yet — click "+ New Coupon" to create your first campaign.</div>`;
    return;
  }

  list.innerHTML = COUPONS.map(c => {
    const descMap = {
      percent: `${c.discount_value}% off`,
      fixed: `LKR ${Math.round(c.discount_value/100)} off`,
      free: `Free item`
    };
    const meta = [
      c.valid_until ? `Expires ${new Date(c.valid_until).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}` : 'No expiry',
      c.happy_hour_start ? `Daily ${c.happy_hour_start.slice(0,5)}-${c.happy_hour_end?.slice(0,5)}` : null,
      c.new_customers_only ? 'New customers only' : null,
      `Used ${c.total_used||0}×`
    ].filter(Boolean).join(' · ');
    return `<div class="coupon-cms-item">
      <div class="coupon-code-tag">${c.code}</div>
      <div style="flex:1"><div style="font-size:13px;font-weight:500">${descMap[c.discount_type]||c.discount_type}</div><div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">${meta}</div></div>
      <button class="toggle-switch ${c.is_active?'on':''}" onclick="toggleCoupon('${c.id}', ${!c.is_active})" style="flex-shrink:0" title="${c.is_active?'Active':'Inactive'}"></button>
      <button class="cmi-edit" onclick="openEditCouponModal('${c.id}')">Edit</button>
      <button class="cmi-edit" onclick="deleteCoupon('${c.id}','${c.code}')">Delete</button>
    </div>`;
  }).join('');
}

function updateCouponValueLabel() {
  const type = document.getElementById('cp-type').value;
  const label = document.getElementById('cp-value-label');
  label.textContent = type === 'percent' ? 'Discount Value (%)' : type === 'fixed' ? 'Discount Value (LKR)' : 'Discount Value (unused for free item)';
}
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('cp-type');
  if (sel) sel.addEventListener('change', updateCouponValueLabel);
});

function openAddCouponModal() {
  document.getElementById('coupon-modal-title').textContent = 'New Coupon';
  document.getElementById('cp-edit-id').value = '';
  document.getElementById('cp-code').value = '';
  document.getElementById('cp-type').value = 'percent';
  document.getElementById('cp-value').value = '';
  document.getElementById('cp-min-order').value = '';
  document.getElementById('cp-max-uses').value = '';
  document.getElementById('cp-uses-per-customer').value = '1';
  document.getElementById('cp-hour-start').value = '';
  document.getElementById('cp-hour-end').value = '';
  document.getElementById('cp-expires').value = '';
  document.getElementById('cp-new-only').checked = false;
  document.getElementById('cp-active').checked = true;
  updateCouponValueLabel();
  openModal('modal-add-coupon');
}

function openEditCouponModal(id) {
  const c = COUPONS.find(x => x.id === id);
  if (!c) return;
  document.getElementById('coupon-modal-title').textContent = 'Edit Coupon';
  document.getElementById('cp-edit-id').value = c.id;
  document.getElementById('cp-code').value = c.code;
  document.getElementById('cp-type').value = c.discount_type;
  document.getElementById('cp-value').value = c.discount_type === 'fixed' ? Math.round(c.discount_value/100) : c.discount_value;
  document.getElementById('cp-min-order').value = c.min_order ? Math.round(c.min_order/100) : '';
  document.getElementById('cp-max-uses').value = c.max_uses || '';
  document.getElementById('cp-uses-per-customer').value = c.uses_per_customer || 1;
  document.getElementById('cp-hour-start').value = c.happy_hour_start ? c.happy_hour_start.slice(0,5) : '';
  document.getElementById('cp-hour-end').value = c.happy_hour_end ? c.happy_hour_end.slice(0,5) : '';
  document.getElementById('cp-expires').value = c.valid_until || '';
  document.getElementById('cp-new-only').checked = c.new_customers_only;
  document.getElementById('cp-active').checked = c.is_active;
  updateCouponValueLabel();
  openModal('modal-add-coupon');
}

async function saveCoupon() {
  const id = document.getElementById('cp-edit-id').value;
  const code = document.getElementById('cp-code').value.trim().toUpperCase();
  const discount_type = document.getElementById('cp-type').value;
  const valueInput = document.getElementById('cp-value').value;
  const minOrderInput = document.getElementById('cp-min-order').value;
  const max_uses = document.getElementById('cp-max-uses').value || null;
  const uses_per_customer = parseInt(document.getElementById('cp-uses-per-customer').value) || 1;
  const happy_hour_start = document.getElementById('cp-hour-start').value || null;
  const happy_hour_end = document.getElementById('cp-hour-end').value || null;
  const valid_until = document.getElementById('cp-expires').value || null;
  const new_customers_only = document.getElementById('cp-new-only').checked;
  const is_active = document.getElementById('cp-active').checked;

  if (!code) { showToast('Coupon code is required', '⚠️'); return; }
  if (discount_type !== 'free' && !valueInput) { showToast('Discount value is required', '⚠️'); return; }
  if (!sb) return;

  const discount_value = discount_type === 'fixed' ? Math.round(parseFloat(valueInput||0) * 100) : parseInt(valueInput||0);
  const min_order = minOrderInput ? Math.round(parseFloat(minOrderInput) * 100) : 0;

  const payload = {
    code, discount_type, discount_value, min_order,
    max_uses: max_uses ? parseInt(max_uses) : null,
    uses_per_customer, happy_hour_start, happy_hour_end,
    valid_until, new_customers_only, is_active,
    brand_id: window.MY_PROFILE?.brand_id
  };

  const btn = document.getElementById('coupon-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  const { error } = id
    ? await sb.from('coupons').update(payload).eq('id', id)
    : await sb.from('coupons').insert(payload);
  btn.disabled = false; btn.textContent = 'Save Coupon';

  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  closeModal('modal-add-coupon');
  showToast(id ? `${code} updated ✓` : `${code} created ✓`, '🏷️');
  loadCoupons();
}

async function toggleCoupon(id, newState) {
  const { error } = await sb.from('coupons').update({ is_active: newState }).eq('id', id);
  if (error) { showToast('Failed to update', '⚠️'); return; }
  showToast(newState ? 'Coupon activated ✓' : 'Coupon deactivated', '🏷️');
  loadCoupons();
}

async function deleteCoupon(id, code) {
  if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return;
  const { error } = await sb.from('coupons').delete().eq('id', id);
  if (error) { showToast('Cannot delete — coupon has redemption history linked to it', '⚠️'); return; }
  showToast(`${code} deleted`, '🗑️');
  loadCoupons();
}

