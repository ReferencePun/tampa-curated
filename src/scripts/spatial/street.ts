// Front elevations face the street; all four buildings sit outside the walkable
// lane. Mobile narrows the street without changing building scale or travel.
export const streetSites=[
 {name:'Tampa Theatre',position:[-40,0,-23] as [number,number,number],rotation:Math.PI,halfWidth:5.5},
 {name:'Plant Hall',position:[-53,0,-46] as [number,number,number],rotation:0,halfWidth:13.5},
 {name:'Floridan Hotel',position:[-87,0,-23] as [number,number,number],rotation:Math.PI,halfWidth:5.5},
 {name:'Rivergate Tower',position:[-100,0,-48] as [number,number,number],rotation:0,halfWidth:8},
];
export function streetSitesFor(compact:boolean){
 return streetSites.map(site=>({...site,position:[site.position[0],site.position[1],compact?-34+(site.position[2]+34)*.7:site.position[2]] as [number,number,number]}));
}
export const streetEnd={x:-92,z:-34};
