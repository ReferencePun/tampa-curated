import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {registry,labRoot} from '../../../../scripts/lab-package.mjs';
export async function getStaticPaths(){return (await registry()).map(e=>({params:{slug:e.slug},props:{thumbnail:e.thumbnail}}));}
export async function GET({params,props}:{params:{slug:string};props:{thumbnail:string}}){
 return new Response(await readFile(path.join(labRoot,'experiments',params.slug,props.thumbnail),'utf8'),{headers:{'Content-Type':'image/svg+xml'}});
}
