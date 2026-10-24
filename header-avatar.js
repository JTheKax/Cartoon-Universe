import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const header = document.querySelector('.header');
if (header && SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 30) {
  const avatarLink = document.createElement('a');
  avatarLink.className = 'header-player-avatar';
  avatarLink.href = 'login.html';
  avatarLink.setAttribute('aria-label', 'Open my player profile');
  avatarLink.hidden = true;
  const face = document.createElement('span');
  face.className = 'header-player-avatar-face';
  const name = document.createElement('span');
  name.className = 'header-player-avatar-name';
  avatarLink.append(face, name);
  header.insertBefore(avatarLink, header.firstChild);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  async function refreshAvatar() {
    try {
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) { avatarLink.hidden = true; return; }
      const { data: profile } = await client.from('profiles')
        .select('username,display_name,avatar_color').eq('id', user.id).maybeSingle();
      const displayName = profile?.display_name?.trim() || profile?.username || 'Player';
      face.textContent = displayName.slice(0, 2).toUpperCase();
      face.style.backgroundColor = /^#[0-9a-fA-F]{6}$/.test(profile?.avatar_color || '')
        ? profile.avatar_color : '#ff4ca8';
      name.textContent = displayName;
      avatarLink.title = 'My profile: ' + displayName;
      avatarLink.hidden = false;
    } catch { avatarLink.hidden = true; }
  }
  client.auth.onAuthStateChange(() => setTimeout(refreshAvatar, 0));
  window.addEventListener('focus', refreshAvatar);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshAvatar(); });
  document.addEventListener('cartoon-profile-updated', refreshAvatar);
  refreshAvatar();
}
