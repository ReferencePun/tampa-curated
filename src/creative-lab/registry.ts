export interface Setting {
  key:string; label:string; type:'range'|'toggle'|'color'|'select'|'number'; default:string|number|boolean;
  min?:number; max?:number; step?:number; options?:{value:string;label:string}[];
}
export interface Experiment {
  id:string;slug:string;number:string;order:number;name:string;description:string;category:string;tags:string[];
  status:'prototype'|'working'|'polished';placeholder:boolean;technology:string[];plannedTechnology:string|null;
  comparison:'none'|'lightweight';
  dependencies:Record<string,string>;settings:Setting[];entry:string;styles:string[];thumbnail:string;readme:string;
  license:string;assets:{path:string;credit:string;license:string}[];compatibility:string[];notes:string[];reuse:string[];
}
const manifests=import.meta.glob('./experiments/*/manifest.json',{eager:true,import:'default'});
export const experiments=Object.values(manifests).map(value=>value as Experiment).sort((a,b)=>a.order-b.order);
if(new Set(experiments.map(e=>e.slug)).size!==experiments.length)throw new Error('Duplicate experiment slug');
export const categories=[...new Set(experiments.map(e=>e.category))];
