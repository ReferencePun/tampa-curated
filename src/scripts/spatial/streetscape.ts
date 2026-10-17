import * as T from 'three';
import {Ink,TAU,type P} from './ink';

// Original supporting buildings, rather than additional named landmarks. The
// gaps reserve the complete Theatre, Plant Hall, Floridan and Rivergate sites.
const frontages=[
 {x:-19,w:8,h:7.4,side:1},{x:-28,w:8,h:10.2,side:1},
 {x:-50,w:7,h:9.1,side:1},{x:-58,w:8,h:6.8,side:1},
 {x:-67,w:8,h:11.8,side:1},{x:-76,w:7,h:7.6,side:1},
 {x:-100,w:10,h:9.2,side:1},{x:-112,w:12,h:13.1,side:1},
 {x:-19,w:8,h:10.1,side:-1},{x:-29,w:10,h:7.3,side:-1},
 {x:-36,w:3.8,h:8.5,side:-1},{x:-71,w:7,h:7.5,side:-1},
 {x:-80,w:9,h:10.6,side:-1},{x:-87,w:4,h:6.4,side:-1},
 {x:-116,w:12,h:11.6,side:-1},
];

// All static paper faces are batched by tone: adding street detail does not add
// a mesh/draw call for every paving stone, window, frond or piece of furniture.
class PaperFaces {
 vertices:number[][]=Array.from({length:4},()=>[]);
 quad(a:P,b:P,c:P,d:P,tone=0){this.vertices[tone].push(...a,...b,...c,...a,...c,...d);}
 box(x:number,y:number,z:number,w:number,h:number,d:number,tone=0){
  this.quad([x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],tone);
  this.quad([x,y,z+d],[x,y+h,z+d],[x+w,y+h,z+d],[x+w,y,z+d],tone);
  this.quad([x,y,z],[x,y+h,z],[x,y+h,z+d],[x,y,z+d],tone);
  this.quad([x+w,y,z],[x+w,y,z+d],[x+w,y+h,z+d],[x+w,y+h,z],tone);
  this.quad([x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d],tone);
 }
 build(parent:T.Object3D){
  for(const [i,vertices] of this.vertices.entries()){
   if(!vertices.length)continue;
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeBoundingSphere();
   parent.add(new T.Mesh(geometry,new T.MeshBasicMaterial({color:[0xe7decc,0xd8cdb8,0xc5bba9,0xebe5d8][i],side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1})));
  }
 }
}

