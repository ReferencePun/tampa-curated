import {BrushField} from '../../shared/tactile/field.js';
import {SoftBody} from '../../shared/tactile/soft-body.js';
import {createTactileEngine} from '../../shared/tactile/engine.js';
import {createFoamRenderer} from './renderer.js';
import {options} from './model.js';
export class FoamMaterial{
 constructor(config){this.config=config;this.field=new BrushField();this.body=new SoftBody();}
 point(x,y,down,c){this.config=c;(c.form==='ball'?this.body:this.field).point(x,y,down,c);}
 release(){this.field.release();this.body.release();}
 advance(dt,c){this.config=c;this.field.advance(dt,c);this.body.advance(dt,c);}
 settle(){this.field.settle();this.body.settle();}
 reset(){this.field.reset();this.body.reset();}
 snapshot(){return (this.config.form==='ball'?this.body:this.field).snapshot();}
 dispose(){this.field.dispose();this.body.dispose();}
}
export function createFoamPlay(canvas,settings={},hooks={}){const c=options(settings);return createTactileEngine(canvas,c,new FoamMaterial(c),createFoamRenderer,hooks);}
