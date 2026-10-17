import {draft,rect,circle,arch,windowDrawing} from './illustration.js';
export const DEFAULTS={version:'architecture',progress:0,speed:1,transparency:.72,density:32,angle:68,variation:.4,guides:true};
const PI=Math.PI;
export function validateOptions(input={}){
 const s={...DEFAULTS,...input};if(!['architecture','machine','city'].includes(s.version))throw new Error('Choose a valid folding composition.');
 for(const [key,min,max] of [['progress',0,100],['speed',.25,2],['transparency',0,1],['density',12,64],['angle',35,85],['variation',0,1]])if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw new Error(`${key} must be between ${min} and ${max}.`);
 if(typeof s.guides!=='boolean')throw new Error('Construction-line visibility must be on or off.');return s;
}
function panel(id,parent,pivot,outline,d,extra={}){return {id,parent,pivot,outline,strokes:d.strokes,stage:[.08,.38],angle:PI/2,...extra};}
function sheet(panels,w,h,title,density){
 const d=draft();d.box(-w/2+1,-h/2+1,w-2,h-2,'pencil');
 for(const x of [-w/2+1,w/2-1])for(const y of [-h/2+1,h/2-1]){d.line([x-.5,y],[x+.5,y],'guide');d.line([x,y-.5],[x,y+.5],'guide');}
 d.label(title,-w/2+2,h/2-2,.45,'ink');d.label('AN UNBUILT STUDY / PLATE 03',-w/2+2,h/2-3,.22);d.label('DRAWING IS A FORM OF POSSIBILITY',-w/2+2,-h/2+1.7,.22,'pencil');
 d.dimension([w/2-10,-h/2+2],[w/2-2,-h/2+2],'0 / 10');
 for(let i=0;i<density;i++){const x=-w/2+2+i*(w-4)/density;d.line([x,-h/2+.8],[x,-h/2+1.15],'guide');}
 panels.push(panel('sheet',null,[0,0,-.045],rect(-w/2,-h/2,w,h),d,{angle:0,paper:0xeee8db,edgeKind:'pencil'}));
}
function conservatory(s){
 const panels=[],W=16,D=11,H=7.6,R=3.7,roofLength=Math.hypot(D/2,R);
 sheet(panels,45,47,'THE UNBUILT CONSERVATORY',s.density);
 const floor=draft();floor.box(-W/2,-D/2,W,D);floor.box(-W/2+.4,-D/2+.4,W-.8,D-.8,'pencil');
 for(let i=-7;i<=7;i+=32/s.density)floor.line([i,-D/2],[i,D/2],'pencil');for(let y=-5;y<=5;y+=32/s.density)floor.line([-W/2,y],[W/2,y],'pencil');
 floor.label('01 / GROUND PLAN',-3,-.5,.35);floor.path(circle(0,0,2),'guide');floor.dimension([-W/2,-D/2-.55],[W/2,-D/2-.55],'16 000');
 panels.push(panel('floor',null,[0,0,0],rect(-W/2,-D/2,W,D),floor,{angle:0}));
 for(const [id,y,zrot] of [['south',-D/2,PI],['north',D/2,0]]){
  const d=draft(),holes=[arch(0,.02,3.2,5.8)];
  d.box(-W/2+.15,.3,W-.3,H-.6,'pencil');d.line([-W/2,6.8],[W/2,6.8]);d.line([-W/2,7.15],[W/2,7.15],'pencil');
  for(const x of [-5.6,5.6]){holes.push(arch(x,1.8,2.15,3.9));windowDrawing(d,x,1.8,2.15,3.9,{lights:id==='south'&&x<0});d.rosette(x,6.3,.35);}
  d.path(arch(0,-.04,3.48,6.07),'pencil');d.rosette(0,6.7,.28);d.label(`${id==='south'?'02':'03'} / ${id.toUpperCase()} ELEVATION`,-3.4,.75,.22);
  for(let i=0;i<s.density;i++){const x=-W/2+.2+i*(W-.4)/s.density;d.line([x,H-.45],[x+.1,H-.2],'pencil');}
  d.dimension([-W/2-.25,H+.4],[W/2+.25,H+.4],'EAVE / 7 600');
  panels.push(panel(id,'floor',[0,y,0],rect(-W/2,0,W,H),d,{restZ:zrot,holes,stage:id==='south'?[.16,.43]:[.09,.37]}));
  const roof=draft();roof.box(-W/2+.15,.15,W-.3,roofLength-.3,'pencil');
  for(let x=-W/2+.5;x<W/2;x+=20/s.density)roof.line([x,0],[x,roofLength],'pencil');
  for(let y=.45;y<roofLength;y+=19/s.density)roof.line([-W/2,y],[W/2,y],'pencil');
  roof.label('ROOF / FOLD 55 DEG',-2.4,roofLength*.48,.22);roof.line([-W/2-.4,0],[W/2+.4,0],'guide');
  roof.dimension([-W/2+.3,roofLength+.35],[W/2-.3,roofLength+.35],'RIDGE');
  panels.push(panel(`${id}-roof`,id,[0,H,0],rect(-W/2,0,W,roofLength),roof,{angle:PI/2-Math.atan2(R,D/2),stage:id==='south'?[.47,.72]:[.43,.68]}));
 }
 for(const [id,x,zrot] of [['west',-W/2,PI/2],['east',W/2,-PI/2]]){
  const d=draft(),holes=[];d.box(-D/2+.18,.25,D-.36,H-.5,'pencil');
  for(const x of [-3.6,0,3.6]){holes.push(arch(x,1.25,2.1,4.6));windowDrawing(d,x,1.25,2.1,4.6,{lights:id==='east'&&x===0});}
  d.label(`${id.toUpperCase()} / SECTION`,-2.3,.45,.2);d.line([-D/2,H-.6],[D/2,H-.6]);
  panels.push(panel(id,'floor',[x,0,0],rect(-D/2,0,D,H),d,{restZ:zrot,holes,stage:id==='west'?[.06,.32]:[.12,.39]}));
  const g=draft();g.rosette(0,1.05,.72);g.path([[-D/2+.4,.15],[0,R-.3],[D/2-.4,.15]],'pencil');
  for(let i=0;i<9;i++){const x=-3.6+i*.9;g.line([x,.15],[0,R-.35],'pencil');}
  panels.push(panel(`${id}-gable`,id,[0,H,0],[[-D/2,0],[D/2,0],[0,R]],g,{angle:0}));
  for(const [i,x] of [-3.6,3.6].entries()){
   const brace=draft();brace.path([[.1,.12],[.1,1.52],[1.05,1.52],[.1,.12]],'pencil');brace.hatch(.2,1.55,.9,.15,8);
   panels.push(panel(`${id}-brace-${i}`,id,[x,5.6,0],[[0,0],[0,1.8],[1.4,1.8]],brace,{axis:[0,1,0],angle:-PI/2,stage:[.38,.61]}));
  }
 }
 // Three narrow linked faces close against the facade to form each fluted column.
 for(const [i,x] of [-7.25,-2.7,3.15,7.65].entries())for(let face=0;face<3;face++){
  const d=draft();for(let j=1;j<=3;j++)d.line([j*.09,.45],[j*.09,6.55],'pencil');d.box(0,.2,.36,.23);d.box(0,6.7,.36,.3);d.hatch(.03,6.4,.28,.2,5);
  panels.push(panel(`column-${i}-${face}`,face?`column-${i}-${face-1}`:'south',face?[.36,0,0]:[x,0,0],rect(0,0,.36,7.1),d,{axis:[0,1,0],stage:[.29+face*.06,.51+face*.06]}));
 }
 return {id:'architecture',name:'The unbuilt conservatory',caption:'Elevations become walls. Columns close. Roofs meet at the ridge.',panels,sheet:[45,47],assembledSpan:22,focus:[0,3.4,0],entry:[0,2.65,14],inside:[-1.3,2.9,4],look:[4,4.1,-3.5]};
}
function machine(s){
 const panels=[];sheet(panels,42,40,'AN ENGINE FOR NOTHING',s.density);
 const d=draft();d.box(-6,-4,12,8);for(let i=-5;i<=5;i++)d.line([i,-4],[i,4],'pencil');d.label('FRAME / PLAN',-2,-.5,.3);d.path(circle(0,0,2.3),'guide');
 panels.push(panel('bed',null,[0,0,0],rect(-6,-4,12,8),d,{angle:0}));
 for(const [id,x,rotation] of [['left',-5,PI/2],['right',5,-PI/2]]){
  const a=draft();a.box(-3.5,.3,7,7.5,'pencil');a.dimension([-4,8.8],[4,8.8],'8 400');a.label('BEARING / 04',-2,.5,.23);
  for(let y=1;y<8;y+=.6){a.path(circle(-3.3,y,.11,12),'pencil');a.path(circle(3.3,y,.11,12),'pencil');}
  a.hatch(-3.8,.2,.5,7.5,Math.round(s.density/2));
  panels.push(panel(id,'bed',[x,0,0],rect(-4,0,8,8.4),a,{restZ:rotation,holes:[rect(-2.6,1.3,5.2,5.7)],stage:[id==='left'?.08:.15,id==='left'?.35:.42]}));
  const cap=draft();cap.box(-4+.2,.2,7.6,4.6,'pencil');for(let i=0;i<8;i++)cap.line([-3.5+i,0],[-3.5+i,5],'pencil');cap.label('CROSSHEAD',-2,2.4,.23);
  panels.push(panel(`${id}-cap`,id,[0,8.4,0],rect(-4,0,8,5),cap,{stage:[.44,.7]}));
 }
 for(const [i,x] of [-1.8,1.8].entries()){
  const a=draft();a.box(-.2,0,.4,5);a.label('PIVOT',-.7,.4,.18);a.path(circle(0,4.7,.32));
  panels.push(panel(`arm-${i}`,'bed',[x,2,0],rect(-.3,0,.6,5),a,{stage:[.18,.44]}));
  const gear=draft(),r=i?1.55:2.25,outline=Array.from({length:96},(_,j)=>{const a=j*Math.PI/48,rr=r*(j%4<2?1:.9);return [Math.cos(a)*rr,Math.sin(a)*rr];});
  gear.path(circle(0,0,r*.75));gear.path(circle(0,0,.35));for(let j=0;j<12;j++){const a=j*Math.PI/6;gear.line([Math.cos(a)*.5,Math.sin(a)*.5],[Math.cos(a)*r*.73,Math.sin(a)*r*.73],'pencil');}gear.label(i?'G2':'G1',-.3,.45,.26);
  panels.push(panel(`wheel-${i}`,`arm-${i}`,[0,4.7,0],outline,gear,{axis:[0,0,1],angle:i?-PI*.6:PI*.4,stage:[.45,.72],holes:[circle(0,0,.22)]}));
 }
 return {id:'machine',name:'An engine for nothing',caption:'Bearing frames lift. Linked gears turn. The crossheads close.',panels,sheet:[42,40],assembledSpan:19,focus:[0,3,0],entry:[0,2.5,13],inside:[0,3.2,2.4],look:[0,4.3,-3]};
}
function city(s){
 const panels=[];sheet(panels,58,60,'A CITY IN THE CREASES',s.density);
 const map=draft();for(const x of [-3,-2.6,2.6,3])map.line([x,-23],[x,23],x===3||x===-3?'ink':'pencil');
 for(let y=-22;y<=22;y+=2)map.line([0,y],[0,y+1],'guide');for(const y of [-7,7]){map.line([-23,y],[23,y]);map.line([-23,y+.4],[23,y+.4],'pencil');}
 map.label('N',-20,20,.6);map.path([[-19.75,18],[-19.75,19.6],[-20.1,19.1]],'guide');map.label('AVENUE / 01',-1.7,-22,.2);
 panels.push(panel('map',null,[0,0,0],rect(-24,-24,48,48),map,{angle:0,edgeKind:'guide'}));
 const lots=[[-11,-14,3.5,4,5], [11,-14,4,4.5,7],[-11,0,4.5,4.5,6],[11,0,3.5,4,4.5],[-11,14,4,4,7.5],[11,14,4.5,4.5,5.5]];
 for(const [i,[x,y,w,depth,h]] of lots.entries()){
  const plan=draft();plan.box(-w/2,-depth/2,w,depth,'guide');plan.label(`LOT 0${i+1}`,-w/2,-.2,.22);
  panels.push(panel(`lot-${i}`,'map',[x,y,0],rect(-w/2,-depth/2,w,depth),plan,{angle:0}));
  for(const [face,px,py,zrot,span] of [['n',0,depth/2,0,w],['s',0,-depth/2,PI,w],['w',-w/2,0,PI/2,depth],['e',w/2,0,-PI/2,depth]]){
   const d=draft();d.box(-span/2+.12,.18,span-.24,h-.36,'pencil');
   const rows=Math.max(2,Math.round(h/1.2));for(let row=0;row<rows;row++)for(const cx of [-span*.24,span*.24])windowDrawing(d,cx,.65+row*(h-1)/rows,.65,.6,{arched:false,lights:(i+row)%3===0&&cx<0});
   d.hatch(-span/2+.1,.1,span-.2,.18,Math.round(s.density/3));d.label(`0${i+1}`,-.2,.18,.22);
   panels.push(panel(`lot-${i}-${face}`,`lot-${i}`,[px,py,0],rect(-span/2,0,span,h),d,{restZ:zrot,stage:[.07+i*.025,.36+i*.033]}));
   if(face==='n'){
    const roof=draft();roof.box(-w/2+.2,.2,w-.4,depth-.4,'pencil');roof.path(circle(0,depth/2,.5),'guide');
    panels.push(panel(`lot-${i}-roof`,`lot-${i}-n`,[0,h,0],rect(-w/2,0,w,depth),roof,{stage:[.43+i*.02,.62+i*.02]}));
   }
  }
 }
 return {id:'city',name:'A city in the creases',caption:'A street plan opens into six buildings. Follow the avenue between them.',panels,sheet:[58,60],assembledSpan:41,focus:[0,2,0],entry:[0,2.4,27],inside:[0,3.8,7],look:[0,3.2,-24]};
}
export function createComposition(options={}){const s=validateOptions(options);return ({architecture:conservatory,machine,city})[s.version](s);}
