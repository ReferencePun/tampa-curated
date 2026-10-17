import * as T from 'three';
import {Ink,plane,pale,surfaces,TAU,type P} from './ink';
import {streetSitesFor} from './street';

// Original architectural studies from exterior references. Proportions are
// composed for this imaginary street; these are not surveyed building models.
function mass(group:T.Group,pen:Ink,x:number,y:number,z:number,w:number,h:number,d:number){
 const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),pale);
 mesh.position.set(x+w/2,y+h/2,z-d/2-.035);group.add(mesh);
 pen.box(x,y,z,w,h,-d);
}
function arch(pen:Ink,x:number,y:number,z:number,w:number,h:number,tone=0){
 const r=w/2,top=y+h-r;
 pen.path([[x,y,z],[x,top,z],...Array.from({length:17},(_,i)=>[x+r-r*Math.cos(i*Math.PI/16),top+r*Math.sin(i*Math.PI/16),z] as P),[x+w,y,z]],tone);
}
function window(pen:Ink,x:number,y:number,z:number,w:number,h:number,arched=false){
 if(arched)arch(pen,x,y,z,w,h);else pen.rect(x,y,z,w,h);
 pen.line([x-.1,y-.1,z],[x+w+.1,y-.1,z]);
 pen.line([x+w/2,y,z],[x+w/2,y+h-(arched?w/2:0),z],1);
 pen.line([x,y+h*.45,z],[x+w,y+h*.45,z],1);
 pen.line([x+.09,y+.1,z+.01],[x+.09,y+h-(arched?w/2:0),z+.01],1);
}
function hatch(pen:Ink,x:number,y:number,z:number,w:number,h:number,spacing=.26){
 for(let u=0;u<w;u+=spacing)pen.line([x+u,y,z],[x+Math.min(w,u+.7),y+Math.min(h,.85),z],1);
}
function ledge(group:T.Group,pen:Ink,w:number,y:number,z:number,d:number){
 mass(group,pen,-w/2,y,z,w,.18,d);
 pen.line([-w/2,y-.12,z],[w/2,y-.12,z],1);
}
// The architectural lettering is outlined geometry, never a billboard texture.
const letters:Record<string,number[][][]>={
 A:[[[0,0],[.5,1],[1,0]],[[.2,.4],[.8,.4]]],
 D:[[[0,0],[0,1],[.6,1],[1,.75],[1,.25],[.6,0],[0,0]]],
 E:[[[1,0],[0,0],[0,1],[1,1]],[[0,.5],[.8,.5]]],
 F:[[[0,0],[0,1],[1,1]],[[0,.5],[.8,.5]]],
 H:[[[0,0],[0,1]],[[1,0],[1,1]],[[0,.5],[1,.5]]],
 I:[[[0,1],[1,1]],[[.5,1],[.5,0]],[[0,0],[1,0]]],
 L:[[[0,1],[0,0],[1,0]]],
 M:[[[0,0],[0,1],[.5,.4],[1,1],[1,0]]],
 N:[[[0,0],[0,1],[1,0],[1,1]]],
 O:[[[.2,0],[0,.2],[0,.8],[.2,1],[.8,1],[1,.8],[1,.2],[.8,0],[.2,0]]],
 P:[[[0,0],[0,1],[.8,1],[1,.8],[1,.6],[.8,.5],[0,.5]]],
 R:[[[0,0],[0,1],[.8,1],[1,.8],[1,.6],[.8,.5],[0,.5]],[[.5,.5],[1,0]]],
 T:[[[0,1],[1,1]],[[.5,1],[.5,0]]],
};
function lettering(pen:Ink,text:string,x:number,y:number,z:number,h:number,tone=2){
 [...text].forEach((char,i)=>{for(const stroke of letters[char]??[])pen.path(stroke.map(([u,v])=>[x+i*h*.8+u*h*.6,y+v*h,z] as P),tone);});
}
function turned(group:T.Group,pen:Ink,x:number,z:number,profile:[number,number][],ribs=16){
 const mesh=new T.Mesh(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),40),surfaces);mesh.position.set(x,0,z);group.add(mesh);
 for(const [r,y] of profile.filter((_,i)=>i%2===0))pen.path(Array.from({length:49},(_,i)=>[x+Math.cos(i*TAU/48)*(r+.025),y,z+Math.sin(i*TAU/48)*(r+.025)] as P),1);
 for(let j=0;j<ribs;j++){const a=j*TAU/ribs;pen.path(profile.map(([r,y])=>[x+Math.cos(a)*(r+.035),y,z+Math.sin(a)*(r+.035)] as P),j%4===0?0:1);}
}

