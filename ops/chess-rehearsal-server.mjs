// Loopback-only creator playback. No application database, credentials or commands.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const port=5194;
const files=[['/','text/html; charset=utf-8','../docs/demo/chess/rehearsal.html'],['/rehearsal.js','text/javascript; charset=utf-8','../docs/demo/chess/rehearsal.js'],['/hold.png','image/png','../data/chess-reconstruction/setup-last-encoded.png'],['/setup.mp4','video/mp4','../data/chess-reconstruction/setup.mp4'],['/reveal.mp4','video/mp4','../data/chess-reconstruction/reveal.mp4'],['/host-choice.m4a','audio/mp4','../data/chess-reconstruction/host-choice.m4a']];
const assets=new Map(await Promise.all(files.map(async([route,type,file])=>[route,{type,body:await readFile(new URL(file,import.meta.url))}])));
const server=createServer((req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self'; media-src 'self'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){res.writeHead(403);res.end('Invalid host');return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  if(req.url==='/health'){res.writeHead(200,{'Content-Type':'text/plain'});res.end(req.method==='HEAD'?undefined:'Chess creator player ready');return;}
  const asset=assets.get(req.url);if(!asset){res.writeHead(404);res.end('Not found');return;}
  const total=asset.body.length;let start=0,end=total-1,status=200;
  if(req.headers.range){const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!match){res.writeHead(416,{'Content-Range':`bytes */${total}`});res.end();return;}
    start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),total-1):total-1;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=total){res.writeHead(416,{'Content-Range':`bytes */${total}`});res.end();return;}
    status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${total}`);
  }
  res.writeHead(status,{'Content-Type':asset.type,'Content-Length':end-start+1,'Accept-Ranges':'bytes'});res.end(req.method==='HEAD'?undefined:asset.body.subarray(start,end+1));
});
server.listen(port,'127.0.0.1',()=>console.log(`Chess creator player: http://127.0.0.1:${port}/ — no recording, broadcast or Twitch round started.`));
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
