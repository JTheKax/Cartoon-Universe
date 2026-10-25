document.addEventListener('DOMContentLoaded', () => {
  const open = document.getElementById('maintenance-open');
  const panel = document.getElementById('maintenance-panel');
  const close = document.getElementById('maintenance-close');
  const preview = document.getElementById('maintenance-preview');
  const screen = document.getElementById('maintenance-preview-screen');
  const message = document.getElementById('maintenance-message');
  const output = document.getElementById('maintenance-preview-message');
  if (!open || !panel || !close || !preview || !screen || !message || !output) return;
  open.addEventListener('click', () => { panel.hidden = false; screen.hidden = true; panel.scrollIntoView({behavior:'smooth'}); });
  close.addEventListener('click', () => { panel.hidden = true; screen.hidden = true; open.focus(); });
  preview.addEventListener('click', () => { output.textContent = message.value.trim() || 'We will be back soon!'; screen.hidden = false; });
});