function plantHall(){
 const group=new T.Group(),pen=new Ink();group.name='Plant Hall';
 mass(group,pen,-12,0,0,24,10.4,5);
 // Stepped brick parapet, upper-floor windows, and the long iron veranda.
 for(const y of [.4,3.4,6.9,9.9])ledge(group,pen,24.5,y,.22,5.35);
 pen.path([[-12,10.4,.08],[-5.4,10.4,.08],[-5.4,10.85,.08],[-2.6,10.85,.08],[-2.6,11.3,.08],[2.6,11.3,.08],[2.6,10.85,.08],[5.4,10.85,.08],[5.4,10.4,.08],[12,10.4,.08]]);
 for(let x=-10.9;x<12;x+=2.1){window(pen,x,7.7,.1,1.1,1.65,true);window(pen,x,.55,.12,1.05,2.35,true);}
 for(let x=-11.9;x<12;x+=3.4){
  pen.box(x,3.4,1.15,.16,3.3,-.18);arch(pen,x+.18,3.65,1.2,3.1,2.7);
  arch(pen,x+.3,3.7,1.22,2.85,2.52,1);
  for(let y=3.8;y<6.6;y+=.55)pen.rect(x-.05,y,1.25,.27,.26);
  for(let u=.3;u<3.25;u+=.32){pen.line([x+u,3.45,1.2],[x+u,3.95,1.2]);pen.circle(x+u,6.6,1.2,.07,1);}
 }
 plane(group,24,1.8,[0,7, .35],[Math.PI/2,0,0]);
 for(const y of [3.45,3.96,6.3,6.95])pen.line([-12,y,1.27],[12,y,1.27]);
 pen.circle(0,8.7,.16,.65);for(let i=0;i<12;i++){const a=i*TAU/12;pen.line([0,8.7,.18],[Math.cos(a)*.63,8.7+Math.sin(a)*.63,.18],1);}
 for(let i=0;i<7;i++)pen.box(-3.8-i*.19,-.06-i*.09,1.3+i*.28,7.6+i*.38,.1,.28,1);
 // Paired, ribbed onion minarets: wide lower roof, open lantern, small crown.
 for(const x of [-9,9]){
  turned(group,pen,x,-1.2,[[1.24,9.8],[1.24,12.2],[1.42,12.35],[1.42,12.65],[1.7,12.8],[1.88,13.35],[1.82,13.8],[1.55,14.4],[1.15,15.1],[.75,16.1],[.57,16.5]],20);
  turned(group,pen,x,-1.2,[[.55,16.45],[.55,17.25],[.67,17.3],[.87,17.55],[.91,17.9],[.78,18.2],[.4,18.6],[.12,19.2]],12);
  for(let i=-1;i<=1;i++)arch(pen,x+i*.43-.15,16.55,-.61,.3,.57);
  for(let i=-1;i<=1;i++)window(pen,x+i*.72-.23,10.65,.05,.46,1.12,true);
  pen.line([x,19.15,-1.2],[x,20.1,-1.2]);pen.circle(x+.05,20.15,-1.2,.24,2,Math.PI*.45,Math.PI*1.8);
  for(const y of [10.1,12.3,12.55])pen.line([x-1.24,y,.13],[x+1.24,y,.13],1);
  hatch(pen,x-1.15,10,.15,2.3,1.5,.18);
 }
 for(const x of [-6.6,6.6]){mass(group,pen,x,10.4,-2.3,.5,1.4,.6);pen.box(x-.08,11.7,-2.2,.66,.15,-.8);}
 for(const x of [-11,-6,3,9])for(let y=1;y<10;y+=1.55)hatch(pen,x,y,.13,1.2,.45);
 pen.line([-13,-.3,1.3],[13,-.3,1.3],1);pen.line([-13,0,1.3],[-13,21,1.3],1);
 for(const y of [0,7,10.4,20])pen.line([-13.35,y,1.3],[-12.7,y,1.3],2);
 pen.build(group);return group;
}

