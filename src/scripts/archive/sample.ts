import {BufferGeometry, Float32BufferAttribute, CanvasTexture, Vector4, LinearFilter} from 'three';

export function samplePhotograph(image:HTMLImageElement, ratio:number, columns:number, seed:number) {
 const rows=Math.round(columns/ratio), canvas=document.createElement('canvas');
 canvas.width=columns;canvas.height=rows;
 const context=canvas.getContext('2d',{willReadFrequently:true});
 if(!context)throw new Error('Image sampling unavailable');
 const iw=image.naturalWidth,ih=image.naturalHeight;
 const sw=Math.min(iw,ih*ratio),sh=sw/ratio,sx=(iw-sw)/2,sy=(ih-sh)/2;
 context.drawImage(image,sx,sy,sw,sh,0,0,columns,rows);
 const pixels=context.getImageData(0,0,columns,rows).data;
 const luminance=new Float32Array(columns*rows);
 for(let i=0;i<luminance.length;i++)luminance[i]=(pixels[i*4]*.299+pixels[i*4+1]*.587+pixels[i*4+2]*.114)/255;
 let state=seed>>>0;
 const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
 const positions:number[]=[],uvs:number[]=[],marks:number[]=[],inks:number[]=[];
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  const i=y*columns+x,luma=luminance[i];
  const edge=Math.abs(luma-luminance[y*columns+Math.min(columns-1,x+1)])+Math.abs(luma-luminance[Math.min(rows-1,y+1)*columns+x]);
  const ink=Math.min(1,Math.pow(1-Math.pow(luma,.7),1.1)+edge*.24);
  if(random()>.035+ink*.96+edge*.2)continue;
  const u=(x+.5+(random()-.5)*.8)/columns,v=1-(y+.5+(random()-.5)*.8)/rows;
  positions.push(u*2-1,v*2-1,0);uvs.push(u,v);inks.push(ink);marks.push(random(),random(),random());
 }
 const geometry=new BufferGeometry();
 geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
 geometry.setAttribute('aUV',new Float32BufferAttribute(uvs,2));
 geometry.setAttribute('aMark',new Float32BufferAttribute(marks,3));
 geometry.setAttribute('aInk',new Float32BufferAttribute(inks,1));
 // A bounded, cropped copy avoids responsive HTMLImageElement width/height
 // changing underneath WebGL's texture allocation. It uploads only once.
 const emulsion=document.createElement('canvas');emulsion.width=Math.min(1280,iw);emulsion.height=Math.round(emulsion.width/ratio);
 const emulsionContext=emulsion.getContext('2d');if(!emulsionContext)throw new Error('Photograph unavailable');
 emulsionContext.drawImage(image,sx,sy,sw,sh,0,0,emulsion.width,emulsion.height);
 const texture=new CanvasTexture(emulsion);texture.generateMipmaps=false;texture.minFilter=LinearFilter;texture.magFilter=LinearFilter;
 const crop=new Vector4(0,0,1,1);
 return {geometry,texture,crop,columns,count:inks.length};
}
