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

// Google returns an Open Location Code ("plus code", e.g. "WXC2+2WF") as a
// place's address whenever the exact point picked has no street address on
// file -- common in Sri Lanka. It's precise but meaningless to a customer
// trying to find the café, so both the franchisor app (when a franchisor
// picks such a place) and the customer app (for outlets already saved with
// one) strip it with this same pattern. Anchored to the start; the
// alphabet excludes vowels and 0/1, so ordinary addresses never match.
const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3},?\s*/i;
