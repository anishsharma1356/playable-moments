// Generate a separate import; never edit an active OBS collection/profile.
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const base={prev_ver:553648128,mixers:1,sync:0,flags:0,volume:1,balance:0.5,enabled:true,muted:false,hotkeys:{},deinterlace_mode:0,deinterlace_field_order:0,monitoring_type:0,private_settings:{}};
const stage={...base,name:'Opera decision — Interact to play clips',uuid:randomUUID(),id:'browser_source',versioned_id:'browser_source',settings:{url:'http://127.0.0.1:5194/',width:1280,height:1000,fps:30,reroute_audio:true,shutdown:false,restart_when_active:false,css:'body{margin:0;overflow:hidden}'}};
const name='Opera decision — independent reconstruction';
const scene={...base,name,uuid:randomUUID(),id:'scene',versioned_id:'scene',mixers:0,settings:{id_counter:1,custom_size:false,items:[{name:stage.name,source_uuid:stage.uuid,visible:true,locked:true,rot:0,pos:{x:0,y:0},scale:{x:1.5,y:1.5},align:5,bounds_type:0,bounds_align:0,bounds:{x:0,y:0},crop_left:0,crop_top:0,crop_right:0,crop_bottom:280,id:1,scale_filter:'disable',blend_method:'default',blend_type:'normal'}]}};
const mic={...base,name:'Microphone — muted for coached rehearsal',uuid:randomUUID(),id:'wasapi_input_capture',versioned_id:'wasapi_input_capture',settings:{device_id:'default'},muted:true};
const collection={name:'Playable Moments — Opera Chess',version:2,sources:[stage,scene],groups:[],scene_order:[{name}],current_scene:name,current_program_scene:name,current_transition:'Fade',transition_duration:300,transitions:[],canvases:[],AuxAudioDevice1:mic,preview_locked:true,modules:{'scripts-tool':[]}};
await mkdir(new URL('../data/obs/',import.meta.url),{recursive:true});
await writeFile(new URL('../data/obs/Playable-Moments-Opera-Chess.json',import.meta.url),JSON.stringify(collection,null,2)+'\n');
console.log('Prepared separate OBS import: data/obs/Playable-Moments-Opera-Chess.json. Start the local chess rehearsal server before importing. No stream credentials, recording or broadcast action.');
