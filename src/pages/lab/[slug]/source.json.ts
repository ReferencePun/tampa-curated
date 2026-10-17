import {registry,bundle} from '../../../../scripts/lab-package.mjs';
export async function getStaticPaths(){return (await registry()).map(e=>({params:{slug:e.slug}}));}
export async function GET({params}:{params:{slug:string}}){
 const {files}=await bundle(params.slug);
 const encoded=Object.fromEntries(Object.entries(files).map(([name,content])=>[name,Buffer.from(content as string|Uint8Array).toString('base64')]));
 return new Response(JSON.stringify({files:encoded}),{headers:{'Content-Type':'application/json'}});
}
