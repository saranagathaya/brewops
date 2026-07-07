// ══ SHARED EMOJI PICKER ══
const EMOJI_PALETTE = ['☕','🧋','⚡','🥛','🫖','🌿','🧊','🍵','🫧','🔥','🥤','🍰','🧁','🍪','🥐','🍩',
  '🍫','🍯','🌰','🍓','🍌','🍋','🍊','🥥','🧇','🥧','⭐','🆕','💯','✨','👑','🎉'];

let EMOJI_PICKER_TARGET = null;

function openEmojiPicker(targetInputId, evt) {
  evt.stopPropagation();
  EMOJI_PICKER_TARGET = targetInputId;
  const grid = document.getElementById('emoji-picker-grid');
  const noIconBtn = `<button type="button" onclick="selectEmoji('')" title="No icon" style="font-size:11px;font-family:var(--font-mono);color:var(--text3);padding:6px;border:1px dashed var(--border2);background:transparent;border-radius:6px;cursor:pointer;grid-column:span 2;" onmouseover="this.style.background='var(--bg4)'" onmouseout="this.style.background='transparent'">✕ None</button>`;
  grid.innerHTML = noIconBtn + EMOJI_PALETTE.map(e =>
    `<button type="button" onclick="selectEmoji('${e}')" style="font-size:18px;padding:6px;border:none;background:transparent;border-radius:6px;cursor:pointer" onmouseover="this.style.background='var(--bg4)'" onmouseout="this.style.background='transparent'">${e}</button>`
  ).join('');

  const popover = document.getElementById('emoji-picker-popover');
  const rect = evt.target.getBoundingClientRect();
  popover.style.top = `${rect.bottom + 6}px`;
  popover.style.left = `${rect.left}px`;
  popover.style.display = 'block';
}

function selectEmoji(emoji) {
  if (EMOJI_PICKER_TARGET) {
    const input = document.getElementById(EMOJI_PICKER_TARGET);
    input.value = emoji;
    input.dispatchEvent(new Event('input')); // triggers any live preview listeners
  }
  document.getElementById('emoji-picker-popover').style.display = 'none';
}

document.addEventListener('click', (e) => {
  const popover = document.getElementById('emoji-picker-popover');
  if (popover && popover.style.display === 'block' && !popover.contains(e.target)) {
    popover.style.display = 'none';
  }
});

// ══ SHARED IMAGE UPLOAD HELPERS ══
const SELECTED_IMAGE_FILES = {}; // keyed by file input id, holds the raw File object until save

function handleImageSelect(fileInputId, previewId) {
  const fileInput = document.getElementById(fileInputId);
  const file = fileInput.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('Image too large — max 5MB', '⚠️');
    fileInput.value = '';
    return;
  }

  SELECTED_IMAGE_FILES[fileInputId] = file;
  const preview = document.getElementById(previewId);
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;
    // For promo slides, also refresh the large live preview background —
    // there's no gradient fallback anymore, the photo IS the background.
    if (fileInputId === 'promo-image-file') {
      const bigPreview = document.getElementById('promo-preview-bg');
      if (bigPreview) bigPreview.style.background = `url('${e.target.result}') center/cover`;
    }
  };
  reader.readAsDataURL(file);

  const removeBtnId = fileInputId.replace('-file', '-remove-btn');
  const removeBtn = document.getElementById(removeBtnId);
  if (removeBtn) removeBtn.style.display = 'inline-block';
}

function removeSelectedImage(fileInputId, previewId, urlInputId) {
  delete SELECTED_IMAGE_FILES[fileInputId];
  document.getElementById(fileInputId).value = '';
  document.getElementById(urlInputId).value = '';
  document.getElementById(previewId).innerHTML = '<span style="color:var(--text3);font-size:11px">None</span>';
  const removeBtnId = fileInputId.replace('-file', '-remove-btn');
  const removeBtn = document.getElementById(removeBtnId);
  if (removeBtn) removeBtn.style.display = 'none';
  if (fileInputId === 'promo-image-file') {
    const bigPreview = document.getElementById('promo-preview-bg');
    if (bigPreview) bigPreview.style.background = 'linear-gradient(145deg,#1a0a2e,#2d1040)';
  }
}

