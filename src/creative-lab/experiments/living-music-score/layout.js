import {notatedEvents} from './music.js';
export const staffStep=pitch=>pitch.diatonic-(4*7+2); // E4 is the bottom line.
export const pitchY=(pitch,bottom,gap)=>bottom-staffStep(pitch)*gap/2;
export function layoutScore(composition,{width=1040,staffSize=1}={}){
 const gap=14*staffSize,margin=width<750?34:60,barsPerRow=width<750?1:2,measureCount=composition.totalBeats/composition.meter.beats,rows=Math.ceil(measureCount/barsPerRow),rowHeight=166*staffSize,top=178,fragments=notatedEvents(composition),systems=[],bars=[],beams=[],ties=[];
 for(let row=0;row<rows;row++){const y=top+row*rowHeight,bottom=y+gap*4,clefSpace=row===0?90:65,barWidth=(width-margin*2-clefSpace)/barsPerRow;systems.push({row,x:margin,right:width-margin,y,bottom,gap,start:row*barsPerRow*composition.meter.beats});
  for(let column=0;column<barsPerRow;column++){const measure=row*barsPerRow+column;if(measure>=measureCount)break;const left=margin+clefSpace+column*barWidth,right=left+barWidth,items=fragments.filter(f=>f.measure===measure),weights=items.map(f=>Math.sqrt(f.duration)+.3+(f.accidental?.length ? .35 : 0)),sum=weights.reduce((a,b)=>a+b,0);let used=0;
   for(let i=0;i<items.length;i++){const f=items[i],padding=18*staffSize;f.x=left+padding+(barWidth-padding*2)*(used+.24*weights[i])/sum;f.y=f.info?pitchY(f.info,bottom,gap):y+gap*2;f.row=row;f.gap=gap;f.bottom=bottom;f.staffTop=y;f.direction=f.info&&staffStep(f.info)>=4?-1:1;f.stemX=f.x+(f.direction===1?6:-6)*staffSize;f.stemY=f.y-f.direction*gap*3.25;f.ledger=[];if(f.info){const step=staffStep(f.info);for(let l=-2;l>=step;l-=2)f.ledger.push(bottom-l*gap/2);for(let l=10;l<=step;l+=2)f.ledger.push(bottom-l*gap/2);}used+=weights[i];}
   for(let i=0;i<items.length;){const f=items[i];if(f.value!=='eighth'||!f.info){i++;continue;}const group=[f];let j=i+1;while(j<items.length&&items[j].value==='eighth'&&items[j].info&&Math.floor(items[j].beat)===Math.floor(f.beat)){group.push(items[j++]);}if(group.length>1){const direction=group.reduce((a,n)=>a+staffStep(n.info),0)/group.length>=4?-1:1;const slope=Math.max(-.1,Math.min(.1,(group.at(-1).y-group[0].y)/(group.at(-1).x-group[0].x)));let intercept=direction===1?Math.min(...group.map(n=>n.y-gap*3.2-slope*n.x)):Math.max(...group.map(n=>n.y+gap*3.2-slope*n.x));for(const n of group){n.direction=direction;n.stemX=n.x+(direction===1?6:-6)*staffSize;n.stemY=intercept+slope*n.stemX;n.beamed=true;}beams.push({notes:group,start:f.start,row,direction});}i=j;}
   bars.push({measure,row,left,right,y,bottom,items,final:measure===measureCount-1});
  }
  systems.at(-1).right=bars.at(-1).right;
 }
 for(let i=0;i<fragments.length-1;i++){const a=fragments[i],b=fragments[i+1];if(a.tieOut&&a.eventId===b.eventId){if(a.row===b.row)ties.push({a,b,row:a.row});else{ties.push({a,b:null,row:a.row,right:width-margin});ties.push({a:null,b,row:b.row,left:systems[b.row].x+55});}}}
 return {width,height:top+rows*rowHeight+40,gap,staffSize,systems,bars,fragments,beams,ties,rows,measureCount};
}
