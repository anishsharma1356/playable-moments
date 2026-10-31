/* Original, fixed historical reconstruction. No chess engine, API or network. */
(() => {
  'use strict';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  let content, timeline = [], current = 0, timer, paused = true;
  const icon = {
    p: '<circle cx="32" cy="19" r="9"/><path d="M27 28 Q28 39 22 46 L42 46 Q36 39 37 28 Z"/><path d="M19 47 H45 L48 55 H16 Z"/>',
    r: '<path d="M16 12 H23 V20 H29 V12 H35 V20 H41 V12 H48 V29 L41 34 V46 H23 V34 L16 29 Z"/><path d="M20 46 H44 L48 55 H16 Z"/>',
    n: '<path d="M20 47 Q18 37 34 29 L23 33 L16 28 L24 15 L36 10 L39 17 Q52 27 45 47 Z"/><path d="M19 47 H46 L49 55 H15 Z"/><circle cx="31" cy="22" r="2.5" fill="currentColor" stroke="none"/>',
    b: '<path d="M32 9 C46 21 46 29 35 33 L40 46 H24 L29 33 C18 29 18 21 32 9 Z"/><path d="M34 15 L27 27" fill="none"/><path d="M19 47 H45 L48 55 H16 Z"/>',
    q: '<path d="M16 22 L25 32 L32 18 L39 32 L48 22 L43 44 H21 Z"/><circle cx="16" cy="18" r="4"/><circle cx="32" cy="14" r="4"/><circle cx="48" cy="18" r="4"/><path d="M21 45 H43 L48 55 H16 Z"/>',
    k: '<path d="M29 6 H35 V12 H41 V18 H35 V24 H29 V18 H23 V12 H29 Z" stroke-width="1.4"/><path d="M32 24 C18 15 12 31 23 40 L25 46 H39 L41 40 C52 31 46 15 32 24 Z"/><path d="M21 47 H43 L48 55 H16 Z"/>'
  };
  const point = square => [100 + (square.charCodeAt(0)-97)*86 + 43, 172+(8-Number(square[1]))*86+43];
  const line = (from,to,color='#ffca76') => {
    const [x1,y1]=point(from),[x2,y2]=point(to),dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
    const ex=x2-ux*24,ey=y2-uy*24;
    return `<path d="M${x1+ux*22} ${y1+uy*22} L${ex} ${ey}" stroke="${color}" stroke-width="9" stroke-linecap="round" opacity=".82"/><path d="M${ex+ux*15} ${ey+uy*15} L${ex-ux*11-uy*12} ${ey-uy*11+ux*12} L${ex-ux*11+uy*12} ${ey-uy*11-ux*12} Z" fill="${color}"/>`;
  };
  const words = (text,x,y,size=32,color='#c8d1e0',lineHeight=size*1.35) => text.split('\n').map((v,i)=>`<text x="${x}" y="${y+i*lineHeight}" fill="${color}" font-size="${size}">${escape(v)}</text>`).join('');
  function render(cue) {
    if (!content) return;
    const setup = cue.part==='setup';
    const positions = content.states[cue.state].split(' ')[0].split('/');
    let board='';
    const highlights = setup ? [] : cue.state==='queen' ? ['b3','b8'] : cue.state==='knight' ? ['d7','b8'] : ['d1','d8'];
    for(let row=0;row<8;row++) for(let col=0;col<8;col++) {
      const square=String.fromCharCode(97+col)+(8-row);
      board+=`<rect x="${100+col*86}" y="${172+row*86}" width="86" height="86" fill="${(row+col)%2?'#668b8a':'#e7dac2'}"/>`;
      if(highlights.includes(square)) board+=`<rect x="${103+col*86}" y="${175+row*86}" width="80" height="80" fill="#ffc46b" opacity=".45" stroke="#80521a" stroke-width="4"/>`;
    }
    positions.forEach((rank,row)=>{let col=0;for(const p of rank){if(/\d/.test(p)){col+=Number(p);continue;}const white=p===p.toUpperCase();board+=`<g transform="translate(${100+col*86+8},${172+row*86+6}) scale(1.1)" fill="${white?'#fff7e4':'#172333'}" stroke="${white?'#243143':'#eddfc5'}" color="${white?'#243143':'#eddfc5'}" stroke-width="2.3" stroke-linejoin="round">${icon[p.toLowerCase()]}</g>`;col++;}});
    for(let i=0;i<8;i++){board+=words(String(8-i),68,223+i*86,24);board+=words(String.fromCharCode(97+i),132+i*86,894,24);}
    if(!setup) board+=cue.id==='reveal-4'?line('g5','d8','#bb9cff'):cue.state==='queen'?line('b3','b8'):cue.state==='knight'?line('d7','b8'):line('d1','d8');
    let panel='';
    if(setup){
      panel+=words('YOUR TURN · WHITE TO MOVE',880,186,25,'#c5acff');
      panel+=words('Would you offer\nyour queen?',880,272,65,'#f7f3ed',76);
      panel+=words('Two legal moves.\nMake your prediction before the reveal.',880,424,32);
      [['A','Offer the queen','Qb8+',535],['B','Keep the queen','Qb5',666]].forEach(([id,label,move,y])=>{panel+=`<rect x="880" y="${y-47}" width="940" height="108" rx="17" fill="#192338" stroke="#586782" stroke-width="2"/>`;panel+=words(id,914,y+19,39,'#c5acff')+words(label,987,y+17,37,'#f7f3ed')+words(move,1620,y+17,37,'#ffce83');});
    }else{
      const config = cue.state==='queen'?['THE HISTORICAL MOVE','The queen is offered.','16. Qb8+','The queen moves from b3 to b8.\nBlack is in check.']:cue.state==='knight'?['THE REPLY','The knight is drawn away.','16… Nxb8','The knight captures on b8.\nThe d7 square is now clear.']:cue.id==='reveal-4'?['WHY IT WORKS','The pieces work together.','Bishop + rook','The bishop protects d8\nand covers the escape square e7.']:cue.id==='reveal-5'?['TAKEAWAY','Look beyond material.','Coordination wins','A queen is powerful.\nHere, the whole position matters more.']:['THE RECORDED FINISH','The rook delivers mate.','17. Rd8#','The open d-file lets the rook reach d8.\nBlack has no legal reply.'];
      panel+=words(config[0],880,186,25,'#c5acff')+words(config[1],880,282,48,'#f7f3ed')+words(config[2],880,440,82,'#ffce83')+words(config[3],880,555,34);
      panel+=words('Historical action ≠ host prediction',880,718,28,'#a5b6cc');
    }
    panel+=`<rect x="880" y="794" width="940" height="143" rx="14" fill="#172033"/>`+words(cue.caption,908,cue.caption.includes('\n')?842:874,31,'#ffffff',43);
    document.getElementById('scene').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" font-family="Arial, sans-serif"><rect width="1920" height="1080" fill="#0c1322"/><rect x="0" width="1920" height="8" fill="#b99aff"/>${words('PLAYABLE MOMENTS',64,65,30,'#f3ecff')}${words('THE OPERA DECISION',1400,65,25,'#aabbd1')}<path d="M64 101 H1856" stroke="#2c3b52" stroke-width="2"/>${words(setup?'A historical position. Your prediction.':'A reconstruction of the historical sequence.',100,139,23)}${board}${panel}${words('Q = queen  ·  R = rook  ·  N = knight',100,938,24)}${words(content.credit,100,987,25,'#c3cddb')}<path d="M64 1009 H1856" stroke="#2c3b52"/>${words(content.disclosure,100,1050,26,'#b8c6d8')}</svg>`;
    document.getElementById('status').textContent=setup?'Setup only · no result shown':`Historical reconstruction · ${cue.id}`;
  }
  function pause(){clearTimeout(timer);paused=true;document.getElementById('pause').textContent='Resume';}
  function step(){render(timeline[current]);if(!paused)timer=setTimeout(()=>{if(current+1<timeline.length){current++;step();}else pause();},(timeline[current].minimumSeconds||5)*1000);}
  function setup(){pause();current=0;render(content.cues[0]);}
  window.ChessDemo={setContent(value){content=value;timeline=value.cues.filter(c=>c.part==='reveal');setup();},renderFrame(cue){pause();render(cue);}};
  document.getElementById('setup').onclick=setup;
  document.getElementById('reset').onclick=setup;
  document.getElementById('reveal').onclick=()=>{pause();current=0;paused=false;document.getElementById('pause').textContent='Pause';step();};
  document.getElementById('pause').onclick=()=>{if(paused){paused=false;document.getElementById('pause').textContent='Pause';step();}else pause();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
})();
