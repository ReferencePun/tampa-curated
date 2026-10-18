import {GelBody} from './body.js';
import {createTactileEngine} from '../../shared/tactile/engine.js';
import {createGelRenderer} from './renderer.js';
import {options} from './model.js';
export function createGelToy(canvas,settings={},hooks={}){return createTactileEngine(canvas,options(settings),new GelBody(),createGelRenderer,hooks);}
