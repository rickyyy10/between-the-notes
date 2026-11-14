const d3=window.d3;
export const COLORS=['#167b72','#c9654e','#8571a5'];
const hzToMidi=f=>69+12*Math.log2(f/440);
export function renderHero(el,records){
 const w=480,h=225,m={l:12,r:12,t:24,b:30};const svg=d3.select(el).html('').append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('class','chart-svg').attr('role','img');
 svg.append('title').text('Pitch traces for recordings 118 and 119, on shared time and pitch scales.');
 const x=d3.scaleLinear().domain([0,d3.max(records,r=>r.duration)]).range([m.l,w-m.r]);const y=d3.scaleLog().domain([90,520]).range([h-m.b,m.t]);
 [125,250,500].forEach(f=>{svg.append('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',y(f)).attr('y2',y(f)).attr('stroke','#dfe4d9').attr('stroke-dasharray','2 4');svg.append('text').attr('x',w-m.r).attr('y',y(f)-5).attr('text-anchor','end').attr('class','axis-label').text(`${f} Hz`)});
 records.forEach((r,i)=>svg.append('path').datum(r.frames).attr('fill','none').attr('stroke',COLORS[i]).attr('stroke-width',1.8).attr('d',d3.line().defined(f=>f.f0>0).x(f=>x(f.t)).y(f=>y(f.f0))));
 svg.append('g').attr('transform',`translate(0,${h-m.b})`).attr('class','axis').call(d3.axisBottom(x).ticks(5).tickSize(0).tickPadding(10).tickFormat(v=>`${v}s`)).call(g=>g.select('.domain').remove());
}
export function renderRecordPlot(el,record,all,{index=0,relativeTime=false,relativePitch=false,ending=false,region,t,onSeek,onRegion}){
 const w=Math.max(300,el.clientWidth||1000),h=226,m={l:w<600?45:62,r:18,t:25,b:32},pitchBottom=144,energyTop=166,energyBottom=190;
 const maxTime=d3.max(all,r=>r.duration);const x=d3.scaleLinear().domain([0,relativeTime?100:maxTime]).range([m.l,w-m.r]);const tx=time=>x(relativeTime?time/record.duration*100:time);
 const inv=px=>relativeTime?x.invert(px)/100*record.duration:x.invert(px);
 const fvalues=all.flatMap(r=>r.frames.filter(f=>f.f0).map(f=>relativePitch?12*Math.log2(f.f0/r.metrics.pitchMedianHz):f.f0));
 const y=relativePitch?d3.scaleLinear().domain([Math.floor(d3.min(fvalues)/6)*6,Math.ceil(d3.max(fvalues)/6)*6]).range([pitchBottom,m.t]):d3.scaleLog().domain([Math.min(100,Math.floor(d3.min(fvalues)/50)*50),Math.ceil(d3.max(fvalues)/100)*100]).range([pitchBottom,m.t]);
 const svg=d3.select(el).html('').append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('class','chart-svg record-plot').attr('role','img');svg.append('title').text(`${record.id}: ${t('pitch')}, ${t('energy')}`);
 svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',w-m.l-m.r).attr('height',energyBottom-m.t).attr('fill','#fdfdf8');
 if(ending)svg.append('rect').attr('x',tx(record.duration*.8)).attr('width',tx(record.duration)-tx(record.duration*.8)).attr('y',m.t).attr('height',energyBottom-m.t).attr('fill','#e2c782').attr('opacity',.22);
 const yticks=relativePitch?y.ticks(4):[100,150,200,300,400,600,800,1000].filter(v=>v>=y.domain()[0]&&v<=y.domain()[1]);
 svg.append('g').attr('transform',`translate(${m.l},0)`).attr('class','grid').call(d3.axisLeft(y).tickValues(yticks).tickSize(-(w-m.l-m.r)).tickFormat(''));
 svg.append('g').attr('transform',`translate(${m.l},0)`).attr('class','axis').call(d3.axisLeft(y).tickValues(yticks).tickFormat(v=>v).tickSize(0).tickPadding(8)).call(g=>g.select('.domain').remove());
 svg.append('text').attr('x',m.l).attr('y',13).attr('class','axis-label').text(t(relativePitch?'pitchRelative':'pitch'));
 svg.append('path').datum(record.frames).attr('fill','none').attr('stroke',COLORS[index]).attr('stroke-width',2).attr('d',d3.line().defined(f=>f.f0>0).x(f=>tx(f.t)).y(f=>y(relativePitch?12*Math.log2(f.f0/record.metrics.pitchMedianHz):f.f0)));
 const energyY=d3.scaleLinear().domain([-60,0]).range([energyBottom,energyTop]).clamp(true);
 svg.append('path').datum(record.frames).attr('fill',COLORS[index]).attr('opacity',.2).attr('d',d3.area().x(f=>tx(f.t)).y0(energyBottom).y1(f=>energyY(f.rmsDb)));
 svg.append('text').attr('x',m.l-8).attr('y',energyBottom-3).attr('text-anchor','end').attr('class','axis-label').text(t('energy'));
 record.lowEnergyIntervals.forEach(([s,e])=>svg.append('rect').attr('x',tx(s)).attr('width',Math.max(1,tx(e)-tx(s))).attr('y',energyTop).attr('height',energyBottom-energyTop).attr('fill','#a4b49d').attr('opacity',.55));
 svg.append('g').attr('transform',`translate(0,${energyBottom+5})`).attr('class','axis').call(d3.axisBottom(x).ticks(w<600?4:relativeTime?5:8).tickSize(3).tickFormat(v=>relativeTime?`${v}%`:v));
 svg.append('text').attr('x',w-m.r).attr('y',h-2).attr('text-anchor','end').attr('class','axis-label').text(t(relativeTime?'progress':'time'));
 const selection=svg.append('rect').attr('y',m.t).attr('height',energyBottom-m.t).attr('fill',COLORS[index]).attr('opacity',.12).attr('stroke',COLORS[index]).attr('pointer-events','none');
 if(region?.id===record.id)selection.attr('x',tx(region.start)).attr('width',tx(region.end)-tx(region.start));else selection.attr('width',0);
 const cursor=svg.append('line').attr('class','cursor-line').attr('y1',m.t).attr('y2',energyBottom).attr('opacity',0);
 const marker=svg.append('line').attr('stroke','#7f8d7c').attr('stroke-dasharray','2 3').attr('y1',m.t).attr('y2',energyBottom).attr('opacity',0).attr('pointer-events','none');
 const tooltip=d3.select('body').append('div').attr('class','tooltip').style('display','none');let start=null,activePointer=null;
 const clampedTime=event=>Math.max(0,Math.min(record.duration,inv(Math.max(m.l,Math.min(w-m.r,d3.pointer(event,svg.node())[0])))));
 svg.on('pointerdown',event=>{if(event.button!==0)return;start=clampedTime(event);activePointer=event.pointerId;svg.node().setPointerCapture(event.pointerId)}).on('pointermove',event=>{
 const time=clampedTime(event);marker.attr('x1',tx(time)).attr('x2',tx(time)).attr('opacity',1);const f=record.frames.reduce((a,b)=>Math.abs(b.t-time)<Math.abs(a.t-time)?b:a,record.frames[0]);
 tooltip.style('display','block').style('left',`${Math.min(window.innerWidth-200,event.clientX+12)}px`).style('top',`${event.clientY+16}px`).text(`${time.toFixed(2)}s · ${f.f0?f.f0.toFixed(0)+' Hz':'—'} · ${f.rmsDb.toFixed(1)} dB`);
 if(start!==null)selection.attr('x',tx(Math.min(start,time))).attr('width',Math.abs(tx(time)-tx(start)));
 }).on('pointerup',event=>{if(start===null)return;const end=clampedTime(event);if(Math.abs(end-start)>.18)onRegion(record,Math.min(start,end),Math.max(start,end));else onSeek(record,end);start=null;if(svg.node().hasPointerCapture(activePointer))svg.node().releasePointerCapture(activePointer);tooltip.style('display','none')}).on('pointerleave',()=>{marker.attr('opacity',0);tooltip.style('display','none')}).on('pointercancel',()=>{start=null;tooltip.style('display','none')});
 return {update(time,active){cursor.attr('x1',tx(Math.min(time,record.duration))).attr('x2',tx(Math.min(time,record.duration))).attr('opacity',active?1:0)},destroy(){tooltip.remove()}};
}
export function renderArrangement(el,record,events,t){
 const w=Math.max(280,el.clientWidth||500),h=175,m={l:45,r:10};const x=d3.scaleLinear().domain([0,record.duration]).range([m.l,w-m.r]);const svg=d3.select(el).html('').append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('class','chart-svg').attr('role','img');svg.append('title').text('Original vocal waveform and added synthesized sound events');
 const peak=d3.max(record.waveform,p=>Math.max(Math.abs(p.min),Math.abs(p.max)))||1;const a=d3.scaleLinear().domain([0,peak]).range([0,23]);
 svg.append('text').attr('x',0).attr('y',54).attr('class','axis-label').text(t('voiceLane'));svg.append('text').attr('x',0).attr('y',121).attr('class','axis-label').text(t('addedLane'));
 svg.append('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',52).attr('y2',52).attr('stroke','#dce4d7');
 svg.append('path').datum(record.waveform).attr('fill','#487b68').attr('opacity',.7).attr('d',d3.area().x(p=>x(p.t)).y0(p=>52+a(-p.min)).y1(p=>52-a(p.max)));
 svg.append('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',118).attr('y2',118).attr('stroke','#dce4d7');
 svg.selectAll('.event').data(events).join('rect').attr('class','event').attr('x',e=>x(e.time)).attr('width',e=>Math.max(3,x(e.time+e.duration)-x(e.time))).attr('y',e=>e.kind==='percussion'?111:106).attr('height',e=>e.kind==='percussion'?14:24).attr('rx',3).attr('fill','#b58b48').attr('opacity',.65);
 svg.append('g').attr('transform',`translate(0,150)`).attr('class','axis').call(d3.axisBottom(x).ticks(5).tickSize(3).tickFormat(v=>`${v}s`));
 const cursor=svg.append('line').attr('class','cursor-line').attr('y1',20).attr('y2',137).attr('x1',x(0)).attr('x2',x(0));
 return {update(time,added=true){cursor.attr('x1',x(time)).attr('x2',x(time));svg.selectAll('.event').attr('opacity',e=>!added?.15:time>=e.time&&time<=e.time+e.duration?1:.55)}};
}