// Uploads a pending File (if one was selected) to Supabase Storage and
// returns its public URL. Returns the existing urlInputValue unchanged
// if no new file was selected (so editing without changing the photo
// doesn't re-upload or clear it).
async function uploadPendingImage(fileInputId, urlInputId, folder) {
  const file = SELECTED_IMAGE_FILES[fileInputId];
  const existingUrl = document.getElementById(urlInputId).value;
  if (!file) return existingUrl || null;

  const ext = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

  const { error } = await sb.storage.from('brewops-images').upload(path, file, { contentType: file.type });
  if (error) {
    showToast('Image upload failed: ' + error.message, '⚠️');
    return existingUrl || null;
  }
  const { data: pub } = sb.storage.from('brewops-images').getPublicUrl(path);
  delete SELECTED_IMAGE_FILES[fileInputId];
  return pub.publicUrl;
}

function resetImagePicker(fileInputId, previewId, urlInputId, existingUrl) {
  delete SELECTED_IMAGE_FILES[fileInputId];
  document.getElementById(fileInputId).value = '';
  document.getElementById(urlInputId).value = existingUrl || '';
  const preview = document.getElementById(previewId);
  preview.innerHTML = existingUrl
    ? `<img src="${existingUrl}" style="width:100%;height:100%;object-fit:cover">`
    : '<span style="color:var(--text3);font-size:11px">None</span>';
  const removeBtnId = fileInputId.replace('-file', '-remove-btn');
  const removeBtn = document.getElementById(removeBtnId);
  if (removeBtn) removeBtn.style.display = existingUrl ? 'inline-block' : 'none';
}

// ── Sidebar ──
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebar-overlay').classList.toggle('show');}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebar-overlay').classList.remove('show');}

// ── Modal / Toast — see shared.js ──


async function savePromoSlide(){
  const id = document.getElementById('ep-promo-id')?.value || null;
  const headline = document.getElementById('ep-headline').value.trim();
  if (!headline) { showToast('Headline is required', '⚠️'); return; }

  // A photo is required — there's no gradient fallback anymore. Editing
  // an existing slide that already has a photo doesn't force a re-upload;
  // only brand-new slides (or ones with no photo at all yet) must pick one.
  const hasNewFile = !!SELECTED_IMAGE_FILES['promo-image-file'];
  const hasExistingUrl = !!document.getElementById('promo-image-url').value;
  if (!hasNewFile && !hasExistingUrl) {
    showToast('Please choose a background photo', '⚠️');
    return;
  }

  const image_url = await uploadPendingImage('promo-image-file', 'promo-image-url', 'promo-slides');

  const data = {
    headline,
    emoji:    document.getElementById('ep-emoji').value || null,
    sub:      document.getElementById('ep-sub').value,
    label:    document.getElementById('ep-label').value,
    price:    document.getElementById('ep-price').value,
    visible:  document.getElementById('ep-visible').checked,
    image_url
  };
  const saved = await savePromoSlideToDB(id, data);
  if (!saved) { showToast('Failed to save slide', '⚠️'); return; }
  closeModal('modal-edit-promo');
  showToast(`"${headline}" slide ${id?'updated':'added'} ✓`, '🎨');
  loadPromoAndBanner();
}



