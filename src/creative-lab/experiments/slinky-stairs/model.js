// An authored, physically informed trajectory. Every pose is a pure function of p.
export const DEFAULTS=Object.freeze({coils:48,thickness:.018,diameter:1.9,stiffness:1,steps:8,tread:3.1,rise:.72,width:3.8,compression:.76,stretch:1,speed:1,slowMotion:1,style:'pencil',camera:'tracking',angle:34,azimuth:32,progress:0,guides:true});
export const RANGES={coils:[28,72],thickness:[.01,.028],diameter:[1.25,2.3],stiffness:[.5,1.6],steps:[6,10],tread:[2.8,4],rise:[.4,1.15],width:[3,5.5],compression:[.35,.95],stretch:[.7,1.45],speed:[.35,2],slowMotion:[.15,1],angle:[18,65],azimuth:[-30,65],progress:[0,100]};
export function options(value={}){const s={...DEFAULTS,...value};for(const key of Object.keys(s))if(!(key in DEFAULTS))throw new Error(`Unknown setting: ${key}`);for(const [key,[lo,hi]]of Object.entries(RANGES))if(!Number.isFinite(s[key])||s[key]<lo||s[key]>hi)throw new Error(`Invalid ${key}`);for(const key of ['coils','steps'])if(!Number.isInteger(s[key]))throw new Error(`${key} must be an integer`);if(!['pencil','engraving','ivory','stone'].includes(s.style)||!['fixed','tracking'].includes(s.camera)||typeof s.guides!=='boolean')throw new Error('Invalid appearance or camera settings');return s;}
export const PRESETS={
 pencil:{name:'01 / Architectural pencil',settings:{...DEFAULTS}},
 engraving:{name:'02 / Antique mechanism',settings:{...DEFAULTS,style:'engraving',coils:58,thickness:.016,stiffness:1.25,stretch:.9,angle:28}},
 ivory:{name:'03 / An ivory descent',settings:{...DEFAULTS,style:'ivory',diameter:2.1,coils:40,thickness:.025,compression:.85,guides:false,angle:30}},
 stone:{name:'04 / Steel & limestone',settings:{...DEFAULTS,style:'stone',coils:64,thickness:.016,stretch:1.12,angle:24,azimuth:22}}
};
export const clamp=(x,lo=0,hi=1)=>Math.max(lo,Math.min(hi,x));
export const smooth=t=>{const x=clamp(t);return x*x*x*(x*(x*6-15)+10);};
export const mix=(a,b,t)=>a+(b-a)*t;
export const noise=i=>{const n=Math.sin(i*127.1+51.7)*43758.5453;return n-Math.floor(n);};
export function createStairs(s=DEFAULTS){return {version:1,treads:Array.from({length:s.steps+1},(_,i)=>({x:i*s.tread,y:-i*s.rise,depth:s.tread,width:s.width}))};}
export function validateStairs(input){
 if(input?.version!==1||!Array.isArray(input.treads)||input.treads.length<2||input.treads.length>20)throw new Error('Define 2–20 descending treads');
 for(let i=0;i<input.treads.length;i++){const t=input.treads[i];for(const key of ['x','y','depth','width'])if(!Number.isFinite(t[key]))throw new Error('Stair coordinates must be finite');if(t.depth<2.4||t.depth>6||t.width<2.6||t.width>8||Math.abs(t.x)>100||Math.abs(t.y)>100)throw new Error('Unsupported stair dimensions');if(i){const previous=input.treads[i-1];if(t.y>=previous.y||previous.y-t.y>1.6||Math.abs(t.x-t.depth/2-(previous.x+previous.depth/2))>1e-6)throw new Error('Treads must touch edge-to-edge and descend along +X');}}
 return input;
}
export function floorAt(x,stairs){let y=stairs.treads[0].y;for(const t of stairs.treads){if(x>=t.x-t.depth/2-1e-8)y=t.y;else break;}return y;}
export const restHeight=s=>Math.max(s.diameter*.42,s.coils*s.thickness*(1.12+(1-s.compression)*.8));
export function cycleAt(progress,settings=DEFAULTS,stairs=createStairs(settings)){
 if(!Number.isFinite(progress))throw new Error('Progress must be finite');const p=clamp(progress),count=stairs.treads.length-1,step=Math.min(count-1,Math.floor(p*count)),phase=p===1?1:p*count-step;
 const a=stairs.treads[step],b=stairs.treads[step+1],d=b.x-a.x,h=a.y-b.y,base=settings.thickness/2+.004,H=restHeight(settings),land=.53+(settings.stiffness-1)*.025,rho=d/2,R=(settings.diameter-settings.thickness)/2;
 const arcWeight=1-R/rho,minimum=settings.coils*settings.thickness*1.1,K=Math.max(0,(minimum-Math.PI*(rho-R)-h)/2)+settings.diameter*.15*(settings.stretch-.7);
 const height=H*(1-settings.compression*.08*Math.sin(Math.PI*smooth((phase-.76)/.24))**2);
 let origin,side,alpha,stem,tail,reverse;
 if(phase<=land){const u=smooth(phase/land);origin=[a.x,a.y+base];side=1;alpha=Math.PI*u;stem=mix(H,K,u);tail=(K+h)*smooth((u-.55)/.45);reverse=step%2===1;}
 else{const v=smooth((phase-land)/(1-land));origin=[b.x,b.y+base];side=-1;alpha=Math.PI*(1-v);stem=mix(K+h,height,v);tail=K*(1-v);reverse=step%2===0;}
 const arc=rho*alpha;stem+=Math.max(0,minimum-(stem+tail+arc*arcWeight));
 const label=phase<.13?'Tip':phase<.35?'Stretch':phase<land?'Fall':phase<.69?'Land':phase<.84?'Follow':'Compress & recover';
 return {progress:p,step,phase,land,label,origin,side,alpha,stem,tail,rho,arc,arcWeight,weightedLength:stem+tail+arc*arcWeight,reverse,parity:step%2,restHeight:H,height,from:a,to:b,clearance:base,tracking:[mix(a.x,b.x,smooth(phase)),mix(a.y,b.y,smooth(phase)),0],contacts:{upper:phase<=land,lower:phase>=land}};
}
export function centerline(u,c){
 const q=c.reverse?1-u:u,d=q*c.weightedLength;let x,y,tx,ty;
 if(d<=c.stem){x=c.origin[0];y=c.origin[1]+d;tx=0;ty=1;}
 else if(d<=c.stem+c.arc*c.arcWeight&&c.arc>1e-8){const phi=(d-c.stem)/(c.rho*c.arcWeight);x=c.origin[0]+c.side*c.rho*(1-Math.cos(phi));y=c.origin[1]+c.stem+c.rho*Math.sin(phi);tx=c.side*Math.sin(phi);ty=Math.cos(phi);}
 else{const length=d-c.stem-c.arc*c.arcWeight;x=c.origin[0]+c.side*(c.rho*(1-Math.cos(c.alpha))+length*Math.sin(c.alpha));y=c.origin[1]+c.stem+c.rho*Math.sin(c.alpha)+length*Math.cos(c.alpha);tx=c.side*Math.sin(c.alpha);ty=Math.cos(c.alpha);}
 if(c.reverse){tx=-tx;ty=-ty;}return {x,y,tx,ty};
}
// Material-coordinate coil sampling keeps both ends continuous across handovers.
// A conservative tube-radius contact correction keeps all tube vertices above treads.
export function sampleSpring(progress,settings=DEFAULTS,stairs=createStairs(settings),segments=settings.coils*32,output){
 const cycle=cycleAt(progress,settings,stairs),points=output||new Float32Array((segments+1)*3),radius=(settings.diameter-settings.thickness)/2,wire=settings.thickness/2;let corrected=0,maxCorrection=0,arcLength=0;
 for(let i=0;i<=segments;i++){const u=i/segments,c=centerline(u,cycle),theta=Math.PI*2*settings.coils*u,cs=Math.cos(theta),sn=Math.sin(theta),x=c.x+radius*c.ty*cs,z=radius*sn,rawY=c.y-radius*c.tx*cs,minimum=floorAt(x-wire,stairs)+wire+.003,y=Math.max(rawY,minimum),lift=y-rawY;
  if(lift>.00001)corrected++;maxCorrection=Math.max(maxCorrection,lift);points.set([x,y,z],i*3);if(i)arcLength+=Math.hypot(x-points[(i-1)*3],y-points[(i-1)*3+1],z-points[(i-1)*3+2]);
 }
 return {points,cycle,corrected,maxCorrection,arcLength,segments};
}
