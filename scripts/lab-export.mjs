import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {bundle,registry} from './lab-package.mjs';
import {zip} from '../src/creative-lab/shared/zip.js';
const args=process.argv.slice(2).filter(arg=>arg!=='--'),slug=args[0];
if(!slug||slug==='--list'){
  console.log('Usage: pnpm lab:export <slug> [--preset path/to/preset.json] [--out directory]');
  console.log((await registry()).map(e=>`${e.slug}${e.placeholder?' (placeholder scaffold)':''}`).join('\n'));process.exit(slug?0:1);
}
function option(name){const index=args.indexOf(name);if(index<0)return undefined;if(!args[index+1]||args[index+1].startsWith('--'))throw new Error(`Missing value for ${name}`);return args[index+1];}
try{
  for(let i=1;i<args.length;i+=2)if(!['--preset','--out'].includes(args[i]))throw new Error(`Unknown argument: ${args[i]}`);
  const presetPath=option('--preset'),out=path.resolve(option('--out')||'lab-exports');
  const preset=presetPath?JSON.parse(await readFile(presetPath,'utf8')):undefined;
  const {manifest,files}=await bundle(slug,preset);await mkdir(out,{recursive:true});
  const destination=path.join(out,`${slug}.zip`);await writeFile(destination,zip(files));
  console.log(`Exported ${manifest.name}${manifest.placeholder?' (placeholder scaffold)':''}: ${destination}\n${Object.keys(files).length} files; source, local assets, dependency manifest, preset, licenses, and runnable example included.`);
}catch(error){console.error(error.message);process.exitCode=1;}
