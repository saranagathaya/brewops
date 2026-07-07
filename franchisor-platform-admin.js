// ══ PLATFORM ADMIN — brand management (multi-brand foundation) ══
// Only reachable by profile.role === 'platform_admin' (see
// loadProfileAndEnterApp). A platform admin creates brands and seeds
// each one's first franchisor invite code — after that, the brand's own
// franchisor takes over generating their own franchisee/franchisor
// invites from the regular Outlet Network page.
let PLATFORM_BRANDS = [];

async function loadPlatformBrands() {
  const listEl = document.getElementById('platform-brands-list');
  if (!sb) return;

  const { data, error } = await sb.from('brands').select('*').order('created_at', { ascending: false });
  if (error) {
    listEl.innerHTML = `<div style="padding:30px;color:var(--text3)">Error loading brands: ${error.message}</div>`;
    return;
  }

  PLATFORM_BRANDS = data || [];
  if (!PLATFORM_BRANDS.length) {
    listEl.innerHTML = `<div style="padding:30px;color:var(--text3)">No brands yet — click "+ Create Brand" to add the first one.</div>`;
    return;
  }

  // Fetch accounts for every brand in parallel using the SECURITY DEFINER
  // function that can safely join auth.users (not accessible directly via anon key)
  const accountsByBrand = {};
  await Promise.all(PLATFORM_BRANDS.map(async b => {
    const { data: accounts } = await sb.rpc('get_brand_accounts', { p_brand_id: b.id });
    accountsByBrand[b.id] = accounts || [];
  }));

  listEl.innerHTML = PLATFORM_BRANDS.map(b => {
    const accounts = accountsByBrand[b.id] || [];
    const roleOrder = { franchisor: 0, franchisee: 1, customer: 2 };
    const sorted = [...accounts].sort((a,b) => (roleOrder[a.role]??9) - (roleOrder[b.role]??9));

    const accountRows = sorted.length
      ? sorted.map(a => `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border2);">
          <div style="width:22px;height:22px;border-radius:50%;background:var(--bg4);display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;">
            ${a.role==='franchisor'?'👑':a.role==='franchisee'?'🏪':'👤'}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:600;">${a.full_name||'—'} <span style="font-size:10px;color:var(--text3);font-weight:400;">${a.role}</span>${a.outlet_name?` <span style="font-size:10px;color:var(--text3);">· ${a.outlet_name}</span>`:''}</div>
            <div style="font-size:11px;color:var(--text3);font-family:var(--font-mono);">${a.email}</div>
          </div>
        </div>`).join('')
      : `<div style="font-size:12px;color:var(--text3);padding:8px 0;">No accounts yet — generate a franchisor invite to get started.</div>`;

    return `
    <div style="border-bottom:1px solid var(--border);padding:14px 0;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:36px;height:36px;border-radius:8px;overflow:hidden;flex-shrink:0;background:${b.primary_color||'#8B1A1A'};display:flex;align-items:center;justify-content:center;">
          ${b.logo_url ? `<img src="${b.logo_url}" style="width:100%;height:100%;object-fit:cover">` : `<span style="color:white;font-weight:700;font-size:14px;">${(b.name||'?').charAt(0).toUpperCase()}</span>`}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:14px;">${b.name}${!b.is_active?' <span style="color:var(--text3);font-size:11px;">(inactive)</span>':''}</div>
          <div style="font-size:11px;color:var(--text3);font-family:var(--font-mono);">/${b.slug}${b.contact_email?' · '+b.contact_email:''} · ${accounts.length} account${accounts.length===1?'':'s'}</div>
        </div>
        <button class="topbar-btn" style="font-size:11px;padding:4px 10px;" onclick="openPlatformInviteModal('${b.id}','${b.name.replace(/'/g,"\\'")}')">+ Franchisor Invite</button>
        <button class="topbar-btn" style="font-size:11px;padding:4px 10px;" onclick="toggleBrandActive('${b.id}', ${!b.is_active})">${b.is_active?'Deactivate':'Activate'}</button>
      </div>
      <div style="margin-top:10px;padding:0 4px;">
        <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Accounts</div>
        ${accountRows}
      </div>
    </div>`;
  }).join('');
}

