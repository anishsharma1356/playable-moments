// Creates a separate import file, never changes an active OBS profile or stream settings.
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
const destination = new URL("../data/obs/", import.meta.url);
const base = {
  prev_ver: 553648128,
  mixers: 1,
  sync: 0,
  flags: 0,
  volume: 1,
  balance: 0.5,
  enabled: true,
  muted: false,
  hotkeys: {},
  deinterlace_mode: 0,
  deinterlace_field_order: 0,
  monitoring_type: 0,
  private_settings: {},
};
const stage = {
  ...base,
  name: "Shortcut or Safety — creator controls in Interact",
  uuid: randomUUID(),
  id: "browser_source",
  versioned_id: "browser_source",
  settings: {
    url: "http://127.0.0.1:5190/",
    width: 1280,
    height: 900,
    fps: 60,
    reroute_audio: true,
    shutdown: false,
    restart_when_active: false,
    css: "body{margin:0;overflow:hidden}#capture{width:1280px;height:720px;margin:0}.operator{position:absolute;top:720px;left:0;width:1280px;height:180px}",
  },
};
const sceneName = "Shortcut or Safety — original game";
const scene = {
  ...base,
  name: sceneName,
  uuid: randomUUID(),
  id: "scene",
  versioned_id: "scene",
  mixers: 0,
  settings: {
    id_counter: 1,
    custom_size: false,
    items: [
      {
        name: stage.name,
        source_uuid: stage.uuid,
        visible: true,
        locked: true,
        rot: 0,
        pos: { x: 0, y: 0 },
        scale: { x: 1.5, y: 1.5 },
        align: 5,
        bounds_type: 0,
        bounds_align: 0,
        bounds: { x: 0, y: 0 },
        crop_left: 0,
        crop_top: 0,
        crop_right: 0,
        crop_bottom: 180,
        id: 1,
        scale_filter: "disable",
        blend_method: "default",
        blend_type: "normal",
      },
    ],
  },
};
const mic = {
  ...base,
  name: "Microphone — unmute when ready",
  uuid: randomUUID(),
  id: "wasapi_input_capture",
  versioned_id: "wasapi_input_capture",
  settings: { device_id: "default" },
  muted: true,
};
const collection = {
  name: "Playable Moments — Shortcut or Safety",
  version: 2,
  sources: [stage, scene],
  groups: [],
  scene_order: [{ name: sceneName }],
  current_scene: sceneName,
  current_program_scene: sceneName,
  current_transition: "Fade",
  transition_duration: 300,
  transitions: [],
  canvases: [],
  AuxAudioDevice1: mic,
  preview_locked: true,
  modules: { "scripts-tool": [] },
};
await mkdir(destination, { recursive: true });
await writeFile(
  new URL("Playable-Moments-Shortcut-Safety.json", destination),
  JSON.stringify(collection, null, 2) + "\n",
);
console.log(
  `Prepared ${fileURLToPath(new URL("Playable-Moments-Shortcut-Safety.json", destination))}\nImport as a separate OBS scene collection; use a 1920×1080 canvas. Nothing is streaming or recording. No credentials or overlay capability URL are included.`,
);
