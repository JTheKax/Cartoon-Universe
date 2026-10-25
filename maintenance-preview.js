document.addEventListener('DOMContentLoaded', () => {
  const open = document.getElementById('maintenance-open');
  const panel = document.getElementById('maintenance-panel');
  const close = document.getElementById('maintenance-close');
  const preview = document.getElementById('maintenance-preview');
  const screen = document.getElementById('maintenance-preview-screen');
  const message = document.getElementById('maintenance-message');
  const output = document.getElementById('maintenance-preview-message');
  const save = document.getElementById('maintenance-save');
  const toggle = document.getElementById('maintenance-toggle');
  const status = panel?.querySelector('[role="status"]');
  if (!open || !panel || !close || !preview || !screen || !message || !output || !save || !toggle || !status) return;
  open.addEventListener('click', () => { panel.hidden = false; screen.hidden = true; panel.scrollIntoView({behavior:'smooth'}); });
  close.addEventListener('click', () => { panel.hidden = true; screen.hidden = true; open.focus(); });
  preview.addEventListener('click', () => { output.textContent = message.value.trim() || 'We will be back soon!'; screen.hidden = false; });
  window.addEventListener('cartoon-owner-authorized', async ({detail:{client}}) => {
    const {data:settings,error} = await client.from('site_maintenance').select('enabled,message').eq('id',true).single();
    if (error) {status.textContent = 'Maintenance settings unavailable.';return;}
    let enabled = settings.enabled;
    message.value = settings.message;
    const refresh = () => {
      status.textContent = 'Maintenance setting: ' + (enabled ? 'ON (gateway not active)' : 'OFF');
      toggle.textContent = enabled ? 'Disable Maintenance' : 'Enable Maintenance (requires gateway)';
      toggle.disabled = !enabled;
    };
    refresh();
    const update = async (nextEnabled) => {
      save.disabled = toggle.disabled = true;
      const {data:{user}} = await client.auth.getUser();
      if (!user) {status.textContent='Session expired. Sign in again.';return;}
      const {data,error:updateError} = await client.from('site_maintenance').update({
        enabled:nextEnabled,message:message.value.trim() || 'We will be back soon!',
        updated_by:user.id,updated_at:new Date().toISOString()
      }).eq('id',true).select('enabled,message').single();
      if(updateError){status.textContent='Save failed: '+updateError.message;save.disabled=toggle.disabled=false;return;}
      enabled=data.enabled;message.value=data.message;save.disabled=false;refresh();
    };
    save.addEventListener('click',()=>update(enabled));
    toggle.addEventListener('click',()=> {
      if(!enabled && !window.confirm('This saves maintenance ON in the database, but it does NOT block visitors until a secure gateway is installed. Continue?')) return;
      update(!enabled);
    });
  },{once:true});
});
