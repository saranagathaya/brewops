// ══ SHARED HELPERS — used by two or more of the three apps ══
// Each of brewops-customer.html, brewops-franchisee-v2.html, and
// brewops-franchisor-v4.html relies on the same #toast/#toast-msg/#toast-icon
// markup and .modal-overlay convention, so these were previously copy-pasted
// (with minor drift — different timeouts, different fallback icons) into
// each file's inline <script>. Kept as one plain global-scope file (no
// module system in this project) rather than introducing a build step.

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('open');
  });
});

let toastT;
function showToast(msg, icon) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-icon').textContent = icon || '✓';
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 3000);
}

// ══ HTML ESCAPING ══
// Every list in this project is built with template literals assigned to
// innerHTML, so any value a *user typed* must pass through this first.
// Most interpolated text is staff-authored (menu item names, stock names)
// and was never a real risk, which is why no helper existed until now.
// Saved delivery addresses broke that assumption: label/address_line/
// city/notes are free text an anonymous customer types, and the franchisee
// order card renders them -- so unescaped markup there would execute
// inside an authenticated staff session holding that brand's RLS
// privileges, not merely the customer's own. Escape at the point of
// interpolation rather than sanitising on write, so the stored value stays
// exactly what the customer typed (a rider still needs to read it).
function escapeHtml(value) {
  const CHARS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, c => CHARS[c]);
}

// Google returns an Open Location Code ("plus code", e.g. "WXC2+2WF") as a
// place's address whenever the exact point picked has no street address on
// file -- common in Sri Lanka. It's precise but meaningless to a customer
// trying to find the café, so both the franchisor app (when a franchisor
// picks such a place) and the customer app (for outlets already saved with
// one) strip it with this same pattern. Anchored to the start; the
// alphabet excludes vowels and 0/1, so ordinary addresses never match.
const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3},?\s*/i;

// ══ GOOGLE MAPS CONFIG ══
// Used for Places Autocomplete on address fields: the franchisor's
// Add/Edit Outlet form (franchisor-cms.js) and the customer app's Address
// Manager form (brewops-customer.html) both search a real address instead
// of typing raw coordinates. Public by design like the Supabase key --
// Maps JS keys are meant to be client-visible; they're secured via HTTP
// referrer restriction in Google Cloud Console (scoped to qbrew.app +
// localhost for dev), not by hiding the key. Originally lived in
// franchisor-init.js only; moved here once the customer app needed the
// same loader, so both apps share one definition instead of two copies
// drifting apart (the same fix already applied to PLUS_CODE_RE above).
const GOOGLE_MAPS_API_KEY = 'AIzaSyDTAGMkWqxjszdA9Brt4IJMLt4JZyZyTUM';

let googleMapsLoadPromise = null;
function ensureGoogleMapsLoaded() {
  if (googleMapsLoadPromise) return googleMapsLoadPromise;
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) { resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
  return googleMapsLoadPromise;
}

// Prefers the place's own name (the café/landmark someone searched for) and
// strips a leading plus code off the address, so "WXC2+2WF, Malabe, Sri
// Lanka" becomes "Malabe, Sri Lanka" -- or, for a named place, "Liétard
// Malabe, Malabe, Sri Lanka". Shared by the franchisor's outlet Autocomplete
// and the customer app's address-form Autocomplete (both moved here for the
// same reason as the loader above -- one definition instead of two drifting
// copies).
function readablePlaceAddress(place) {
  const raw = (place.formatted_address || '').trim();
  const stripped = raw.replace(PLUS_CODE_RE, '').trim();
  const name = (place.name || '').trim();
  if (!name || PLUS_CODE_RE.test(name)) return stripped || raw;
  if (!stripped) return name;
  return stripped.toLowerCase().startsWith(name.toLowerCase()) ? stripped : name + ', ' + stripped;
}