function floridan(){
 const group=new T.Group(),pen=new Ink();group.name='Floridan Hotel';
 mass(group,pen,-4.8,0,0,9.6,25.4,5);
 for(const y of [.5,3.9,5.5,20.5,24.8,25.3])ledge(group,pen,y>24?10.3:9.9,y,.18,5.3);
 for(let row=0;row<14;row++)for(let col=0;col<6;col++)window(pen,-4.1+col*1.42,5.9+row*1.31,.08,.68,.91);
 for(let x=-3.85;x<4.5;x+=1.9){arch(pen,x,.6,.13,1.35,3);arch(pen,x-.1,.6,.13,1.55,3.12,1);pen.line([x+.67,.7,.13],[x+.67,2.9,.13],1);}
 // Windowed return gives the tower an actual corner, rather than a flat cutout.
 const side=new T.Group();side.rotation.y=-Math.PI/2;side.position.set(-4.81,0,-2.5);group.add(side);const sideInk=new Ink();
 for(let row=0;row<14;row++)for(let col=0;col<3;col++)window(sideInk,-1.8+col*1.3,5.9+row*1.31,.06,.68,.91);
 sideInk.build(side);
 for(let i=0;i<40;i++){const x=-4.8+i*.245;pen.rect(x,24.9,.3,.12,.17,1);pen.line([x,25.7,.1],[x,26.15,.1],1);}
 pen.box(-4.9,25.65,.1,9.8,.5,-5.2,1);
 // Historical rooftop sign, retained as an architectural identifier.
 for(const x of [-3,0,3]){pen.line([x,26.15,-1],[x,28.9,-1],1);pen.line([x,26.15,-2.5],[x,28.9,-1],1);}
 lettering(pen,'HOTEL',-1.65,28.2,-.92,.85);
 lettering(pen,'FLORIDAN',-4.05,26.6,-.9,1.3);
 for(let y=6;y<24;y+=2)hatch(pen,3.95,y,.13,.75,1.1,.17);
 pen.build(group);return group;
}

function tampaTheatre(){
 const group=new T.Group(),pen=new Ink();group.name='Tampa Theatre';
 mass(group,pen,-4,0,0,8,17.4,4);
 for(const y of [3.5,5.2,15.5,17.2])ledge(group,pen,8.3,y,.2,4.3);
 for(let x=-3.4;x<4;x+=1.32){
  for(let row=0;row<7;row++)window(pen,x,5.65+row*1.38,.1,.77,.98);
  window(pen,x,15.9,.14,.78,1.05,true);
  pen.line([x-.14,5.4,.12],[x-.14,15.3,.12],1);
 }
 for(const x of [-3.8,2.6]){mass(group,pen,x,17.3,.12,1.2,.7,4.1);pen.circle(x+.6,17.75,.17,.22);}
 for(let x=-3.5;x<3.9;x+=1.15){arch(pen,x,.15,.18,.9,2.7);pen.circle(x+.45,4.55,.19,.28);pen.circle(x+.45,4.55,.2,.12,1);}
 // Projecting canopy, ornamental crest, and the five-letter vertical blade.
 mass(group,pen,-4.65,2.9,2.2,9.3,.85,2.4);
 for(const y of [2.92,3.06,3.58,3.75])pen.line([-4.65,y,2.26],[4.65,y,2.26]);
 for(let x=-4.4;x<4.5;x+=.28){pen.circle(x,3,2.27,.04,2);pen.circle(x,3.64,2.27,.04,2);}
 arch(pen,-1.65,3.7,2.28,3.3,1.3);lettering(pen,'TAMPA',-1.35,3.82,2.29,.73);
 for(let x=-4.4;x<4.5;x+=.55)pen.circle(x,3.9,2.25,.12,1);
 const blade=new T.Group();blade.position.set(-4.3,0,1.45);blade.rotation.y=.12;group.add(blade);const sign=new Ink();
 mass(blade,sign,-.85,5.5,.12,1.7,9.5,.25);
 sign.path([[-.85,5.5,.22],[-1.08,5.8,.22],[-1.08,14.7,.22],[-.6,15.3,.22],[.6,15.3,.22],[1.08,14.7,.22],[1.08,5.8,.22],[.85,5.5,.22]],2);
 [...'TAMPA'].forEach((char,i)=>lettering(sign,char,-.49,13.1-i*1.72,.25,1.45));
 for(const y of [6,10,14])sign.line([0,y,-.2],[0,y,-1.5],1);
 sign.build(blade);
 for(const x of [-3.85,-1.2,2.8])for(let y=6;y<15;y+=1.5)hatch(pen,x,y,.12,.4,.8,.12);
 pen.build(group);return group;
}

