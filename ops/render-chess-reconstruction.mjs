// Offline authoring tool only. Does not connect to the app, Twitch or OBS.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const root=process.cwd(), source=resolve(root,'docs/demo/chess'), out=resolve(root,'data/chess-reconstruction');
const ffmpeg=resolve(root,'.tools/ffmpeg-extracted/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe');
const ffprobe=resolve(root,'.tools/ffmpeg-extracted/ffmpeg-9.0.2-essentials_build/bin/ffprobe.exe');
await mkdir(out,{recursive:true});
const content=JSON.parse(await readFile(join(source,'content.json'),'utf8'));
const pgn=await readFile(join(source,'opera-game.pgn'),'utf8');
const require=createRequire(import.meta.url);
const {Chess}=require(join(out,'verification/package/dist/cjs/chess.js'));
const packageInfo=JSON.parse(await readFile(join(out,'verification/package/package.json'),'utf8'));
assert.equal(packageInfo.version,'1.4.0');
const board=new Chess(); board.loadPgn(pgn);
assert.equal(board.history().length,33); assert.ok(board.isCheckmate());
const sequence=board.history(); board.reset();
const verified=[];
for(let i=0;i<sequence.length;i++){
  const move=board.move(sequence[i]);
  if(i>=29)verified.push({ply:i+1,san:move.san,fen:board.fen(),legalReplies:board.moves(),check:board.isCheck(),checkmate:board.isCheckmate()});
}
for(const [i,key] of ['setup','queen','knight','mate'].entries())assert.equal(verified[i].fen,content.states[key]);
assert.deepEqual(verified[1].legalReplies,['Nxb8']);
assert.equal(new Chess(content.states.setup).move('Qb5').san,'Qb5');
assert.ok(new Chess(content.states.mate).isAttacked('d8','w'));
assert.ok(new Chess(content.states.mate).isAttacked('e7','w'));
assert.equal(content.creatorChoice,null);assert.equal(content.resolvedAnswer,null);
assert.ok(content.outcomeSummary.length<=500);
console.log('PASS: full 33-ply score, both options legal, exact FENs, forced knight capture and checkmate.');
await writeFile(join(source,'scene-data.js'),'// Generated from content.json by the offline authoring tool.\nwindow.ChessDemo.setContent('+JSON.stringify(content,null,2)+');\n');
function run(exe,args){const r=spawnSync(exe,args,{encoding:'utf8',windowsHide:true,maxBuffer:5*1024*1024});if(r.status!==0)throw new Error(r.stderr||r.error?.message||`${exe} exited ${r.status}`);return r.stdout;}
const probe=file=>JSON.parse(run(ffprobe,['-v','error','-show_streams','-show_format','-of','json',file]));
const voiceScript=join(out,'make-review-voice.ps1');
await writeFile(voiceScript,`param([string]$ContentPath,[string]$OutputPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$content=Get-Content -LiteralPath $ContentPath -Raw -Encoding UTF8 | ConvertFrom-Json
$voice=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
 $voice.SelectVoice('Microsoft Zira Desktop')
 $voice.Rate=0
 $voice.Volume=100
 foreach($cue in $content.cues) {
  $voice.SetOutputToWaveFile((Join-Path $OutputPath ($cue.id + '.wav')))
  $voice.Speak($cue.speech)
  $voice.SetOutputToNull()
 }
} finally { $voice.Dispose() }
`);
run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',voiceScript,'-ContentPath',join(source,'content.json'),'-OutputPath',out]);
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,serviceWorkers:'block'});
const page=await context.newPage(), errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));
await context.route(/^https?:\/\//,route=>{external.push(route.request().url());return route.abort();});
const cues=[];
try{
 await page.goto(pathToFileURL(join(source,'scene.html')).href);
 await page.waitForFunction(()=>document.querySelector('#scene svg'));
 for(const cue of content.cues){
  await page.evaluate(c=>window.ChessDemo.renderFrame(c),cue);
  const svg=await page.locator('#scene').innerText();
  assert.ok(svg.includes(content.disclosure));
  if(cue.part==='setup')assert.ok(!/checkmate|Nxb8|Rd8#|Morphy played/i.test(svg));
  const image=join(out,`${cue.id}.png`);
  await page.locator('#scene').screenshot({path:image});
  const audioSeconds=Number(probe(join(out,`${cue.id}.wav`)).format.duration);
  // Three-frame steps at 30fps give exact 100ms Studio-compatible boundaries.
  const frames=Math.ceil(Math.max(cue.minimumSeconds,audioSeconds+1.1)*10)*3;
  cues.push({...cue,audioSeconds,frames,seconds:frames/30});
 }
 await page.getByRole('button',{name:'Reset to setup'}).click();
 assert.ok((await page.locator('#scene').innerText()).includes('YOUR TURN'));
 await page.getByRole('button',{name:'Play historical reveal'}).click();
 assert.ok((await page.locator('#scene').innerText()).includes('THE HISTORICAL MOVE'));
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 await page.getByRole('button',{name:'Reset to setup'}).click();
 assert.ok(!(await page.locator('#scene').innerText()).includes('checkmate'));
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{await browser.close();}
const encodeBase=['-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r','30','-c:a','pcm_s16le','-ar','48000','-ac','2'];
for(const cue of cues){
 run(ffmpeg,['-y','-hide_banner','-loglevel','error','-loop','1','-framerate','30','-i',join(out,`${cue.id}.png`),'-i',join(out,`${cue.id}.wav`),'-af','adelay=300:all=1,loudnorm=I=-16:TP=-1.5:LRA=11,apad','-t',String(cue.seconds),...encodeBase,join(out,`${cue.id}.mov`)]);
 console.log(`Rendered ${cue.id}: ${cue.seconds.toFixed(3)}s`);
}
const silent=(id,image,seconds)=>run(ffmpeg,['-y','-hide_banner','-loglevel','error','-loop','1','-framerate','30','-i',join(out,image),'-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t',String(seconds),...encodeBase,join(out,`${id}.mov`)]);
silent('lead','setup-1.png',3);silent('decision-gap','setup-3.png',2);silent('tail','reveal-5.png',3);
const ordered=['lead',...cues.filter(c=>c.part==='setup').map(c=>c.id),'decision-gap',...cues.filter(c=>c.part==='reveal').map(c=>c.id),'tail'];
const concat=join(out,'master.ffconcat');
await writeFile(concat,'ffconcat version 1.0\n'+ordered.map(id=>`file '${id}.mov'`).join('\n')+'\n');
const master=join(out,'opera-preparation-master.mp4');
run(ffmpeg,['-y','-hide_banner','-loglevel','error','-f','concat','-safe','1','-i',concat,'-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',master]);
const setupFrames=cues.filter(c=>c.part==='setup').reduce((n,c)=>n+c.frames,0),revealFrames=cues.filter(c=>c.part==='reveal').reduce((n,c)=>n+c.frames,0);
const setupMs=setupFrames/3*100,revealMs=revealFrames/3*100;
const bounds={setupStartMs:3000,setupEndMs:3000+setupMs,revealStartMs:5000+setupMs,revealEndMs:5000+setupMs+revealMs};
assert.ok(Object.values(bounds).every(Number.isInteger));
const stamp=ms=>new Date(Math.round(ms)).toISOString().slice(11,23);
const outputs=[];
for(const part of ['setup','reveal']){
 const start=bounds[`${part}StartMs`]/1000,seconds=(bounds[`${part}EndMs`]-bounds[`${part}StartMs`])/1000;
 const file=join(out,`${part}.mp4`);
 run(ffmpeg,['-y','-hide_banner','-loglevel','error','-ss',String(start),'-i',master,'-t',String(seconds),'-vf','scale=1280:720,setsar=1','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r','30','-c:a','aac','-ar','48000','-ac','2','-b:a','192k','-movflags','+faststart',file]);
 run(ffmpeg,['-v','error','-i',file,'-f','null','-']);
 const info=probe(file),v=info.streams.find(s=>s.codec_type==='video'),a=info.streams.find(s=>s.codec_type==='audio');
 assert.equal(v.width,1280);assert.equal(v.height,720);assert.equal(v.codec_name,'h264');assert.equal(a.codec_name,'aac');
 assert.ok(Math.abs(Number(v.duration)-seconds)<1/30+.001);
 let cursor=0,vtt='WEBVTT\n\n';
 for(const cue of cues.filter(c=>c.part===part)){
  vtt+=`${stamp(cursor+300)} --> ${stamp(cursor+300+cue.audioSeconds*1000)}\n${cue.caption}\n\n`;cursor+=cue.seconds*1000;
 }
 await writeFile(join(source,`${part}.vtt`),vtt);
 await writeFile(join(source,`${part}-text.txt`),content[`${part}Transcript`]+'\n');
 outputs.push({file:`data/chess-reconstruction/${part}.mp4`,sha256:createHash('sha256').update(await readFile(file)).digest('hex'),videoDuration:Number(v.duration),audioDuration:Number(a.duration),width:v.width,height:v.height,decoded:true});
 console.log(`Verified ${part}.mp4: ${v.duration}s H.264/AAC`);
}
const masterInfo=probe(master);
assert.ok(Math.abs(Number(masterInfo.streams.find(s=>s.codec_type==='video').duration)-(8+(setupFrames+revealFrames)/30))<.04);
const report={prepared:'2026-10-31',status:'AWAITING HUMAN REVIEW; not a Twitch session or approved release',validator:'chess.js 1.4.0, private build-time use only',plies:33,verifiedStates:verified,alternativeLegal:'Qb5',creatorChoice:null,liveVotes:null,resolvedAnswer:null,sourceReferences:['https://www.chesshistory.com/winter/extra/morphy.html','https://www.chessgames.com/njs/api/game/viewPGN/1233404'],speech:'Original script; synthetic Microsoft Zira Desktop review narration; no music',cues:cues.map(({id,part,state,audioSeconds,frames,seconds})=>({id,part,state,audioSeconds,frames,seconds})),preparationMasterOnly:bounds,boundaryNote:'These measured preparation-master offsets must NOT be reused for a future OBS/Twitch recording.',outputs,previewChecks:{pageErrors:errors,externalRequests:external,setupContainsNoResult:true,resetToSetup:true},humanReview:'PENDING'};
await writeFile(join(source,'verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'Prepared; human review pending',bounds,outputs},null,2));
