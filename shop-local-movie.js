(()=>{
const input=document.getElementById('theater-local-video');
const video=document.getElementById('theater-player');
const idle=document.getElementById('theater-idle');
const close=document.getElementById('theater-clear-video');
const status=document.getElementById('theater-playback-status');
let objectUrl=null;
function reset(){video.pause();video.removeAttribute('src');video.load();if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;video.hidden=true;idle.hidden=false;close.disabled=true;input.value='';status.textContent='No local video selected.';}
input.addEventListener('change',()=>{
const file=input.files?.[0];if(!file){reset();return;}
if(!file.type.startsWith('video/')){reset();status.textContent='Please choose a video file.';return;}
video.pause();if(objectUrl)URL.revokeObjectURL(objectUrl);
objectUrl=URL.createObjectURL(file);video.src=objectUrl;video.hidden=false;idle.hidden=true;close.disabled=false;status.textContent='Ready to play: '+file.name+' (private browser preview).';
});
close.addEventListener('click',reset);
video.addEventListener('error',()=>{status.textContent='This browser cannot play the selected video format.';});
window.addEventListener('pagehide',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);});
})();
