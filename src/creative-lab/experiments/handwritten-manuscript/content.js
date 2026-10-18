// Original demonstration writing. No passages reproduced from books or the reference image.
export const TEXTS={
 manuscript:'The page was not a surface. It was the distance between two rooms. I put a word beside another word and a staircase appeared. Every margin kept a little weather. Every sentence carried the weight of a door. Read slowly: the floor is still deciding which way to fall.',
 stairs:'A step remembers the sentence that held it. Above is only a direction we agreed upon. Turn the book and the wall becomes a road. Nothing has moved except the reader. There is another landing beyond the last full stop.',
 cathedral:'Inside the letter there is more space than the letter can contain. The quiet is made of small black marks. A column is a thought repeated until it can bear a ceiling. We entered through an opening in the word OPEN.',
 library:'This room has been here before, but its ceiling was our floor. The shelves keep no books. They keep the routes we did not take. Follow the sentence until it returns wearing another orientation. The end of the manuscript is a hinge.',
 cyrillic:'Страница оказалась комнатой. Между словами осталась дверь. Стена стала полом, когда читатель повернул голову. Мы вернулись к началу с другой стороны. Тишина держит потолок.'
};
export const CHAPTERS=[{name:'The Manuscript',start:0,at:0,note:'An unfinished draft. Someone has written in the margins.'},{name:'The Staircases',start:.2,at:.29,note:'Climb the sentence. The wall ahead will become your floor.'},{name:'The Letter Cathedral',start:.62,at:.68,note:'A room larger than the opening that contains it.'},{name:'The Endless Library',start:.8,at:.85,note:'The same sentence returns on another ceiling.'}];
export const DEFAULTS={density:.9,font:'mixed',weight:500,letterSize:1.1,scale:1,complexity:2,speed:1,gravity:0,perspective:54,contrast:.94,extrusion:.16,depth:1,recursion:1,mode:'guided',imperfection:.65,customText:''};
export const RECIPES={
 literary:{...DEFAULTS},
 staircases:{...DEFAULTS,font:'ballpoint',weight:700,density:.9,complexity:3,contrast:1},
 cathedral:{...DEFAULTS,font:'ink',letterSize:1.15,scale:1.2,extrusion:.6,density:1.2},
 infinite:{...DEFAULTS,font:'graphite',density:1.3,depth:1.5,complexity:3,recursion:2},
 inverted:{...DEFAULTS,font:'mixed',weight:700,gravity:180,contrast:1,imperfection:.35}
};
// Architectural data, not rendering code. All transforms are local, right-handed XYZ.
export const DEMO={version:1,title:'The Handwritten Manuscript',texts:TEXTS,chapters:CHAPTERS,
 rooms:[
  {id:'stairs',flatOpening:true,title:'The Manuscript / The Staircases',structures:[
   {kind:'paragraph',position:[9,-2,12],width:18,height:1.5,text:'cyrillic',rotation:[0,0,Math.PI/2]},
   {kind:'paragraph',position:[-9,16,11],width:18,height:1.5,text:'manuscript',rotation:[0,0,-Math.PI/2]},
   {kind:'paragraph',position:[-10,-2,13],width:20,height:1.5,text:'stairs'},
   {kind:'paragraph',position:[-10,0,7],width:6,height:14,text:'manuscript'},
   {kind:'paragraph',position:[10,14,3],width:7,height:10,text:'cyrillic',rotation:[0,0,Math.PI]},
   {kind:'paragraph',position:[10,18,-5],width:20,height:5,text:'stairs',rotation:[0,0,Math.PI]},
   {kind:'paragraph',position:[-9,-2,-9],width:18,height:8,text:'manuscript'},
   {kind:'wall',position:[-7,0,-4],width:24,height:15,text:'stairs',rotation:[0,Math.PI/2,0]},
   {kind:'wall',position:[7,0,-7],width:24,height:14,text:'cyrillic',rotation:[0,-Math.PI/2,0]},
   {kind:'stairs',position:[0,0,10],steps:20,rise:.26,run:.65,width:4.2,text:'stairs'},
   {kind:'stairs',position:[5,7,-5],rotation:[0,0,Math.PI/2],steps:16,rise:.2625,run:.625,width:3.6,text:'manuscript'},
   {kind:'stairs',position:[-5,12,-1],rotation:[0,0,Math.PI],steps:14,rise:.28,run:.7,width:3,text:'cyrillic'},
   {kind:'bridge',position:[-6,10,-4],width:13,height:2,text:'stairs',rotation:[0,0,-.18]},
   {kind:'bridge',position:[9.7,4,8],rotation:[0,0,Math.PI/2],width:4,height:9,text:'library'},
   {kind:'bridge',position:[-6,0,13],width:12,height:6,text:'manuscript'},
   {kind:'column',position:[-5,0,3],height:13,radius:.8,text:'cyrillic'},
   {kind:'column',position:[5,-2,1],height:13,radius:.8,text:'stairs'},
   {kind:'monument',position:[-7,4,5],letter:'R',size:6},
   {kind:'monument',position:[7,9,-3],letter:'A',size:5,rotation:[0,0,Math.PI]},
   {kind:'shaft',position:[-4,-3,-7],height:25,radius:2,text:'manuscript'},
   {kind:'anamorph',position:[0,7,-4],text:'THE WALL IS A FLOOR',width:6}
  ]},
  {id:'cathedral',title:'The Letter Cathedral',structures:[
   {kind:'bridge',position:[-7,2.3,13],width:14,height:29,text:'cathedral'},
   {kind:'wall',position:[-8,0,-5],width:36,height:22,text:'cathedral',rotation:[0,Math.PI/2,0]},
   {kind:'wall',position:[8,0,-5],width:36,height:22,text:'cyrillic',rotation:[0,-Math.PI/2,0]},
   ...[-5,5].flatMap(x=>[5,-4,-11].map(z=>({kind:'column',position:[x,0,z],height:19,radius:1.2,text:'cathedral'}))),
   {kind:'monument',position:[-7,6,-7],letter:'B',size:11},
   {kind:'monument',position:[7,8,-10],letter:'P',size:12,rotation:[0,0,Math.PI]},
   {kind:'paragraph',position:[-9,20,-18],rotation:[Math.PI/2,0,0],width:18,height:28,text:'cathedral'},
   {kind:'ring',position:[0,8,-3],radius:6,text:'cathedral'},
   {kind:'dissolve',position:[-4,5,1],width:8,height:4,text:'cathedral'}
  ]},
  {id:'library',repeatGallery:true,title:'The Endless Library',structures:[
   {kind:'bridge',position:[-6,1.3,14],width:12,height:31,text:'library'},
   {kind:'bridge',position:[-6,7,14],width:12,height:31,text:'cyrillic',rotation:[0,0,Math.PI]},
   ...[-6,6].flatMap(x=>[9,3,-3,-9].map((z,i)=>({kind:'paragraph',position:[x,0,z],width:8,height:9,text:i%2?'cyrillic':'library',rotation:[0,x<0?Math.PI/2:-Math.PI/2,i%2?Math.PI:0]}))),
   {kind:'ring',position:[0,3,-1],radius:4,text:'library'},
   {kind:'shaft',position:[-5,-10,-7],height:28,radius:1.5,text:'cyrillic'},
   ...[-5,5].map(x=>({kind:'column',position:[x,0,-6],height:10,radius:.55,text:'library'}))
  ]}
 ],
 // Each pair identifies coincident local picture planes in different scene coordinates.
 portals:[
  {id:'threshold',from:'stairs',to:'cathedral',fromZone:'turned',toZone:'main',position:[-.9,7,-18],rotation:[0,0,Math.PI/2],destination:[0,4,12],destinationRotation:[0,0,0],width:4.2,height:6.1,letter:'O'},
  {id:'folio',from:'cathedral',to:'library',position:[0,4,-14],rotation:[0,0,0],destination:[0,3,12],destinationRotation:[0,0,0],width:4.2,height:6.1,letter:'O'},
  {id:'return',from:'library',to:'stairs',fromZone:'main',toZone:'return',position:[0,3,-14],rotation:[0,0,Math.PI],destination:[8,6,8],destinationRotation:[0,0,Math.PI/2],width:4.2,height:6.1,letter:'O'}
 ],
 navigation:[
  {id:'main',room:'stairs',position:[0,0,0],rotation:[0,0,0],bounds:[-5,5,-3.6,17],floor:0,ramp:{startZ:10,slope:.4,maximum:5.2,width:3.2}},
  {id:'turned',room:'stairs',position:[5,7,-5],rotation:[0,0,Math.PI/2],bounds:[-1.4,1.4,-13.5,1],floor:0,ramp:{startZ:0,slope:.42,maximum:4.2,width:2.8}},
  {id:'return',room:'stairs',position:[9.7,6,8],rotation:[0,0,Math.PI/2],bounds:[-1.4,1.4,-8,.5],floor:0},
  {id:'main',room:'cathedral',position:[0,0,0],rotation:[0,0,0],bounds:[-6.3,6.3,-14.5,12.5],floor:2.3},
  {id:'main',room:'library',position:[0,0,0],rotation:[0,0,0],bounds:[-4.8,4.8,-14.5,12.5],floor:1.3}
 ],
 route:[
  {p:0,room:'stairs',position:[0,6,53],target:[0,6,0],roll:0},
  {p:.12,room:'stairs',position:[0,5,25],target:[0,4,-5],roll:0},
  {p:.20,room:'stairs',position:[0,1.7,12],target:[0,4,-6],roll:0},
  {p:.36,room:'stairs',position:[0,6.9,-3],target:[0,7,-12],roll:0},
  {p:.43,room:'stairs',position:[1.3,7,-4],target:[1.3,7,-14],roll:0},
  {p:.51,room:'stairs',zone:'turned',position:[3.3,7,-5],target:[3.3,7,-15],roll:90},
  {p:.58,room:'stairs',zone:'turned',position:[-.9,7,-15],target:[-.9,7,-25],roll:90},
  {p:.62,room:'stairs',zone:'turned',position:[-.9,7,-18],target:[-.9,7,-28],roll:90},
  {p:.62,room:'cathedral',position:[0,4,12],target:[0,4,2],roll:0},
  {p:.69,room:'cathedral',position:[0,4,3],target:[0,5,-10],roll:0},
  {p:.76,room:'cathedral',position:[0,4,-9],target:[0,4,-19],roll:0},
  {p:.80,room:'cathedral',position:[0,4,-14],target:[0,4,-24],roll:0},
  {p:.80,room:'library',position:[0,3,12],target:[0,3,2],roll:0},
  {p:.85,room:'library',position:[0,3,5],target:[0,3,-5],roll:0},
  {p:.91,room:'library',position:[0,3,-9],target:[0,3,-19],roll:180},
  {p:.94,room:'library',position:[0,3,-14],target:[0,3,-24],roll:180},
  {p:.94,room:'stairs',zone:'return',position:[8,6,8],target:[8,6,-2],roll:90},
  {p:1,room:'stairs',zone:'return',position:[8,6,3],target:[0,7,-5],roll:90}
 ]
};
