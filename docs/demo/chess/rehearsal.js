// Creator-only playback controls; no app API or vote simulation.
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const clip=byId('clip'),hold=byId('hold'),card=byId('host-card'),audio=byId('host-audio');
  let phase='ready';
  function status(text){byId('status').textContent=text;}
  function controls(){byId('setup').disabled=phase!=='ready';byId('choice').disabled=phase!=='hold'||!byId('locked').checked;byId('reveal').disabled=phase!=='choice'||!audio.paused;}
  async function play(part){
    phase=part;card.hidden=true;hold.hidden=true;clip.hidden=false;clip.src=`/${part}.mp4`;controls();status(`Playing ${part}`);
    try{await clip.play();}catch{status('Playback blocked. Reset and click Play setup again.');}
  }
  byId('setup').onclick=()=>{if(phase==='ready')void play('setup');};
  clip.addEventListener('ended',()=>{
    if(phase==='setup'){phase='hold';clip.hidden=true;hold.hidden=false;status('Setup finished. Handle real chat and lock in Studio before the host choice.');}
    else{phase='done';status('Historical reveal finished. Stop OBS when the take is complete.');}
    controls();
  });
  byId('locked').onchange=controls;
  byId('choice').onclick=async()=>{
    if(phase!=='hold'||!byId('locked').checked)return;
    phase='choice';card.hidden=false;hold.hidden=true;clip.hidden=true;status('Coached host choice B shown; historical outcome has not played.');
    audio.currentTime=0;
    try{await audio.play();}catch{status('Host-choice audio blocked. Reset and retry before recording.');}
    controls();
  };
  audio.addEventListener('ended',controls);
  byId('reveal').onclick=()=>{if(phase==='choice'&&audio.paused)void play('reveal');};
  byId('reset').onclick=()=>{
    if(phase!=='ready'&&!confirm('Reset only this local player? This does not reset the Twitch round or stop OBS.'))return;
    clip.pause();audio.pause();clip.removeAttribute('src');clip.load();card.hidden=true;clip.hidden=true;hold.hidden=false;phase='ready';byId('locked').checked=false;controls();status('Ready for setup · no recording started');
  };
  controls();
})();
