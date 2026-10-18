import {samplePixels} from './model.js';
export const PHOTOS=[
 {id:'palms',name:'Palms & concrete',url:new URL('./assets/palms.jpg',import.meta.url).href,credit:'Brandon Burridge / Unsplash',source:'https://unsplash.com/photos/4wesDlSBq2o',alt:'Palms and a downtown Tampa high-rise photographed from below.',note:'The leaves break into fine points; the high-rise holds the image together. Move between the two to see how the same field describes different surfaces.'},
 {id:'portrait',name:'A face, in light',url:new URL('./assets/portrait.jpg',import.meta.url).href,credit:'Christopher Campbell / Unsplash',source:'https://unsplash.com/photos/rDEOVtE7vOs',alt:'A stock portrait of a woman in natural light.',note:'A stock portrait becomes a study in pressure and spacing. Dense marks hold the features while the lighter surfaces dissolve into the paper.'},
 {id:'facade',name:'The long façade',url:new URL('./assets/facade.jpg',import.meta.url).href,credit:'Ikuna / Unsplash',source:'https://unsplash.com/photos/wb2DOoxIGJQ',alt:'The historic Ybor Factory Building in a vertical architectural photograph.',note:'The vertical plate keeps the entire photograph. Repeating windows produce short engraved marks, while the sky opens into almost untouched paper.'}
];
export async function loadPhoto(source){if(typeof source!=='string'&&!(source instanceof URL))return source;const image=new Image();image.decoding='async';image.crossOrigin='anonymous';image.src=String(source);await image.decode();return image;}
export function prepareImage(image,density=300,seed=7){
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;if(!iw||!ih)throw new Error('The photograph has no readable dimensions.');
 const scale=Math.min(1,1536/Math.max(iw,ih)),texture=document.createElement('canvas');texture.width=Math.max(1,Math.round(iw*scale));texture.height=Math.max(1,Math.round(ih*scale));const ctx=texture.getContext('2d');ctx.fillStyle='#f5f1e7';ctx.fillRect(0,0,texture.width,texture.height);ctx.drawImage(image,0,0,texture.width,texture.height);
 const grid=document.createElement('canvas'),factor=density/Math.max(iw,ih);grid.width=Math.max(1,Math.round(iw*factor));grid.height=Math.max(1,Math.round(ih*factor));const sampleContext=grid.getContext('2d',{willReadFrequently:true});sampleContext.drawImage(texture,0,0,grid.width,grid.height);const sampled=samplePixels(sampleContext.getImageData(0,0,grid.width,grid.height),seed);sampled.aspect=iw/ih;
 return {texture,sampled};
}
