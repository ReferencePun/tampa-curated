import {DEFAULTS} from './transition.js';
export const SAMPLES={
 palms:{name:'Between the palms',image:new URL('./assets/palms.jpg',import.meta.url).href,depth:new URL('./assets/palms-depth.svg',import.meta.url).href,credit:'Brandon Burridge / Unsplash',creditURL:'https://unsplash.com/photos/4wesDlSBq2o',note:'Hand-painted depth estimate: palm trunks, a distant tower, and sky. The hidden sides are not reconstructed.'},
 facade:{name:'Through an old window',image:new URL('./assets/facade.jpg',import.meta.url).href,depth:new URL('./assets/facade-depth.svg',import.meta.url).href,credit:'Ikuna / Unsplash',creditURL:'https://unsplash.com/photos/wb2DOoxIGJQ',note:'Hand-painted depth estimate: window edges, a utility pole, a courtyard, and a distant façade. Distances are illustrative.'}
};
export const PRESETS={threshold:{name:'At the threshold',settings:{...DEFAULTS,progress:57,blend:.85}},graphite:{name:'A graphite memory',settings:{...DEFAULTS,progress:30,blend:.08,depth:1.7}},courtyard:{name:'The courtyard',settings:{...DEFAULTS,image:'facade',progress:76,blend:.9,depth:1}},inside:{name:'Among the palms',settings:{...DEFAULTS,progress:100,blend:1,depth:1.5}}};
