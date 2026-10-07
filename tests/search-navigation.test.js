import test from 'node:test';
import assert from 'node:assert/strict';
import { bindSearchNavigation } from '../public/search-navigation.js';

test('Enter confirms search, dismisses keyboard and focuses/scrolls first result', () => {
  const calls=[];
  let onKey;
  const input={value:'Stremio',blur:()=>calls.push('blur'),addEventListener:(_,fn)=>onKey=fn};
  const target={focus:opts=>calls.push(opts),scrollIntoView:opts=>calls.push(opts)};
  const doc={getElementById:()=>input,querySelector:()=>target};
  const win={filterApps:()=>calls.push('filter'),requestAnimationFrame:fn=>fn(),matchMedia:()=>({matches:true})};
  bindSearchNavigation(doc,win);
  onKey({key:'a'});
  onKey({key:'Enter',isComposing:true});
  assert.equal(calls.length,0);
  onKey({key:'Enter',preventDefault:()=>calls.push('prevent')});
  assert.deepEqual(calls,['prevent','filter','blur',{preventScroll:true},{block:'start',behavior:'auto'}]);
  assert.equal(target.tabIndex,-1);
  calls.length=0; input.value=' ';
  onKey({key:'Enter',preventDefault:()=>{}});
  assert.equal(calls.length,0);
});
