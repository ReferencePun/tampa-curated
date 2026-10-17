import {registry,bundle} from '../../../../scripts/lab-package.mjs';
import {zip} from '../../../creative-lab/shared/zip.js';
export async function getStaticPaths(){return (await registry()).map(e=>({params:{slug:e.slug}}));}
export async function GET({params}:{params:{slug:string}}){
 const {files}=await bundle(params.slug);
 return new Response(zip(files),{headers:{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="${params.slug}.zip"`}});
}
