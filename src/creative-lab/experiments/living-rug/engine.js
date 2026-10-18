import {BrushField} from '../../shared/tactile/field.js';
import {createTactileEngine} from '../../shared/tactile/engine.js';
import {createRugRenderer} from './renderer.js';
import {options} from './model.js';
export function createLivingRug(canvas,settings={},hooks={}){return createTactileEngine(canvas,options(settings),new BrushField(),createRugRenderer,hooks);}
