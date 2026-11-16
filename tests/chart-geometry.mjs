import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const box={};vm.runInNewContext(fs.readFileSync(new URL('../dist/vendor/d3.min.js',import.meta.url),'utf8'),box);globalThis.window={d3:box.d3};
const {pitchGeometry}=await import('../dist/charts.js');
const f=(t,f0)=>({t,f0});
const source=[f(0,200),f(.05,210),f(.1,200),f(.15,null),f(.2,210),f(.25,210),f(.3,null),f(.6,205),f(.65,null),f(.7,440)];const before=JSON.stringify(source);
const raw=pitchGeometry(source,false),guided=pitchGeometry(source,true);
assert.equal(JSON.stringify(source),before);assert.equal(raw.segments.length,4);assert.equal(guided.segments.length,4);assert.equal(raw.bridges.length,0);assert.equal(guided.bridges.length,1);assert.equal(guided.segments[0][1].f0,200);assert.equal(raw.segments[0][1].f0,210);assert.equal(guided.segments[0][0].f0,200);assert.equal(pitchGeometry([f(0,null)],true).segments.length,0);
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/demo.json',import.meta.url),'utf8'));
for(const r of data.records){const before=JSON.stringify(r.frames);const g=pitchGeometry(r.frames,true);assert.equal(JSON.stringify(r.frames),before);for(const [a,b]of g.bridges){assert(b.t-a.t<=.3);assert(Math.abs(12*Math.log2(b.f0/a.f0))<=4)}assert.equal(g.segments.reduce((n,s)=>n+s.length,0),r.frames.filter(f=>f.f0>0).length)}
console.log('PASS: display-only smoothing; source unchanged; missing runs retained; only short, pitch-compatible dashed bridges across all 17 recordings.');