// ── Toggle visibility (menu items + coupons) ──
async function toggleItem(btn){
  btn.classList.toggle('on');
  btn.classList.toggle('off');
  const isOn = btn.classList.contains('on');
  // Find item/coupon context
  const row = btn.closest('.cms-menu-item, .coupon-cms-item');
  if (row) {
    const nameEl = row.querySelector('.cmi-name, .coupon-code-tag');
    const name = nameEl ? nameEl.textContent.trim() : '';
    // For menu items try to get the item ID from sibling edit button
    const editBtn = row.querySelector('.cmi-edit');
    if (editBtn && sb) {
      const onclick = editBtn.getAttribute('onclick') || '';
      const idMatch = onclick.match(/openEditItem\('([^']+)'\)/);
      if (idMatch) await toggleMenuItemDB(idMatch[1], isOn);
      // For coupons
      const couponMatch = onclick.match(/openEditCoupon\('([^']+)'/);
      if (couponMatch) await toggleCouponDB(couponMatch[1], isOn);
    }
  }
  showToast(isOn ? 'Visible in customer app ✓' : 'Hidden from customer app', '👁');
}

// ── Cat select ──
function selectCat(el){
  document.querySelectorAll('.cat-card').forEach(c=>c.classList.remove('active-cat'));
  el.classList.add('active-cat');
}

// ── Edit promo ──
let PROMO_SLIDES = [];

async function loadPromoAndBanner() {
  if (!sb || !window.MY_PROFILE?.brand_id) return;
  const { data: slides } = await sb.from('promo_slides').select('*').eq('brand_id', window.MY_PROFILE.brand_id).order('sort_order');
  const { data: banner } = await sb.from('home_banner').select('*').eq('is_active', true).eq('brand_id', window.MY_PROFILE.brand_id).maybeSingle();

  PROMO_SLIDES = slides || [];
  renderPromoGrid();
  renderBannerForm(banner);
}

function renderPromoGrid() {
  const grid = document.getElementById('promo-slides-grid');
  const activeCount = PROMO_SLIDES.filter(s => s.is_visible).length;
  document.getElementById('promo-active-count').textContent = `${activeCount} Active Slide${activeCount===1?'':'s'}`;
  document.getElementById('promo-slide-count').textContent = `${PROMO_SLIDES.length} slide${PROMO_SLIDES.length===1?'':'s'}`;

  if (!PROMO_SLIDES.length) {
    grid.innerHTML = `<div style="padding:30px;color:var(--text3)">No slides yet — click "+ New Slide" to create your first splash screen slide.</div>`;
    return;
  }

  grid.innerHTML = PROMO_SLIDES.map((s, idx) => `
    <div class="promo-slide-card">
      <div class="psc-preview" style="background:${s.image_url ? `url('${s.image_url}') center/cover` : (s.bg_gradient || 'linear-gradient(135deg,#1a0a2e,#2d1040)')};">
        <div class="psc-order">${idx+1}</div>
        <div style="font-size:40px">${s.emoji||'☕'}</div>
        <div class="psc-active-badge" style="background:${s.is_visible?'var(--green-dim)':'var(--red-dim)'};color:${s.is_visible?'var(--green-text)':'var(--red-text)'}">${s.is_visible?'● Live':'○ Hidden'}</div>
      </div>
      <div class="psc-body">
        <div class="psc-title">${s.headline}</div>
        <div class="psc-sub">${s.price_display||''}</div>
        <div class="psc-actions">
          <button class="psc-btn primary" onclick="openEditPromo('${s.id}')">Edit</button>
          <button class="psc-btn" onclick="togglePromoVisibility('${s.id}', ${!s.is_visible})">${s.is_visible?'Hide':'Show'}</button>
          <button class="psc-btn danger" onclick="deletePromoSlide('${s.id}','${s.headline.replace(/'/g,"\\'")}')">Remove</button>
        </div>
      </div>
    </div>`).join('');
}

function openAddPromoModal() {
  document.getElementById('promo-modal-title').textContent = '🎨 New Promo Slide';
  document.getElementById('ep-promo-id').value = '';
  document.getElementById('ep-headline').value = '';
  document.getElementById('ep-emoji').value = '☕';
  document.getElementById('ep-sub').value = '';
  document.getElementById('ep-label').value = '';
  document.getElementById('ep-price').value = '';
  document.getElementById('ep-visible').checked = true;
  document.getElementById('promo-preview-bg').style.background = 'linear-gradient(145deg,#1a0a2e,#2d1040)';
  resetImagePicker('promo-image-file','promo-image-preview','promo-image-url', null);
  updatePromoPreview();
  openModal('modal-edit-promo');
}