function openCreateBrandModal() {
  document.getElementById('brand-name').value = '';
  document.getElementById('brand-slug').value = '';
  document.getElementById('brand-primary-color').value = '#8B1A1A';
  document.getElementById('brand-secondary-color').value = '#A52020';
  document.getElementById('brand-contact-email').value = '';
  openModal('modal-create-brand');
}

// Auto-suggests a URL-safe slug from the brand name as it's typed, but
// only while the slug field hasn't been hand-edited — same UX convention
// most platforms use so it doesn't fight a manual edit.
document.addEventListener('input', (e) => {
  if (e.target.id === 'brand-name') {
    const slugField = document.getElementById('brand-slug');
    if (slugField && !slugField.dataset.touched) {
      slugField.value = e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
  }
  if (e.target.id === 'brand-slug') {
    e.target.dataset.touched = 'true';
  }
});

async function createBrand() {
  const name = document.getElementById('brand-name').value.trim();
  const slug = document.getElementById('brand-slug').value.trim().toLowerCase();
  const primary_color = document.getElementById('brand-primary-color').value;
  const secondary_color = document.getElementById('brand-secondary-color').value;
  const contact_email = document.getElementById('brand-contact-email').value.trim() || null;

  if (!name || !slug) { showToast('Name and slug are required', '⚠️'); return; }
  if (!/^[a-z0-9-]+$/.test(slug)) { showToast('Slug can only contain lowercase letters, numbers, and hyphens', '⚠️'); return; }
  if (!sb) return;

  const btn = document.getElementById('brand-create-btn');
  btn.disabled = true; btn.textContent = 'Creating...';
  const { error } = await sb.from('brands').insert({ name, slug, primary_color, secondary_color, contact_email });
  btn.disabled = false; btn.textContent = 'Create Brand';

  if (error) {
    showToast(error.message.includes('duplicate') ? 'That slug is already taken' : 'Failed: ' + error.message, '⚠️');
    return;
  }
  closeModal('modal-create-brand');
  showToast(`${name} created ✓`, '🎉');
  loadPlatformBrands();
}

async function toggleBrandActive(id, newState) {
  const { error } = await sb.from('brands').update({ is_active: newState, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }
  showToast(newState ? 'Brand activated' : 'Brand deactivated', newState ? '✓' : '⏸');
  loadPlatformBrands();
}

function openPlatformInviteModal(brandId, brandName) {
  document.getElementById('platform-invite-brand-id').value = brandId;
  document.getElementById('platform-invite-brand-name').textContent = `Generates a one-time franchisor signup code for ${brandName}.`;
  document.getElementById('platform-invite-expires').value = '';
  document.getElementById('platform-invite-form-section').style.display = 'block';
  document.getElementById('platform-invite-form-footer').style.display = 'flex';
  document.getElementById('platform-invite-result-section').style.display = 'none';
  document.getElementById('platform-invite-result-footer').style.display = 'none';
  openModal('modal-platform-generate-invite');
}

async function generatePlatformFranchisorInvite() {
  const brand_id = document.getElementById('platform-invite-brand-id').value;
  const expiresInput = document.getElementById('platform-invite-expires').value;
  if (!brand_id || !sb) return;

  const btn = document.getElementById('platform-invite-generate-btn');
  btn.disabled = true; btn.textContent = 'Generating...';

  const code = generateRandomCode();
  const { error } = await sb.from('invite_codes').insert({
    code, role: 'franchisor', brand_id, outlet_id: null,
    expires_at: expiresInput ? new Date(expiresInput).toISOString() : null
  });

  btn.disabled = false; btn.textContent = 'Generate';
  if (error) { showToast('Failed: ' + error.message, '⚠️'); return; }

  // Show the code in a persistent result view instead of a toast that
  // disappears in a few seconds with no way to retrieve it afterward.
  document.getElementById('platform-invite-form-section').style.display = 'none';
  document.getElementById('platform-invite-form-footer').style.display = 'none';
  document.getElementById('platform-invite-result-code').textContent = code;
  document.getElementById('platform-invite-result-section').style.display = 'block';
  document.getElementById('platform-invite-result-footer').style.display = 'flex';
}

