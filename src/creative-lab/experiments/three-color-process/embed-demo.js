import {DEFAULTS,align} from './model.js';
import {createPlateRenderer} from './renderer.js';
import {loadImage,SOURCES,pngBlob,download} from './images.js';
const host=document.querySelector('#projection'),status=document.querySelector('#status'),abort=new AbortController(),signal=abort.signal,renderer=createPlateRenderer(host);let settings={...align(DEFAULTS),rX:-8},ready=false,disposed=false;
const draw=()=>{if(ready&&!disposed)renderer.render(settings);};const resize=new ResizeObserver(draw);resize.observe(host);
try{const data=await loadImage(SOURCES.archive.url,{signal});if(!disposed){renderer.setImage(data);ready=true;draw();status.textContent='The red channel is displaced. Move it back to zero.';}}catch(error){if(!disposed)status.textContent=error.message;}
document.querySelector('#offset').addEventListener('input',e=>{settings.rX=+e.target.value;draw();},{signal});document.querySelector('#align').addEventListener('click',()=>{settings=align(settings);document.querySelector('#offset').value='0';draw();},{signal});document.querySelector('#export').addEventListener('click',async()=>{if(!ready)return;const blob=await pngBlob(renderer.exportPixels(settings));if(!disposed)download(blob,'portable-color.png','image/png');},{signal});window.addEventListener('pagehide',()=>{disposed=true;abort.abort();resize.disconnect();renderer.dispose();},{once:true});
