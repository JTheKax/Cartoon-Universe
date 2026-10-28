// Generic DVD drafts have been retired. Remove saved drafts on the owner-dashboard origin.
// The Dark Side of the Ring episode library uses a different storage key and is preserved.
try { localStorage.removeItem('cartoon-universe-theater-youtube-drafts-v1'); } catch {}
const form=document.getElementById('owner-youtube-form');
if(form)form.hidden=true;
const list=document.getElementById('owner-youtube-drafts');if(list)list.replaceChildren();
const status=document.getElementById('owner-youtube-status');if(status)status.textContent='Generic DVD drafts have been removed.';
