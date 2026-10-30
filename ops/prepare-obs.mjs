// Build an importable OBS scene collection; never edit a running OBS profile.
// The generated collection contains a private overlay URL and stays in data/.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const root = process.cwd();
const destination = path.join(root, 'data', 'obs');
const { url } = JSON.parse(fs.readFileSync(path.join(destination, 'overlay.json'), 'utf8'));
if (!/^http:\/\/localhost:5173\/overlay\/[A-Za-z0-9_-]+$/.test(url)) throw new Error('Expected the local OBS overlay URL.');
const base = { prev_ver: 553648128, mixers: 1, sync: 0, flags: 0, volume: 1, balance: .5, enabled: true, muted: false, hotkeys: {}, deinterlace_mode: 0, deinterlace_field_order: 0, monitoring_type: 0, private_settings: {} };
const source = (name, settings) => ({ ...base, name, uuid: randomUUID(), id: 'browser_source', versioned_id: 'browser_source', settings });
const stage = source('Colour choice — Interact: A / B / Space', { is_local_file: true, local_file: path.join(root,'docs','demo','colour-choice.html').replaceAll('\\','/'), width:1920, height:1080, fps:30, reroute_audio:true, shutdown:false, restart_when_active:false, css:'body { margin: 0; overflow: hidden; }' });
const overlay = source('Playable Moments — private live overlay', { url, width:700, height:1080, fps:30, reroute_audio:true, shutdown:false, restart_when_active:false, css:'body { background-color: rgba(0,0,0,0); margin:0; overflow:hidden; }' });
overlay.muted = true;
const item = (s,id,x) => ({ name:s.name, source_uuid:s.uuid, visible:true, locked:true, rot:0, pos:{x,y:0}, scale:{x:1,y:1}, align:5, bounds_type:0, bounds_align:0, bounds:{x:0,y:0}, crop_left:0,crop_top:0,crop_right:0,crop_bottom:0,id,scale_filter:'disable',blend_method:'default',blend_type:'normal' });
const sceneName = 'Playable Moments — recorded choice';
const scene = { ...base, name:sceneName,uuid:randomUUID(),id:'scene',versioned_id:'scene',mixers:0,settings:{id_counter:2,custom_size:false,items:[item(stage,1,0),item(overlay,2,1180)]} };
const mic = { ...base, name:'Mic — unmute when ready', uuid:randomUUID(),id:'wasapi_input_capture',versioned_id:'wasapi_input_capture',settings:{device_id:'default'},muted:true };
const collection = { name:'Playable Moments',version:2,sources:[stage,overlay,scene],groups:[],scene_order:[{name:sceneName}],current_scene:sceneName,current_program_scene:sceneName,current_transition:'Fade',transition_duration:300,transitions:[],canvases:[],AuxAudioDevice1:mic,preview_locked:true,modules:{'scripts-tool':[]} };
fs.mkdirSync(path.join(destination,'recordings'),{recursive:true});
fs.writeFileSync(path.join(destination,'Playable-Moments.json'), JSON.stringify(collection,null,2));
console.log('Prepared private OBS collection in data/obs/Playable-Moments.json. No stream credentials included.');
