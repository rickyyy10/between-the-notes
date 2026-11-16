import path from 'node:path';
import {root, demoUrl, launchBrowser} from './helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';



const browser=await launchBrowser();
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(12000);
const check=name=>console.log('PASS',name);
const evaluate=fn=>page.evaluate(fn);
async function load(){await page.goto(demoUrl('?lang=zh&v=lyrics-restored'));await page.waitForFunction(()=>window.__yiDemo?.version==='1.2.3');await page.addStyleTag({content:'html{scroll-behavior:auto!important}.site-header{position:static!important}'});}
async function selectPassage(){const plot=page.locator('#plot-ecura-0118 svg').first();await plot.scrollIntoViewIfNeeded();const box=await plot.boundingBox();await page.mouse.move(box.x+box.width*.25,box.y+100);await page.mouse.down();await page.mouse.move(box.x+box.width*.47,box.y+100,{steps:8});await page.mouse.up();await page.waitForSelector('.record-detail');}
try{
 await load();assert.equal(await page.locator('.case-card').count(),8);
 await page.locator('.case-card[data-case="pair-3"]').click();assert.equal(await evaluate(()=>window.__yiDemo.state.pair),'pair-3');assert.equal(await page.locator('#pair-select').inputValue(),'pair-3');
 await page.locator('.case-card[data-case="pair-1"]').click();check('gallery switches the linked recording views');
 await selectPassage();const region=await evaluate(()=>({...window.__yiDemo.state.region}));assert(region.end>region.start);assert.equal(await evaluate(()=>window.__yiDemo.state.positions['ecura-0118']),region.start);
 const detail=page.locator('.record-detail');await detail.scrollIntoViewIfNeeded();const box=await detail.boundingBox();await page.mouse.click(box.x+box.width*.55,box.y+90);
 assert.deepEqual(await evaluate(()=>window.__yiDemo.state.region),region);assert((await evaluate(()=>window.__yiDemo.state.positions['ecura-0118']))>region.start);
 await detail.focus();await page.keyboard.press('Home');assert(Math.abs(await evaluate(()=>window.__yiDemo.state.positions['ecura-0118'])-region.start)<.01);
 await page.locator('[data-time="relative"]').click();assert.equal(await page.locator('.record-detail').count(),1);assert.match(await page.locator('.record-detail').getAttribute('aria-valuetext'),/s$/);check('zoom retains original time and selected passage');
 await page.locator('#reveal-lyrics').click();assert.match(await page.locator('#lyrics-panel .lyric-original').innerText(),/造天要看伞/);assert.match(await page.locator('#lyrics-panel .lyric-gloss').innerText(),/umbrella/);assert.equal(await page.locator('.lyric-links,#link-region').count(),0);
 await page.locator('[data-play="ecura-0118"]').click();await page.waitForFunction(()=>window.__yiDemo.engine.playing&&window.__yiDemo.engine.currentTime>window.__yiDemo.state.region.start+.05);
 await page.locator('#clear-region').click();assert.equal(await evaluate(()=>window.__yiDemo.state.region),null);assert.equal(await evaluate(()=>window.__yiDemo.engine._end),await evaluate(()=>Math.min(window.__yiDemo.engine.record.duration,window.__yiDemo.engine.buffer.duration)));
 await evaluate(()=>window.__yiDemo.engine.pause());await selectPassage();assert.equal(await evaluate(()=>window.__yiDemo.engine.currentTime),await evaluate(()=>window.__yiDemo.state.region.start));await page.locator('#plot-ecura-0118').screenshot({path:path.join(root,'qa', 'explore-zoom-zh.png')});await page.locator('#meaning').screenshot({path:path.join(root,'qa', 'explore-lyrics-zh.png')});
 await load();await page.locator('#reveal-lyrics').click();assert.match(await page.locator('#lyrics-panel .lyric-original').innerText(),/造地要看盆/);
 await page.locator('#reference-toggle').click();assert.equal(await page.locator('.lyric-links,#link-region').count(),0);assert.equal(await page.locator('#lyrics-panel .lyric-original').count(),1);await page.locator('#reference-toggle').click();check('static lyrics restored; selected passage playback and clear preserved');
 await page.locator('#arrange-play').click();await page.waitForFunction(()=>window.__yiDemo.engine.playing&&window.__yiDemo.engine.currentTime>.1);
 await evaluate(()=>{window.__exploreVoice=window.__yiDemo.engine._voice.source;window.__exploreTime=window.__yiDemo.engine.currentTime});
 const first=page.locator('.ae-event').first();await first.focus();await page.keyboard.press('ArrowRight');
 assert(await evaluate(()=>Array.isArray(window.__yiDemo.state.customEvents[window.__yiDemo.state.arrangeId])));assert(await evaluate(()=>window.__yiDemo.engine._voice.source===window.__exploreVoice));assert(await evaluate(()=>window.__yiDemo.engine.currentTime>=window.__exploreTime));
 await evaluate(()=>window.__yiDemo.engine.pause());
 await page.locator('#seek-ecura-0118').evaluate(el=>{el.value='3';el.dispatchEvent(new Event('input',{bubbles:true}))});assert.equal(await evaluate(()=>window.__yiDemo.engine.currentTime),3);assert.equal(await page.locator('#seek-ecura-0118').inputValue(),'3');check('analysis seek after arrangement synchronizes transport');
 const before=await evaluate(()=>window.__yiDemo.state.customEvents[window.__yiDemo.state.arrangeId]);await page.locator('.ae-add').click();assert.equal(await page.locator('.ae-event').count(),before.length+1);
 await page.locator('#undo-event').click();assert.deepEqual(await evaluate(()=>window.__yiDemo.state.customEvents[window.__yiDemo.state.arrangeId]),before);check('live event edit preserves voice and undo restores events');
 await page.locator('.ae-event').first().focus();await page.keyboard.press('Enter');const fields=page.locator('.ae-fields input');await fields.first().fill('2.2');await fields.first().press('Tab');assert.equal(await fields.first().inputValue(),'2.20');await fields.nth(1).fill('.35');await fields.nth(1).press('Tab');assert.equal(await fields.nth(1).inputValue(),'0.35');
 const edited=await evaluate(()=>window.__yiDemo.state.customEvents[window.__yiDemo.state.arrangeId]);await page.locator('[data-texture="soft"]').click();assert.deepEqual(await evaluate(()=>window.__yiDemo.state.customEvents[window.__yiDemo.state.arrangeId]),edited);
 await page.locator('#presence').evaluate(el=>{el.value=60;el.dispatchEvent(new Event('input',{bubbles:true}))});await page.locator('#language').click();assert.deepEqual(await evaluate(()=>window.__yiDemo.state.customEvents[window.__yiDemo.state.arrangeId]),edited);
 await page.locator('#arrange-record').selectOption('ecura-0119');await page.locator('#arrange-record').selectOption('ecura-0118');assert.deepEqual(await evaluate(()=>window.__yiDemo.state.customEvents[window.__yiDemo.state.arrangeId]),edited);
 await page.locator('.case-card[data-case="pair-2"]').click();await page.locator('.case-card[data-case="pair-1"]').click();assert.deepEqual(await evaluate(()=>window.__yiDemo.state.customEvents[window.__yiDemo.state.arrangeId]),edited);check('numeric edits survive volume, language and record changes');
 await page.locator('#arrange .arrange-layout').screenshot({path:path.join(root,'qa', 'explore-editor-en.png')});
 while(await page.locator('.ae-event').count()){await page.locator('.ae-event').first().focus();await page.keyboard.press('Delete')}
 assert.deepEqual(await evaluate(()=>window.__yiDemo.state.customEvents[window.__yiDemo.state.arrangeId]),[]);
 await page.locator('#arrange-play').click();await page.waitForFunction(()=>window.__yiDemo.engine.playing);assert.deepEqual(await evaluate(()=>window.__yiDemo.engine.getEvents()),[]);await evaluate(()=>window.__yiDemo.engine.pause());
 await page.locator('#undo-event').click();assert.equal(await page.locator('.ae-event').count(),1);await page.locator('#reset-arrange').click();assert((await page.locator('.ae-event').count())>1);await page.locator('#undo-event').click();assert.equal(await page.locator('.ae-event').count(),1);check('empty arrangement stays silent and reset is undoable');
 await page.locator('#save-choice').click();assert.equal(await evaluate(()=>window.__yiDemo.savedNotes.at(-1).arrangement.events.length),1);assert.equal(await evaluate(()=>Object.hasOwn(window.__yiDemo.savedNotes.at(-1),'lyricLinks')),false);check('saved accompaniment settings include authored events');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);assert(await evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#reveal-lyrics').click();await page.locator('#arrange .arrange-layout').screenshot({path:path.join(root,'qa', 'explore-editor-mobile-en.png')});await page.locator('#meaning').screenshot({path:path.join(root,'qa', 'explore-lyrics-mobile-en.png')});
 await page.locator('#language').click();assert(await evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#arrange .arrange-layout').screenshot({path:path.join(root,'qa', 'explore-editor-mobile-zh.png')});check('responsive bilingual layouts have no horizontal overflow');
 assert.deepEqual(errors,[]);check('no browser runtime errors');await fs.writeFile(path.join(root,'qa', 'explore-checks.json'),JSON.stringify({checkedAt:new Date().toISOString(),passed:true,errors,note:'Browser behavior and transport verification; no participant usability study.'},null,2));
}finally{await browser.close()}
