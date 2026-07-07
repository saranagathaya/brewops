// ══ SHARED HELPERS — modal open/close and toast, used by all three apps ══
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