function rivergate(compact:boolean){
 const group=new T.Group(),pen=new Ink();group.name='Rivergate Tower';
 const radius=4.1,height=31;
 // A few occupied rooms, fixed in object space. Overdrawn amber pencil marks
 // wander beyond the frames, with paper still visible between the strokes.
 const litWindows=new Set(['3:5','7:2','10:4','14:1','15:1','19:6','23:3','26:7','28:2','8:11','21:14','17:22','25:28']);
 const shell=new T.Mesh(new T.CylinderGeometry(radius,radius,height,56),pale);shell.position.y=height/2;group.add(shell);
 const ring=(y:number,r=radius+.03,tone=1)=>pen.path(Array.from({length:65},(_,i)=>[Math.cos(i*TAU/64)*r,y,Math.sin(i*TAU/64)*r] as P),tone);
 ring(0,radius+.08,0);ring(height,radius+.04,0);ring(height-.25);ring(height-1);
 // Small square openings wrap the cylinder and follow its changing perspective.
 for(let row=0;row<30;row++){
  const y=.7+row*.96;
  for(let col=0;col<32;col++){
   const a=col*TAU/32,half=.062,r=radius+.045,h=row>25?.66:.43;
   if(compact&&Math.sin(a)<-.4)continue;
   if(litWindows.has(`${row}:${col}`)){
    const wobble=Math.sin(row*2.7+col)*.12,rr=radius+.085;
    const stroke=(u:number,v:number):P=>{const angle=a-half+2*half*u;return [rr*Math.cos(angle),y+h*v,rr*Math.sin(angle)];};
    const scribble=[[-.12,.04],[.97,.35+wobble],[.02,.32],[1.14,.72+wobble],[.08,.62],[.92,1.08],[.31,.88]];
    // Close, imperfect retracing makes a heavier pencil stroke even on WebGL
    // implementations that only support one-pixel native line widths.
    for(const offset of [-.045,0,.045])pen.path(scribble.map(([u,v],i)=>stroke(u+offset+Math.sin(i*2.4+row)*.035,v+offset*.6)),5);
    pen.path([stroke(.14,.22),stroke(.52,-.12),stroke(.37,.76),stroke(.77,.33)],5);
   }
   pen.path([[r*Math.cos(a-half),y,r*Math.sin(a-half)],[r*Math.cos(a+half),y,r*Math.sin(a+half)],[r*Math.cos(a+half),y+h,r*Math.sin(a+half)],[r*Math.cos(a-half),y+h,r*Math.sin(a-half)]],0,true);
   if(col%3===0)pen.line([r*Math.cos(a-half),y+.05,r*Math.sin(a-half)],[r*Math.cos(a+half),y+.05,r*Math.sin(a+half)],1);
  }
  if(row%4===0)ring(y-.16);
 }
 for(const a of [0,Math.PI])pen.line([Math.cos(a)*(radius+.05),0,Math.sin(a)*(radius+.05)],[Math.cos(a)*(radius+.05),height,Math.sin(a)*(radius+.05)]);
 // Low cubic companion and a fragment of the riverside terrace.
 mass(group,pen,-6.4,0,3.9,4.8,4.3,3.8);
 for(let x=-6;x<-1.5;x+=.75)for(let y=.4;y<4;y+=.8)pen.rect(x,y,3.96,.6,.61,1);
 for(let i=0;i<4;i++)pen.path([[-8,-i*.12,4+i*.65],[7,-i*.12,4+i*.65],[7,-i*.12,-4]],1);
 pen.build(group);return group;
}

export function createTampaLandmarks(parent:T.Group,compact:boolean){
 const models:Record<string,T.Group>={'Plant Hall':plantHall(),'Tampa Theatre':tampaTheatre(),'Floridan Hotel':floridan(),'Rivergate Tower':rivergate(compact)};
 for(const site of streetSitesFor(compact)){
  const group=models[site.name];group.position.set(...site.position);group.rotation.y=site.rotation;
  parent.add(group);
 }
}