function openEditPromo(id){
  const s = PROMO_SLIDES.find(x => x.id === id);
  if (!s) return;
  document.getElementById('promo-modal-title').textContent = '🎨 Edit Promo Slide';
  document.getElementById('ep-promo-id').value = s.id;
  document.getElementById('ep-headline').value = s.headline;
  document.getElementById('ep-emoji').value = s.emoji || '☕';
  document.getElementById('ep-sub').value = s.sub_text || '';
  document.getElementById('ep-label').value = s.label_badge || '';
  document.getElementById('ep-price').value = s.price_display || '';
  document.getElementById('ep-visible').checked = s.is_visible;
  document.getElementById('promo-preview-bg').style.background = s.image_url ? `url('${s.image_url}') center/cover` : 'linear-gradient(145deg,#1a0a2e,#2d1040)';
  resetImagePicker('promo-image-file','promo-image-preview','promo-image-url', s.image_url);
  updatePromoPreview();
  openModal('modal-edit-promo');
}

async function togglePromoVisibility(id, newState) {
  const { error } = await sb.from('promo_slides').update({ is_visible: newState }).eq('id', id);
  if (error) { showToast('Failed to update', '⚠️'); return; }
  showToast(newState ? 'Slide now live ✓' : 'Slide hidden', '🎨');
  loadPromoAndBanner();
}

async function deletePromoSlide(id, headline) {
  if (!confirm(`Remove "${headline}"? This cannot be undone.`)) return;
  const { error } = await sb.from('promo_slides').delete().eq('id', id);
  if (error) { showToast('Failed to remove: ' + error.message, '⚠️'); return; }
  showToast('Slide removed', '🗑️');
  loadPromoAndBanner();
}

function renderBannerForm(banner) {
  const body = document.getElementById('banner-card-body');
  document.getElementById('banner-status').innerHTML = banner
    ? `<span style="color:var(--green-text)">● Live</span>`
    : `<span style="color:var(--text3)">No banner set</span>`;

  body.innerHTML = `
    <div style="background:${banner?.bg_gradient || 'linear-gradient(90deg,#0d2040,#1a3060)'};border-radius:var(--r);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <div><div style="font-size:14px;font-weight:600;color:white;font-style:italic" id="banner-preview-headline">${banner?.headline || 'No headline set'}</div><div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:4px" id="banner-preview-sub">${banner?.sub_text || ''}</div></div>
      <div style="text-align:center;background:var(--brand);border-radius:8px;padding:6px 12px;"><div style="font-size:18px;font-weight:700;color:white;font-family:var(--font-mono)" id="banner-preview-price">${banner?.price_display || ''}</div></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Banner Headline</label><input class="form-input" id="cms-banner-headline" value="${banner?.headline || ''}"></div>
      <div class="form-group"><label class="form-label">Price Display</label><input class="form-input" id="cms-banner-price" value="${banner?.price_display || ''}"></div>
    </div>
    <div class="form-group"><label class="form-label">Sub-text</label><input class="form-input" id="cms-banner-sub" value="${banner?.sub_text || ''}"></div>
    <div class="form-group">
      <label class="form-label">Background Photo (optional — falls back to a color gradient if not set)</label>
      <div style="display:flex;align-items:center;gap:12px;">
        <div id="banner-image-preview" style="width:72px;height:48px;border-radius:8px;background:var(--bg4);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:1px solid var(--border2)">
          ${banner?.image_url ? `<img src="${banner.image_url}" style="width:100%;height:100%;object-fit:cover">` : `<span style="color:var(--text3);font-size:10px">None</span>`}
        </div>
        <input type="file" id="banner-image-file" accept="image/*" style="display:none" onchange="handleImageSelect('banner-image-file','banner-image-preview')">
        <button type="button" class="btn btn-ghost" onclick="document.getElementById('banner-image-file').click()">Choose Photo</button>
        <button type="button" class="btn btn-ghost" id="banner-image-remove-btn" style="${banner?.image_url?'':'display:none'}" onclick="removeSelectedImage('banner-image-file','banner-image-preview','banner-image-url')">Remove</button>
        <input type="hidden" id="banner-image-url" value="${banner?.image_url || ''}">
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px">
      <button class="btn btn-ghost" onclick="loadPromoAndBanner()">Revert</button>
      <button class="btn btn-primary" id="banner-save-btn" onclick="saveHomeBanner()">Publish Banner</button>
    </div>`;
}

