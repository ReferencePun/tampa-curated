import {readFile,readdir,lstat} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {defaults,createPreset,readPreset} from '../src/creative-lab/shared/presets.js';
// Both pnpm commands and Astro's prerenderer run from the project root. Resolving
// from cwd also survives the build tool relocating this module into dist.
export const labRoot=path.resolve('src/creative-lab');
export async function registry(){
  const names=await readdir(path.join(labRoot,'experiments'));
  const manifests=await Promise.all(names.map(async name=>{
    const manifest=JSON.parse(await readFile(path.join(labRoot,'experiments',name,'manifest.json'),'utf8'));
    if(manifest.slug!==name||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))throw new Error(`Invalid slug: ${name}`);
    if(!['prototype','working','polished'].includes(manifest.status))throw new Error(`Invalid status: ${name}`);
    readPreset(manifest,createPreset(manifest,defaults(manifest)));
    return manifest;
  }));
  if(new Set(manifests.map(e=>e.id)).size!==manifests.length)throw new Error('Duplicate experiment ID');
  return manifests.sort((a,b)=>a.order-b.order);
}
export async function bundle(slug,preset){
  const manifest=(await registry()).find(e=>e.slug===slug);
  if(!manifest)throw new Error(`Unknown experiment: ${slug}`);
  const files={},visited=new Set();
  async function add(relative){
    const absolute=path.resolve(labRoot,relative),safe=path.relative(labRoot,absolute).split(path.sep).join('/');
    if(safe.startsWith('../')||path.isAbsolute(safe))throw new Error(`Import escapes the lab: ${relative}`);
    if(visited.has(safe))return;visited.add(safe);
    const info=await lstat(absolute);if(info.isSymbolicLink())throw new Error(`Symlinks are not exportable: ${safe}`);
    if(info.isDirectory()){
      for(const name of await readdir(absolute))if(!name.startsWith('.')&&name!=='node_modules')await add(path.join(safe,name));
      return;
    }
    const bytes=await readFile(absolute);files[`creative-lab/${safe}`]=new Uint8Array(bytes);
    if(/\.(?:js|mjs|ts|css)$/.test(safe)){
      const source=bytes.toString('utf8');
      const imports=[...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]);
      const assets=[...source.matchAll(/(?:new URL\(\s*|url\(\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]);
      if(/\bimport\s*\(\s*[^'"\s]/.test(source))throw new Error(`Computed imports need an explicit export adapter: ${safe}`);
      for(const specifier of [...imports,...assets]){
        if(specifier.startsWith('.'))await add(path.join(path.dirname(safe),specifier));
        else if(assets.includes(specifier))throw new Error(`Asset must use a local relative path: ${specifier}`);
        else {
          const dependency=specifier.startsWith('@')?specifier.split('/').slice(0,2).join('/'):specifier.split('/')[0];
          if(!manifest.dependencies[dependency])throw new Error(`Undeclared runtime dependency ${specifier} in ${safe}`);
        }
      }
    }
  }
  await add(`experiments/${slug}`);await add('shared/presets.js');await add('shared/standalone.js');await add('LICENSE');
  let importMap='';
  if(manifest.dependencies.three){
    // Keep the browser example self-contained. Only the two upstream ESM files
    // needed by Three's main entry are vendored; no CDN or build step is required.
    const require=createRequire(path.join(process.cwd(),'package.json'));
    const build=path.dirname(require.resolve('three'));
    const installed=JSON.parse(await readFile(path.join(build,'../package.json'),'utf8'));
    if(installed.version!==manifest.dependencies.three)throw new Error('Exported Three.js version must match the manifest.');
    for(const file of ['three.module.js','three.core.js'])files[`vendor/three/${file}`]=new Uint8Array(await readFile(path.join(build,file)));
    files['vendor/three/LICENSE']=new Uint8Array(await readFile(path.join(build,'../LICENSE')));
    importMap='<script type="importmap">{"imports":{"three":"./vendor/three/three.module.js"}}</script>';
  }
  const saved=preset?readPreset(manifest,preset):createPreset(manifest,defaults(manifest),'Default');
  files['preset.json']=JSON.stringify(saved,null,2)+'\n';
  files['package.json']=JSON.stringify({name:`impossible-lab-${slug}`,version:'1.0.0',private:true,type:'module',description:manifest.description,license:manifest.license,dependencies:manifest.dependencies},null,2)+'\n';
  files['README.md']=`# ${manifest.name}\n\n${manifest.placeholder?'PLACEHOLDER: this exports a calibration scaffold, not the proposed effect.':'A working reference study from the Impossible Lab.'}\n\n${manifest.description}\n\n## Start\n\n${Object.keys(manifest.dependencies).length?'Install the exact dependencies in package.json using your package manager, then integrate with your bundler.':'No dependencies to install. Run `python3 -m http.server 8080` in this folder, then open http://localhost:8080/example.html.'}\n\nThe standalone example reads preset.json. Serve over HTTP, not file://. It pauses offscreen, in a hidden tab, and for reduced motion. Its Pause and Replay buttons are keyboard accessible.\n\nThe effect entry is creative-lab/experiments/${slug}/${manifest.entry}. Keep its shared helpers and local assets together. Full contract, integration example, and compatibility notes: creative-lab/experiments/${slug}/README.md.\n\n## Scope and licensing\n\nOnly this experiment and its transitive local imports are included. No Tampa page logic, credentials, fonts, or unrelated experiments. Demonstration assets are listed in ASSETS.md and retain their individual licenses. Original lab code is MIT; see creative-lab/LICENSE. Runtime dependencies, if any, are declared at exact versions in package.json and must be installed; node_modules is not bundled.\n`;
  files['ASSETS.md']=manifest.assets.map(a=>`- ${a.path}: ${a.credit}. License: ${a.license}.`).join('\n')+'\n';
  files['COMPATIBILITY.md']=manifest.compatibility.map(line=>`- ${line}`).join('\n')+'\n';
  files['example.html']=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${manifest.name} — standalone study</title><meta name="description" content="Standalone reusable Impossible Lab study"><link rel="stylesheet" href="./creative-lab/experiments/${slug}/style.css"><style>body{margin:32px;background:#f2eee3;color:#37342e;font:18px/1.6 Georgia,serif}button{font:inherit;padding:8px 18px;margin:0 8px 12px 0}.impossible-effect{border:1px solid #9a9080}img{width:100%;height:100%;object-fit:contain;position:absolute}button:focus-visible{outline:3px solid #a75239}</style></head><body><h1>${manifest.name}</h1><p>${manifest.placeholder?'Placeholder calibration plate. The named effect is not implemented.':'A small, reusable drawing study.'}</p><button id="pause">Pause</button><button id="replay">Replay</button><div class="impossible-effect"><img src="./creative-lab/experiments/${slug}/assets/preview.svg" alt="Static study plate"></div><p id="status" role="status"></p><script type="module" src="./example.js"></script></body></html>`;
  files['example.js']=`import {mount} from './creative-lab/experiments/${slug}/index.js';
import {readPreset} from './creative-lab/shared/presets.js';
import {runStandalone} from './creative-lab/shared/standalone.js';
const manifest=await fetch('./creative-lab/experiments/${slug}/manifest.json').then(r=>r.json()),preset=readPreset(manifest,await fetch('./preset.json').then(r=>r.json()));
runStandalone(mount,preset.settings);
`;
  if(importMap){
    files['example.html']=files['example.html'].replace('</head>',`${importMap}</head>`);
    files['README.md']=files['README.md'].replace('Install the exact dependencies in package.json using your package manager, then integrate with your bundler.','Run `python3 -m http.server 8080` in this folder, then open http://localhost:8080/example.html. The exact Three.js ESM runtime is included locally, with an import map and its MIT license. For integration with a bundler, install the version declared in package.json.').replace('Runtime dependencies, if any, are declared at exact versions in package.json and must be installed; node_modules is not bundled.','Three.js is included in vendor/three under its own MIT license. No node_modules directory is bundled.');
    files['ASSETS.md']+='- vendor/three/: Three.js authors, version '+manifest.dependencies.three+'. MIT; see vendor/three/LICENSE.\n';
  }
  return {manifest,files};
}
