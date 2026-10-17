// Original stroke alphabet and drafting marks. All annotations remain 3D linework.
const alphabet={
 A:'04 20 44|13 33',B:'04 00 30 41 32 02|32 43 34 04',C:'40 10 01 03 14 44',D:'04 00 20 41 43 24 04',E:'40 00 04 44|02 32',F:'04 00 40|02 32',G:'40 10 01 03 14 44 42 22',H:'00 04|40 44|02 42',I:'00 40|20 24|04 44',J:'00 40 43 34 14 03',K:'00 04|40 02 44',L:'00 04 44',M:'04 00 22 40 44',N:'04 00 44 40',O:'10 30 41 43 34 14 03 01 10',P:'04 00 30 41 32 02',Q:'10 30 41 43 34 14 03 01 10|23 44',R:'04 00 30 41 32 02|22 44',S:'40 10 01 12 32 43 34 04',T:'00 40|20 24',U:'00 03 14 34 43 40',V:'00 24 40',W:'00 14 22 34 40',X:'00 44|40 04',Y:'00 22 40|22 24',Z:'00 40 04 44',
 '0':'10 30 41 43 34 14 03 01 10|03 41','1':'11 20 24|14 34','2':'00 30 41 32 04 44','3':'00 30 41 22 43 34 04','4':'30 02 42|30 34','5':'40 00 02 32 43 34 04','6':'40 10 01 03 14 34 43 32 02','7':'00 40 14','8':'10 30 41 32 12 01 10|12 03 14 34 43 32','9':'42 12 01 10 30 41 43 34 04','-':'02 42','/':'40 04','.':'24 25'
};
export const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
export const circle=(x,y,r,count=48)=>Array.from({length:count+1},(_,i)=>[x+Math.cos(i/count*Math.PI*2)*r,y+Math.sin(i/count*Math.PI*2)*r]);
export function draft(){
 const strokes=[];
 const line=(a,b,kind='ink')=>strokes.push({points:[a,b],kind});
 const path=(points,kind='ink')=>strokes.push({points,kind});
 const box=(x,y,w,h,kind='ink')=>path([...rect(x,y,w,h),[x,y]],kind);
 const label=(text,x,y,height=.24,kind='guide')=>{
  for(const character of text.toUpperCase()){
   const glyph=alphabet[character];if(glyph)for(const stroke of glyph.split('|'))path(stroke.split(' ').map(p=>[x+Number(p[0])*height/5,y+(4-Number(p[1]))*height/4]),kind);x+=height*1.15;
  }
 };
 const hatch=(x,y,w,h,count=12)=>{for(let i=0;i<count;i++){const t=i/count;line([x+t*w,y],[x+Math.min(w,t*w+.2),y+h],'pencil');}};
 const rosette=(x,y,r)=>{path(circle(x,y,r),'pencil');path(circle(x,y,r*.8));for(let i=0;i<12;i++){const a=i*Math.PI/6;path(Array.from({length:13},(_,j)=>{const t=j*Math.PI/6,rr=r*(.32+.36*(1-Math.cos(t)));return [x+rr*Math.cos(a+.12*Math.sin(t)),y+rr*Math.sin(a+.12*Math.sin(t))];}),'pencil');}};
 const dimension=(a,b,text)=>{line(a,b,'guide');for(const p of [a,b])line([p[0]-.12,p[1]-.12],[p[0]+.12,p[1]+.12],'guide');label(text,(a[0]+b[0])/2-.6,(a[1]+b[1])/2+.15,.18);};
 return {strokes,line,path,box,label,hatch,rosette,dimension};
}
export function arch(x,y,w,h){const r=w/2,spring=y+h-r;return [[x-w/2,y],[x+w/2,y],...Array.from({length:25},(_,i)=>[x+Math.cos(i*Math.PI/24)*r,spring+Math.sin(i*Math.PI/24)*r])];}
export function windowDrawing(d,x,y,w,h,{arched=true,lights=false}={}){
 const outline=arched?arch(x,y,w,h):rect(x-w/2,y,w,h);d.path([...outline,outline[0]]);d.box(x-w/2-.12,y-.12,w+.24,.12,'pencil');
 const spring=arched?y+h-w/2:y+h;
 for(const side of [-1,0,1])d.line([x+side*w*.24,y],[x+side*w*.24,spring],'pencil');
 for(let t=y+.55;t<spring;t+=.65)d.line([x-w/2,t],[x+w/2,t],'pencil');
 if(lights)for(let i=0;i<6;i++)d.line([x-w*.3+i*.06,y+h*.3-.08*(i%2)],[x-w*.1+i*.04,y+h*.57+.09*(i%3)],'accent');
}
