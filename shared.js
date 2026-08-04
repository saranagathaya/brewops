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

// ══ ADDRESS AUTOCOMPLETE ══
// There is deliberately NO Google API key in this file, or anywhere else a
// browser can reach. Both address fields (the franchisor's Add/Edit Outlet
// form and the customer's Address Manager) used to run
// google.maps.places.Autocomplete client-side, which forces the key into
// public source -- and a Maps key can only be defended by HTTP referrer
// restriction, which the client itself sets. Lookups now go through the
// `places-proxy` edge function, which holds a server-side key that no
// browser ever sees. Autocomplete was the only thing either app used the
// Maps JS API for, so nothing else had to move: outlet distance is local
// Haversine maths, and "View on map" is a plain google.com/maps/search
// deep link. Neither needs a key.
//
// attachPlacesAutocomplete() renders its own suggestion list rather than
// using Google's widget, since the widget can only work with a key in the
// page. onPick receives {name, formatted_address, lat, lng} -- the same
// shape the old client-side place object had, so readablePlaceAddress()
// below still consumes it unchanged.
const PLACES_MIN_CHARS = 3;
const PLACES_DEBOUNCE_MS = 250;

function attachPlacesAutocomplete(input, onPick) {
  if (!input || input.dataset.placesAttached) return;
  input.dataset.placesAttached = '1';
  input.setAttribute('autocomplete', 'off');

  const parent = input.parentElement;
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  const list = document.createElement('div');
  list.className = 'places-suggest';
  list.hidden = true;
  parent.appendChild(list);

  // One Google billing "session" spans the keystrokes of a single lookup
  // plus the details fetch for whatever gets picked. Held here and cleared
  // after each pick so the next lookup starts a fresh one.
  let sessionToken = null;
  let debounce = null;
  let seq = 0;

  const hide = () => { list.hidden = true; list.innerHTML = ''; };

  async function call(body) {
    if (typeof sb === 'undefined' || !sb) throw new Error('Not connected');
    const { data, error } = await sb.functions.invoke('places-proxy', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(debounce);
    if (q.length < PLACES_MIN_CHARS) { hide(); return; }
    debounce = setTimeout(async () => {
      const mine = ++seq;   // ignore responses that arrive out of order
      if (!sessionToken) sessionToken = crypto.randomUUID();
      try {
        const { suggestions } = await call({ action: 'autocomplete', input: q, sessionToken });
        if (mine !== seq) return;
        if (!suggestions?.length) { hide(); return; }
        list.innerHTML = suggestions
          .map(s => `<button type="button" class="places-suggest-item" data-place-id="${escapeHtml(s.placeId)}">${escapeHtml(s.description)}</button>`)
          .join('');
        list.hidden = false;
      } catch (e) {
        console.error('Places lookup failed:', e.message);
        hide();
      }
    }, PLACES_DEBOUNCE_MS);
  });

  list.addEventListener('mousedown', async (e) => {
    // mousedown, not click: the input's blur would tear the list down first.
    const btn = e.target.closest('.places-suggest-item');
    if (!btn) return;
    e.preventDefault();
    const placeId = btn.dataset.placeId;
    hide();
    try {
      const place = await call({ action: 'details', placeId, sessionToken });
      sessionToken = null;
      onPick(place);
    } catch (err) {
      console.error('Place details failed:', err.message);
    }
  });

  input.addEventListener('blur', () => setTimeout(hide, 120));
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
}

// Prefers the place's own name (the café/landmark someone searched for) and
// strips a leading plus code off the address, so "WXC2+2WF, Malabe, Sri
// Lanka" becomes "Malabe, Sri Lanka" -- or, for a named place, "Liétard
// Malabe, Malabe, Sri Lanka". Shared by the franchisor's outlet form and
// the customer app's address form (one definition instead of two drifting
// copies).
function readablePlaceAddress(place) {
  const raw = (place.formatted_address || '').trim();
  const stripped = raw.replace(PLUS_CODE_RE, '').trim();
  const name = (place.name || '').trim();
  if (!name || PLUS_CODE_RE.test(name)) return stripped || raw;
  if (!stripped) return name;
  return stripped.toLowerCase().startsWith(name.toLowerCase()) ? stripped : name + ', ' + stripped;
}