export function createStreetscape(parent:T.Object3D,compact:boolean){
 const group=new T.Group();group.name='Tampa streetscape';parent.add(group);
 const pen=new Ink(),faces=new PaperFaces(),halfRoad=compact?4.5:8;
 const curb=(side:number)=>-34+side*halfRoad;
 const facade=(side:number)=>-34+side*(compact?7.7:11);
 const groundY=.025,walkY=.19;
 faces.quad([-124,-.04,-57],[-8,-.04,-57],[-8,-.04,-11],[-124,-.04,-11],3);

 for(const side of [-1,1]){
  const edge=curb(side),back=facade(side)+side*5;
  faces.box(-124,0,Math.min(edge,back),116,.16,Math.abs(edge-back),0);
  pen.line([-8,walkY,edge],[-124,walkY,edge]);
  pen.line([-8,.03,edge-side*.14],[-124,.03,edge-side*.14],1);
  pen.line([-8,walkY,edge+side*.28],[-124,walkY,edge+side*.28],1);
  for(let x=-10;x>-124;x-=2.15){
   pen.line([x,walkY,edge],[x,walkY,back],1);
   pen.line([x,0,edge],[x,.18,edge],1);
  }
  for(let z=edge+side*1.7;side*(back-z)>0;z+=side*1.7)pen.line([-8,walkY,z],[-124,walkY,z],1);
  // Recessed storm drains, gutters, and broken pencil shadows at the curb.
  for(let x=-21;x>-120;x-=14){
   const z=edge-side*.25;
   faces.box(x-.6,.018,Math.min(z,z-side*.55),1.2,.015,.55,2);
   for(let u=-.55;u<=.55;u+=.16)pen.line([x+u,.05,z],[x+u,.05,z-side*.55]);
   for(let n=0;n<12;n++)pen.line([x+n*.3,groundY,edge-side*.2],[x+n*.3+.7,groundY,edge-side*(.35+.16*Math.sin(n))],1);
  }
 }

 // Hand-laid brick crosswalks: staggered joints instead of a drafting grid.
 for(const crossing of [-32,-63,-104]){
  for(let row=0;row<7;row++){
   const x=crossing+row*.34;
   pen.line([x,groundY,-34-halfRoad+.1],[x,groundY,-34+halfRoad-.1],row===0||row===6?2:1);
   for(let z=-34-halfRoad+.2+(row%2)*.45;z<-34+halfRoad-.2;z+=.9)pen.line([x,groundY,z],[x+.34,groundY,z],1);
  }
 }
 // Worn center markings and quiet, irregular aggregate/cracks in the asphalt.
 for(let x=-17;x>-117;x-=9){
  for(const z of [-34.1,-33.9])pen.line([x,groundY,z],[x-3,groundY,z],1);
 }
 for(let n=0;n<175;n++){
  const x=-12-((n*13.73)%108),z=-34+Math.sin(n*9.17)*(halfRoad-.8);
  pen.line([x,groundY,z],[x+.08+(n%4)*.07,groundY,z+.04],1,false);
 }
 for(const x of [-23,-47,-72,-98]){
  const z=-34+Math.sin(x)*halfRoad*.5;
  pen.path([[x-2,groundY,z+.6],[x-1.2,groundY,z+.4],[x-.7,groundY,z-.15],[x,groundY,z],[x+.8,groundY,z-.5]],1);
  pen.line([x-.7,groundY,z-.15],[x-1.2,groundY,z-.8],1);
 }
 for(const x of [-39,-68,-91]){
  const z=-34+halfRoad*.4;
  for(const r of [.56,.65])pen.path(Array.from({length:33},(_,i)=>[x+Math.cos(i*TAU/32)*r,groundY,z+Math.sin(i*TAU/32)*r] as P),1,true);
  for(let d=-.4;d<=.4;d+=.16)pen.line([x-.38,groundY,z+d],[x+.38,groundY,z+d],1);
 }

 for(const [index,building] of frontages.entries()){
  const {x,w,h,side}=building,z=facade(side),depth=5+(index%3),dir=-side,accent=index%3===0?2:3;
  const p=(u:number,y:number,v=0):P=>[x+u*dir,y,z+v*dir];
  const line=(a:P,b:P,tone=0)=>pen.line(p(...a),p(...b),tone);
  const rect=(u:number,y:number,width:number,height:number,v=.035,tone=0)=>pen.path([p(u,y,v),p(u+width,y,v),p(u+width,y+height,v),p(u,y+height,v)],tone,true);
  const panel=(u:number,y:number,width:number,height:number,v:number,tone=0)=>faces.quad(p(u,y,v),p(u+width,y,v),p(u+width,y+height,v),p(u,y+height,v),tone);
  const prism=(u:number,y:number,v:number,width:number,height:number,d:number,tone=0)=>{
   const a=p(u,y,v),b=p(u+width,y,v+d);faces.box(Math.min(a[0],b[0]),y,Math.min(a[2],b[2]),width,height,d,tone);
  };
  prism(-w/2,.16,-depth,w,h,depth);
  rect(-w/2,.18,w,h);
  // Side walls remain articulated when the camera passes the frontage.
  for(const u of [-w/2,w/2]){
   line([u,.18,0],[u,.18,-depth]);line([u,h+.16,0],[u,h+.16,-depth]);line([u,h+.16,-depth],[u,.18,-depth]);
   for(let y=4.4;y<h-1;y+=2.6)for(let v=-1.2;v>-depth+.8;v-=1.8){
    pen.path([p(u,y,v),p(u,y+1.3,v),p(u,y+1.3,v-.7),p(u,y,v-.7)],1,true);
   }
  }
  for(const y of [.36,3.55,h-.3,h+.16]){
   prism(-w/2-.1,y,-.03,w+.2,.16,.25,y===3.55?1:0);rect(-w/2-.1,y,w+.2,.16,.25,y===3.55?accent:0);
   for(const u of [-w/2,w/2])line([u,y,.2],[u,y,-depth],1);
  }
  // Uneven parapets and roof drainage give the row a varied silhouette.
  const step=index%3===1?.8:.35;
  panel(-w*.34,h+.17,w*.68,step,0);rect(-w*.34,h+.17,w*.68,step);
  line([w/2-.2,h-.3,.08],[w/2-.2,.25,.08],1);
  const bays=Math.max(2,Math.floor(w/2.1)),bay=w/bays;
  for(let j=0;j<bays;j++){
   const u=-w/2+j*bay+.27,bw=bay-.54;
   panel(u,.45,bw,2.65,.025,2);rect(u,.45,bw,2.65);
   rect(u+.12,.6,bw-.24,2.32,.06,1);
   line([u,2.55,.09],[u+bw,2.55,.09],accent);
   line([u+bw*.55,.6,.09],[u+bw*.55,2.55,.09]);
   line([u+bw*.55+.15,1.45,.12],[u+bw*.55+.15,1.65,.12],accent);
   // Interior shelves and diagonal reflections stay very light.
   line([u+.2,1.05,.05],[u+bw-.2,1.05,.05],1);
   line([u+.2,1.6,.05],[u+bw-.25,2.2,.05],1);
   if(index%3!==2){
    faces.quad(p(u-.1,3.25,.06),p(u+bw+.1,3.25,.06),p(u+bw+.1,2.75,1),p(u-.1,2.75,1));
    line([u-.1,2.75,1],[u+bw+.1,2.75,1],accent);
    for(let a=0;a<=bw+.2;a+=.32){line([u-.1+a,3.25,.08],[u-.1+a,2.75,1.02],a<.65?accent:1);line([u-.1+a,2.75,1.02],[u-.1+a,2.55,1.02],accent);}
   }
   for(let y=4.15;y<h-1.2;y+=2.6){
    const wh=Math.min(1.65,h-y-.6);
    panel(u+.2,y,bw-.4,wh,.025,1);rect(u+.2,y,bw-.4,wh,.06);
    rect(u+.12,y-.12,bw-.24,.15,.14,1);
    line([u+bw*.5,y,.08],[u+bw*.5,y+wh,.08],j===0?accent:1);
    line([u+.2,y+wh*.5,.08],[u+bw-.2,y+wh*.5,.08],1);
    if(index%4===0){
     for(const a of [u-.04,u+bw-.12]){rect(a,y,.24,wh,.08,accent);for(let s=y+.15;s<y+wh;s+=.2)line([a,s,.09],[a+.24,s,.09],1);}
    }
   }
  }
  if(index%3===1){
   // Slender wrought-iron balcony with repeating vertical balusters.
   faces.quad(p(-w*.43,3.85,.1),p(w*.43,3.85,.1),p(w*.43,3.85,1),p(-w*.43,3.85,1),1);
   for(const y of [3.88,4.1,4.85])line([-w*.43,y,1],[w*.43,y,1],y===4.85?accent:0);
   for(let u=-w*.43;u<=w*.43;u+=.3)line([u,3.88,1],[u,4.85,1],1);
   for(const u of [-w*.43,w*.43])line([u,4.85,.05],[u,4.85,1]);
  }
  // Selective masonry joints, not a uniform wireframe over the whole facade.
  for(let row=0;row<Math.floor(h/.32);row++){
   const y=.5+row*.32,span=.34+(row%5)*.12;
   line([-w/2+.04,y,.045],[-w/2+span,y,.045],1);
   if(row%2===0)line([w/2-.5,y,.045],[w/2-.04,y,.045],1);
  }
 }

 function palm(x:number,side:number,height:number,seed:number){
  const z=curb(side)+side*1.2,bend=.35*Math.sin(seed),radius=.17;
  faces.box(x-.7,.17,z-.7,1.4,.015,1.4,2);
  pen.path([[x-.75,walkY,z-.75],[x+.75,walkY,z-.75],[x+.75,walkY,z+.75],[x-.75,walkY,z+.75]],1,true);
  for(let j=0;j<14;j++){
   const y=.2+j*height/14,y2=.2+(j+1)*height/14;
   const cx=x+bend*(j/14)**2,cx2=x+bend*((j+1)/14)**2;
   for(let s=0;s<8;s++){
    const a=s*TAU/8,b=(s+1)*TAU/8;
    faces.quad([cx+Math.cos(a)*radius,y,z+Math.sin(a)*radius],[cx+Math.cos(b)*radius,y,z+Math.sin(b)*radius],[cx2+Math.cos(b)*radius*.97,y2,z+Math.sin(b)*radius*.97],[cx2+Math.cos(a)*radius*.97,y2,z+Math.sin(a)*radius*.97],1);
   }
   pen.path(Array.from({length:13},(_,i)=>[cx+Math.cos(i*TAU/12)*(radius+.025),y+.025*Math.sin(i*TAU/12),z+Math.sin(i*TAU/12)*(radius+.025)] as P),1,true);
  }
  pen.path(Array.from({length:15},(_,j)=>[x+bend*(j/14)**2-radius,.2+j*height/14,z] as P));
  pen.path(Array.from({length:15},(_,j)=>[x+bend*(j/14)**2+radius,.2+j*height/14,z] as P),1);
  for(const s of [-1,1])pen.path(Array.from({length:15},(_,j)=>[x+bend*(j/14)**2,.2+j*height/14,z+s*(radius+.025)] as P),1);
  for(let f=0;f<10;f++){
   const a=f*TAU/10+seed,length=2.1+(f%3)*.4;
   const frond=(t:number):P=>[x+bend+Math.cos(a)*length*t,.2+height+Math.sin(t*Math.PI)*.85-t*t*.8,z+Math.sin(a)*length*t];
   pen.path(Array.from({length:13},(_,i)=>frond(i/12)),f%3===0?0:4);
   for(let j=2;j<12;j++){
    const t=j/12,start=frond(t),spread=Math.sin(t*Math.PI)*.52;
    for(const s of [-1,1])pen.path([start,[start[0]+Math.cos(a+.9*s)*spread,start[1]-.2,start[2]+Math.sin(a+.9*s)*spread],[start[0]+Math.cos(a+.65*s)*spread*1.4,start[1]-.5,start[2]+Math.sin(a+.65*s)*spread*1.4]],f%3===0?1:4);
   }
  }
 }
 for(const side of [-1,1]){
  for(const [i,x] of (side===1?[-25,-49,-66,-78,-108]:[-31,-42,-70,-86,-113]).entries())palm(x,side,8.1+(i%3)*1.15,i+side*2);
  for(const x of [-17,-54,-77,-105]){
   const z=curb(side)+side*.55;
   faces.box(x-.12,.16,z-.12,.24,6.4,.24,1);
   pen.line([x-.12,.2,z],[x-.12,6.5,z]);pen.line([x+.12,.2,z],[x+.12,6.5,z],1);
   pen.path([[x,6.5,z],[x,6.85,z-side*.35],[x,6.9,z-side*.8],[x,6.65,z-side*1.1]],3);
   pen.path([[x-.32,6.65,z-side*1.1],[x+.32,6.65,z-side*1.1],[x+.25,6.35,z-side*1.1],[x-.25,6.35,z-side*1.1]],0,true);
  }
 }
 // Slatted benches, cafe tables, and bicycles occupy the sidewalk, never the lane.
 for(const [x,side] of [[-23,1],[-56,1],[-74,-1],[-110,1]]){
  const z=curb(side)+side*1.7;
  for(let s=0;s<4;s++){
   const zz=z+(s-.5)*.16;
   faces.box(x-1,.8,zz,2,.08,.12);pen.line([x-1,.9,zz],[x+1,.9,zz],s===0?3:0);
   pen.line([x-1,1.15+s*.13,z+side*.55],[x+1,1.15+s*.13,z+side*.55],1);
  }
  for(const u of [-.8,.8]){pen.line([x+u,.2,z],[x+u,.9,z]);pen.line([x+u,.2,z+side*.55],[x+u,1.6,z+side*.55]);}
 }
 for(const [x,side] of [[-60,1],[-84,-1]]){
  const z=facade(side)-side*1.3;
  const rim=Array.from({length:25},(_,j)=>[x+Math.cos(j*TAU/24)*.55,1.25,z+Math.sin(j*TAU/24)*.55] as P);
  pen.path(rim,2,true);pen.line([x,.2,z],[x,1.25,z]);
  for(const a of [0,Math.PI]){
   const xx=x+Math.cos(a)*.95;
   pen.path([[xx-.22,.2,z-.25],[xx-.22,.75,z-.25],[xx+.22,.75,z-.25],[xx+.22,.2,z-.25]],1);
   pen.path([[xx-.22,.2,z+.25],[xx-.22,1.4,z+.25],[xx+.22,1.4,z+.25],[xx+.22,.2,z+.25]],1);
   pen.line([xx-.22,.75,z-.25],[xx-.22,.75,z+.25]);pen.line([xx+.22,.75,z-.25],[xx+.22,.75,z+.25]);
  }
 }
 for(const [x,side] of [[-51,1],[-82,-1]]){
  const z=curb(side)+side*1.1;
  for(const u of [-.72,.72]){pen.circle(x+u,.66,z,.46);for(let i=0;i<8;i++){const a=i*TAU/8;pen.line([x+u,.66,z],[x+u+Math.cos(a)*.44,.66+Math.sin(a)*.44,z],1);}}
  pen.path([[x-.72,.66,z],[x-.25,1.38,z],[x+.15,.66,z],[x-.72,.66,z],[x+.55,1.4,z],[x+.15,.66,z]],3);
  pen.line([x+.55,1.4,z],[x+.72,.66,z]);pen.path([[x+.45,1.65,z],[x+.55,1.4,z],[x+.8,1.65,z]]);
  pen.line([x-.43,1.43,z],[x-.07,1.43,z]);
 }

 // Two parked cars supply familiar scale, drawn with a few body contours.
 for(const [x,side] of [[-57,1],[-79,-1]]){
  const z=curb(side)-side*1.1;
  faces.box(x-2,.4,z-.78,4,.65,1.56,0);
  const profile:P[]=[[-2,.45,0],[-2,1,0],[-1.3,1.12,0],[-.7,1.8,0],[.85,1.8,0],[1.4,1.1,0],[2,1,0],[2,.45,0]];
  for(const dz of [-.79,.79]){
   pen.path(profile.map(([u,y])=>[x+u,y,z+dz] as P),0,true);
   faces.quad([x-1.3,1.1,z+dz],[x-.7,1.8,z+dz],[x+.85,1.8,z+dz],[x+1.4,1.1,z+dz],1);
   pen.line([x+.1,1.12,z+dz],[x+.1,1.78,z+dz],3);
   for(const u of [-1.25,1.25]){pen.circle(x+u,.48,z+dz,.37);pen.circle(x+u,.48,z+dz,.18,1);}
  }
  faces.quad([x-.7,1.8,z-.78],[x+.85,1.8,z-.78],[x+.85,1.8,z+.78],[x-.7,1.8,z+.78]);
  for(const u of [-2,-.7,.85,2])pen.line([x+u,u===-2||u===2?1:1.8,z-.79],[x+u,u===-2||u===2?1:1.8,z+.79],1);
 }
 faces.build(group);pen.build(group);
 return group;
}
