// Independent fallback player: works even if the Supabase library module cannot load.
document.addEventListener('click', event => {
 const dvd=event.target.closest('[data-theater-video-id]');
 if(!dvd)return;
 event.preventDefault();
 const id=dvd.dataset.theaterVideoId;
 if(!/^[a-zA-Z0-9_-]{11}$/.test(id))return;
 const embed=document.getElementById('theater-embed');
 const player=document.getElementById('theater-player');
 if(!embed||!player)return;
 player.pause();player.removeAttribute('src');player.load();player.hidden=true;
 embed.replaceChildren();
 const frame=document.createElement('iframe');
 frame.title=dvd.dataset.theaterTitle||'Movie';
 frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
 frame.allowFullscreen=true;
 frame.referrerPolicy='strict-origin-when-cross-origin';
 frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1';
 embed.append(frame);embed.hidden=false;
 document.getElementById('theater-status').textContent='▶ NOW PLAYING';
 document.getElementById('theater-now').textContent=dvd.dataset.theaterTitle||'Movie';
 document.getElementById('theater-marquee-label').textContent='NOW SHOWING';
 document.getElementById('theater-marquee-program').textContent=dvd.dataset.theaterTitle||'Movie';
 document.getElementById('theater-message').textContent='Playing inside the theater. YouTube embedding permissions may prevent playback.';
 document.querySelector('.cinema-screen-shell')?.scrollIntoView({behavior:'smooth',block:'center'});
});
