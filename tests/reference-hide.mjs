import {root, demoUrl, launchBrowser} from './helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';



const out=path.join(root,'qa/reference-hide-checks.json');
const browser=await launchBrowser();
const page=await browser.newPage({viewport:{width:1360,height:900}});
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const record=(name,detail={})=>{checks.push({name,...detail});console.log('PASS',name,JSON.stringify(detail));};
async function sampleBus(busName,ms=450){
 return page.evaluate(async({busName,ms})=>{
  const e=window.__yiDemo.engine,c=e.context,source=busName==='voice'?e._voice.gain:e.accompanimentGain;
  const a=c.createAnalyser(),sink=c.createGain();a.fftSize=1024;sink.gain.value=0;
  source.connect(a);a.connect(sink);sink.connect(c.destination);
  const x=new Float32Array(a.fftSize);let maxRms=0,maxPeak=0;
  for(let i=0;i<Math.ceil(ms/40);i++){await new Promise(r=>setTimeout(r,40));a.getFloatTimeDomainData(x);maxRms=Math.max(maxRms,Math.sqrt(x.reduce((s,v)=>s+v*v,0)/x.length));maxPeak=Math.max(maxPeak,...x.map(Math.abs));}
  source.disconnect(a);a.disconnect();sink.disconnect();return {maxRms,maxPeak};
 },{busName,ms});
}
try{
 await page.goto(demoUrl());await page.waitForFunction(()=>window.__yiDemo?.data);
 await page.locator('#reference-toggle').click();
 await page.locator('[data-play="ecura-0116"]').click();await page.waitForFunction(()=>window.__yiDemo.engine.playing);
 await page.locator('#seek-ecura-0116').evaluate(el=>{el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(80);
 const voice=await sampleBus('voice');assert.ok(voice.maxRms>0.00001);record('original vocal creates a nonzero audio signal',voice);
 await page.locator('#reference-toggle').click();
 assert.deepEqual(await page.evaluate(()=>({playing:window.__yiDemo.engine.playing,active:window.__yiDemo.state.active,voice:!!window.__yiDemo.engine._voice})),{playing:false,active:null,voice:false});
 assert.equal(await page.locator('[data-play="ecura-0116"]').count(),0);record('hiding reference stops analysis playback and removes hidden transport');
 await page.locator('#reference-toggle').click();await page.locator('#arrange-record').selectOption('ecura-0116');
 await page.locator('[data-texture="soft"]').click();await page.locator('#arrange-play').click();await page.waitForFunction(()=>window.__yiDemo.engine.playing);
 const added=await sampleBus('added',1200);assert.ok(added.maxRms>0.00001);record('synthesized accompaniment creates a separate nonzero audio signal',added);
 await page.locator('#original-mode').click();await page.waitForTimeout(350);
 const muted=await sampleBus('added',160);assert.ok(muted.maxRms<0.000001);record('Original A/B state mutes the added bus',muted);
 await page.locator('#mix-mode').click();
 await page.locator('#reference-toggle').click();
 assert.deepEqual(await page.evaluate(()=>({playing:window.__yiDemo.engine.playing,active:window.__yiDemo.state.active,mode:window.__yiDemo.state.mode,arrange:window.__yiDemo.state.arrangeId,seek:document.querySelector('#arrange-seek').value})),{playing:false,active:null,mode:'analysis',arrange:'ecura-0118',seek:'0'});
 assert.equal(await page.locator('#arrange-record option[value="ecura-0116"]').count(),0);record('hiding arranged reference stops voice and returns selector to118 at zero');
 await page.locator('#arrange-record').selectOption('ecura-0119');await page.locator('#arrange-play').click();await page.waitForFunction(()=>window.__yiDemo.engine.playing);
 assert.equal(await page.evaluate(()=>window.__yiDemo.engine.record.id),'ecura-0119');
 await page.locator('#arrange-record').selectOption('ecura-0118');assert.equal(await page.evaluate(()=>window.__yiDemo.engine.playing),false);
 await page.locator('#arrange-play').click();await page.waitForFunction(()=>window.__yiDemo.engine.playing);
 assert.equal(await page.evaluate(()=>window.__yiDemo.engine.record.id),'ecura-0118');record('source change stops previous source and next playback uses selected source');
 assert.deepEqual(errors,[]);record('no uncaught browser errors');
 await fs.writeFile(out,JSON.stringify({checkedAt:new Date().toISOString(),checks,errors,note:'Signal measurements verify nonzero PCM and muting, not perceived musical quality or listening-study outcomes.'},null,2));
}finally{await browser.close();}