async function saveHomeBanner() {
  const headline = document.getElementById('cms-banner-headline').value.trim();
  const sub_text = document.getElementById('cms-banner-sub').value.trim();
  const price_display = document.getElementById('cms-banner-price').value.trim();
  if (!headline) { showToast('Headline is required', '⚠️'); return; }

  const btn = document.getElementById('banner-save-btn');
  btn.disabled = true; btn.textContent = 'Uploading photo...';
  const image_url = await uploadPendingImage('banner-image-file', 'banner-image-url', 'home-banner');

  btn.textContent = 'Publishing...';
  const { data: existing } = await sb.from('home_banner').select('id').eq('is_active', true).eq('brand_id', window.MY_PROFILE?.brand_id).maybeSingle();
  const payload = { headline, sub_text, price_display, image_url, is_active: true, brand_id: window.MY_PROFILE?.brand_id, updated_at: new Date().toISOString() };
  const { error } = existing
    ? await sb.from('home_banner').update(payload).eq('id', existing.id)
    : await sb.from('home_banner').insert(payload);

  btn.disabled = false; btn.textContent = 'Publish Banner';
  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  showToast('Home banner published ✓ — Live now!', '🏠');
  loadPromoAndBanner();
}

function updatePromoPreview(){
  const h=document.getElementById('ep-headline').value;
  const e=document.getElementById('ep-emoji').value;
  const s=document.getElementById('ep-sub').value;
  const l=document.getElementById('ep-label').value;
  const p=document.getElementById('ep-price').value;
  if(h) document.getElementById('promo-preview-headline').textContent=h;
  document.getElementById('promo-preview-emoji').textContent=e; // emoji can be intentionally blank ("No Icon"), unlike text fields above
  if(s) document.getElementById('promo-preview-sub').textContent=s;
  if(l) document.getElementById('promo-preview-label').textContent=l;
  if(p) document.getElementById('promo-preview-price').textContent=p;
}

// ── Toggle handled by async version above ──
// openEditCoupon kept below for backward compat

// ── Toggle item visibility ──
// ── Cat select ──
// ── Edit item ──

// ── Filter orders ──


// ── App Settings publish button handler ──
async function publishAppSettings() {
  const settings = [
    ['app_name',       document.querySelector('input[value="Liétard Artisan Roast"]')?.value],
    ['app_tagline',    document.querySelector('input[value="Artisan Roast Coffee"]')?.value],
    ['brand_color',    document.querySelector('input[value="#8B1A1A"]')?.value],
    ['accent_color',   document.querySelector('input[value="#C8922A"]')?.value],
    ['welcome_message',document.querySelector('.form-textarea')?.value],
  ].filter(([k,v]) => v);

  if (sb) {
    for (const [key, value] of settings) {
      await saveAppSettingDB(key, value);
    }
    showToast('Settings published ✓','⚙️');
  } else {
    showToast('Connect Supabase to publish settings live','☕');
  }
}

// Initial render — demo mode until Supabase connected
renderOrders();

// ── Connect to Supabase ──
initSupabase();
