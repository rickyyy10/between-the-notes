const d3=window.d3;
export const COLORS=['#167b72','#c9654e','#8571a5'];
const hzToMidi=f=>69+12*Math.log2(f/440);
const local=(t,key,zh,en)=>{const value=t?.(key);return value&&value!==key?value:document.documentElement.lang.startsWith('zh')?zh:en};

// Display-only transformation. Never modify source frames or derived metrics.
// Smoothing stays inside contiguous valid runs. Short missing intervals are
// separately dashed; neither the area nor the solid line fills those gaps.
export function pitchGeometry(frames,guided=true){
 const runs=[];let run=[];
 for(const f of frames){if(Number.isFinite(f.f0)&&f.f0>0){run.push({...f})}else if(run.length){runs.push(run);run=[]}}
 if(run.length)runs.push(run);
 const segments=runs.map(run=>run.map((f,i)=>({...f,f0:guided&&i>0&&i<run.length-1?d3.median(run.slice(i-1,i+2),p=>p.f0):f.f0})));
 const bridges=[];
 if(guided)for(let i=1;i<segments.length;i++){
  const a=segments[i-1].at(-1),b=segments[i][0];
  if(b.t-a.t<=.30&&Math.abs(hzToMidi(b.f0)-hzToMidi(a.f0))<=4)bridges.push([a,b]);
 }
 return {segments,bridges};
}
function drawMelody(svg,record,x,y,{color,guided=true,bottom,uid,width=3}){
 const {segments,bridges}=pitchGeometry(record.frames,guided);
 const defs=svg.append('defs');const grad=defs.append('linearGradient').attr('id',uid).attr('x1','0').attr('x2','0').attr('y1','0').attr('y2','1');grad.append('stop').attr('offset','0%').attr('stop-color',color).attr('stop-opacity',.19);grad.append('stop').attr('offset','100%').attr('stop-color',color).attr('stop-opacity',.015);
 const curve=guided?d3.curveMonotoneX:d3.curveLinear;
 if(guided)svg.selectAll(null).data(segments.filter(s=>s.length>1)).enter().append('path').attr('class','melody-area').attr('fill',`url(#${uid})`).attr('d',d3.area().x(f=>x(f.t)).y0(bottom).y1(f=>y(f.f0)).curve(curve));
 svg.selectAll(null).data(bridges).enter().append('path').attr('class','melody-bridge').attr('fill','none').attr('stroke',color).attr('stroke-opacity',.55).attr('stroke-width',1.6).attr('stroke-dasharray','2 4').attr('d',d3.line().x(f=>x(f.t)).y(f=>y(f.f0)));
 svg.selectAll(null).data(segments).enter().append('path').attr('class','melody-solid').attr('fill','none').attr('stroke',color).attr('stroke-width',width).attr('stroke-linecap','round').attr('stroke-linejoin','round').attr('d',d3.line().x(f=>x(f.t)).y(f=>y(f.f0)).curve(curve));
 svg.selectAll(null).data(segments.filter(s=>s.length===1).map(s=>s[0])).enter().append('circle').attr('cx',f=>x(f.t)).attr('cy',f=>y(f.f0)).attr('r',width/2).attr('fill',color);
}
export function renderHero(el,records,t){
 const w=520,h=350,m={l:44,r:24},maxTime=d3.max(records,r=>r.duration),x=d3.scaleLinear().domain([0,maxTime]).range([m.l,w-m.r]);
 const svg=d3.select(el).html('').append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('class','chart-svg hero-melody').attr('role','img');
 svg.attr('aria-label',local(t,'heroChartTitle','118 与 119 的旋律走向：共享时间与音高尺度','Melodic contours of 118 and 119 on shared time and pitch scales'));
 records.forEach((r,i)=>{
  const top=53+i*166,bottom=top+93,y=d3.scaleLog().domain([90,520]).range([bottom,top]);
  svg.append('rect').attr('x',m.l-8).attr('y',top-6).attr('width',w-m.l-m.r+16).attr('height',bottom-top+15).attr('rx',8).attr('fill',i?'#fcf2ed':'#edf5f0');
  [125,250,500].forEach(f=>{svg.append('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',y(f)).attr('y2',y(f)).attr('stroke',COLORS[i]).attr('stroke-opacity',.1);svg.append('text').attr('x',m.l-12).attr('y',y(f)+4).attr('text-anchor','end').attr('class','hero-tick').text(f)});
  svg.append('text').attr('x',m.l).attr('y',top-16).attr('fill',COLORS[i]).attr('class','hero-direct-label').text(`${i?'B':'A'} · ${parseInt(r.id.split('-').at(-1),10)}`);
  svg.append('text').attr('x',w-m.r).attr('y',top-16).attr('text-anchor','end').attr('class','hero-duration').text(`${r.duration.toFixed(2)} s`);
  if(r.duration<maxTime-.1)svg.append('rect').attr('x',x(r.duration)).attr('y',top-6).attr('width',x(maxTime)-x(r.duration)+8).attr('height',bottom-top+15).attr('fill','#f8f7f3').attr('opacity',.86);
  drawMelody(svg,r,x,y,{color:COLORS[i],bottom,guided:true,uid:`hero-fill-${i}`,width:2.8});
  svg.append('line').attr('x1',x(r.duration)).attr('x2',x(r.duration)).attr('y1',top).attr('y2',bottom+9).attr('stroke',COLORS[i]).attr('stroke-opacity',.5).attr('stroke-dasharray','3 4');
  svg.append('g').attr('transform',`translate(0,${bottom+13})`).attr('class','axis').call(d3.axisBottom(x).tickValues([0,3,6,9,12].filter(v=>v<=maxTime)).tickSize(0).tickPadding(7).tickFormat(v=>`${v}s`)).call(g=>g.select('.domain').remove());
 });
 svg.append('text').attr('x',6).attr('y',36).attr('class','hero-tick').text('Hz');
}

export function renderRecordPlot(el,record,all,{index=0,relativeTime=false,relativePitch=false,ending=false,guided=true,region,t,onSeek,onRegion}){
 const w=Math.max(300,el.clientWidth||1000),small=w<600,h=300,m={l:small?46:66,r:small?14:24,t:48},pitchBottom=190,energyTop=231,energyBottom=262;
 const color=COLORS[index],maxTime=d3.max(all,r=>r.duration);const x=d3.scaleLinear().domain([0,relativeTime?100:maxTime]).range([m.l,w-m.r]);const tx=time=>x(relativeTime?time/record.duration*100:time),inv=px=>relativeTime?x.invert(px)/100*record.duration:x.invert(px);
 const fvalues=all.flatMap(r=>r.frames.filter(f=>Number.isFinite(f.f0)&&f.f0>0).map(f=>relativePitch?12*Math.log2(f.f0/r.metrics.pitchMedianHz):f.f0));
 const lo=d3.min(fvalues)??(relativePitch?-12:100),hi=d3.max(fvalues)??(relativePitch?12:500);
 const domain=relativePitch?[Math.min(-6,Math.floor(lo/6)*6),Math.max(6,Math.ceil(hi/6)*6)]:[Math.max(25,Math.min(100,Math.floor(lo/50)*50)),Math.max(200,Math.ceil(hi/100)*100)];
 const y=relativePitch?d3.scaleLinear().domain(domain).range([pitchBottom,m.t]):d3.scaleLog().domain(domain).range([pitchBottom,m.t]);
 const pitchValue=hz=>relativePitch?12*Math.log2(hz/record.metrics.pitchMedianHz):hz,py=hz=>y(pitchValue(hz));
 const svg=d3.select(el).html('').append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('class','chart-svg record-plot').attr('role','img');svg.append('title').text(`${record.id}: ${t('pitch')}, ${t('energy')}`);
 svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',w-m.l-m.r).attr('height',pitchBottom-m.t).attr('rx',5).attr('fill','#f7f9f4');
 if(!relativeTime&&record.duration<maxTime-.1){svg.append('rect').attr('class','record-ended-zone').attr('x',tx(record.duration)).attr('y',m.t).attr('width',tx(maxTime)-tx(record.duration)).attr('height',energyBottom-m.t).attr('fill','#efeee8');}
 if(ending)svg.append('rect').attr('class','ending-window').attr('x',tx(record.duration*.8)).attr('width',tx(record.duration)-tx(record.duration*.8)).attr('y',m.t).attr('height',energyBottom-m.t).attr('fill','#e2c782').attr('opacity',.3);
 const yticks=relativePitch?y.ticks(5):[50,100,150,250,400,600,800,1200].filter(v=>v>=domain[0]&&v<=domain[1]);
 svg.append('g').attr('transform',`translate(${m.l},0)`).attr('class','grid').call(d3.axisLeft(y).tickValues(yticks).tickSize(-(w-m.l-m.r)).tickFormat(''));
 svg.append('g').attr('transform',`translate(${m.l},0)`).attr('class','axis').call(d3.axisLeft(y).tickValues(yticks).tickFormat(v=>v).tickSize(0).tickPadding(8)).call(g=>g.select('.domain').remove());
 svg.append('text').attr('x',m.l).attr('y',16).attr('class','plot-axis-title').text(t(relativePitch?'pitchRelative':'pitch'));
 drawMelody(svg,record,tx,py,{color,bottom:pitchBottom,guided,uid:`record-fill-${index}`,width:guided?3:1.8});
 svg.append('line').attr('x1',tx(record.duration)).attr('x2',tx(record.duration)).attr('y1',m.t).attr('y2',energyBottom).attr('stroke',color).attr('stroke-opacity',.45).attr('stroke-dasharray','3 4');
 const energyY=d3.scaleLinear().domain([-60,0]).range([energyBottom,energyTop]).clamp(true);
 svg.append('text').attr('x',m.l).attr('y',energyTop-10).attr('class','energy-caption').text(local(t,'energyStrip','相对能量','Relative energy'));
 svg.append('path').datum(record.frames).attr('fill',color).attr('opacity',.24).attr('d',d3.area().x(f=>tx(f.t)).y0(energyBottom).y1(f=>energyY(f.rmsDb)).curve(d3.curveMonotoneX));
 record.lowEnergyIntervals.forEach(([s,e])=>svg.append('rect').attr('x',tx(s)).attr('width',Math.max(1,tx(e)-tx(s))).attr('y',energyTop).attr('height',energyBottom-energyTop).attr('fill','#899b80').attr('opacity',.38));
 svg.append('g').attr('transform',`translate(0,${energyBottom+2})`).attr('class','axis').call(d3.axisBottom(x).ticks(small?4:relativeTime?5:8).tickSize(3).tickFormat(v=>relativeTime?`${v}%`:v));
 svg.append('text').attr('x',w-m.r).attr('y',h-1).attr('text-anchor','end').attr('class','axis-label').text(t(relativeTime?'progress':'time'));
 const selection=svg.append('rect').attr('class','passage-selection').attr('y',m.t).attr('height',energyBottom-m.t).attr('fill',color).attr('opacity',.16).attr('stroke',color).attr('pointer-events','none');
 if(region?.id===record.id)selection.attr('x',tx(region.start)).attr('width',tx(region.end)-tx(region.start));else selection.attr('width',0);
 const cursor=svg.append('line').attr('class','cursor-line').attr('y1',m.t).attr('y2',energyBottom).attr('opacity',0);
 const dot=svg.append('circle').attr('class','pitch-dot').attr('r',5).attr('fill',color).attr('stroke','#fffefa').attr('stroke-width',2).attr('opacity',0).attr('pointer-events','none');
 const readout=svg.append('text').attr('x',m.l).attr('y',small?33:34).attr('class','readout-text').attr('fill',color).attr('display',small?'none':null);
 const marker=svg.append('line').attr('stroke',color).attr('stroke-opacity',.5).attr('stroke-dasharray','2 3').attr('y1',m.t).attr('y2',energyBottom).attr('opacity',0).attr('pointer-events','none');
 const tooltip=d3.select('body').append('div').attr('class','tooltip').style('display','none');let start=null,activePointer=null,lastTime=0,lastActive=false,detail=null;
 const nearest=time=>record.frames[d3.leastIndex(record.frames,f=>Math.abs(f.t-time))];
 const valueLabel=(time,f)=>`${time.toFixed(2)} s · ${f?.f0?Math.round(f.f0)+' Hz':local(t,'noPitchHere','此处无可靠音高','No reliable pitch here')}`;
 const update=(time,active)=>{lastTime=time;lastActive=active;const tm=Math.min(time,record.duration),f=nearest(tm);cursor.attr('x1',tx(tm)).attr('x2',tx(tm)).attr('opacity',active?1:0);dot.attr('cx',tx(tm)).attr('cy',f?.f0?py(f.f0):pitchBottom).attr('opacity',active&&f?.f0?1:0);readout.text(active?valueLabel(tm,f):'');detail?.update(time,active)};
 const clampedTime=event=>Math.max(0,Math.min(record.duration,inv(Math.max(m.l,Math.min(w-m.r,d3.pointer(event,svg.node())[0])))));
 svg.on('pointerdown',event=>{if(event.button!==0)return;start=clampedTime(event);activePointer=event.pointerId;svg.node().setPointerCapture(event.pointerId)}).on('pointermove',event=>{
 const time=clampedTime(event),f=nearest(time);marker.attr('x1',tx(time)).attr('x2',tx(time)).attr('opacity',1);
 tooltip.style('display','block').style('left',`${Math.max(8,Math.min(window.innerWidth-225,event.clientX+12))}px`).style('top',`${Math.min(window.innerHeight-65,event.clientY+16)}px`).text(`${valueLabel(time,f)} · ${f.rmsDb.toFixed(1)} dB`);
 if(!lastActive){dot.attr('cx',tx(time)).attr('cy',f.f0?py(f.f0):pitchBottom).attr('opacity',f.f0?1:0);readout.text(valueLabel(time,f))}
 if(start!==null)selection.attr('x',tx(Math.min(start,time))).attr('width',Math.abs(tx(time)-tx(start)));
 }).on('pointerup',event=>{if(start===null)return;const end=clampedTime(event),begin=start;start=null;if(svg.node().hasPointerCapture(activePointer))svg.node().releasePointerCapture(activePointer);tooltip.style('display','none');if(Math.abs(end-begin)>.18)onRegion(record,Math.min(begin,end),Math.max(begin,end));else onSeek(record,end)}).on('pointerleave',()=>{marker.attr('opacity',0);tooltip.style('display','none');update(lastTime,lastActive)}).on('pointercancel',()=>{start=null;tooltip.style('display','none');if(region?.id===record.id)selection.attr('x',tx(region.start)).attr('width',tx(region.end)-tx(region.start));else selection.attr('width',0)});
 if(region?.id===record.id){
  const from=Math.max(0,Math.min(record.duration,region.start)),to=Math.max(0,Math.min(record.duration,region.end));
  if(Number.isFinite(from)&&Number.isFinite(to)&&to-from>.01)detail=renderRecordDetail(el,record,{from,to,w,small,y,yticks,pitchValue,color,guided,ending,t,tooltip,onSeek});
 }
 return {update,destroy(){detail?.destroy();tooltip.remove()}};
}

// A selected passage gets its own time scale, while the pitch domain is copied
// from the shared overview. Clipping the full series preserves boundary context
// and the exact same smoothing decisions as in the overview.
function renderRecordDetail(el,record,{from,to,w,small,y,yticks,pitchValue,color,guided,ending,t,tooltip,onSeek}){
 const h=282,m={l:small?46:66,r:small?14:24},top=51,bottom=181,energyTop=216,energyBottom=244;
 const x=d3.scaleLinear().domain([from,to]).range([m.l,w-m.r]),dy=y.copy().range([bottom,top]),py=hz=>dy(pitchValue(hz));
 const label=local(t,'detailPassage','片段放大','Passage detail');
 const svg=d3.select(el).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('class','chart-svg record-plot record-detail').attr('role','slider').attr('tabindex',0).attr('aria-label',`${label}: ${from.toFixed(2)}–${to.toFixed(2)} s`).attr('aria-valuemin',from).attr('aria-valuemax',to).attr('aria-valuenow',from).attr('aria-valuetext',`${from.toFixed(2)} s`).style('margin-top','8px');
 svg.append('rect').attr('x',1).attr('y',1).attr('width',w-2).attr('height',h-2).attr('rx',8).attr('fill','#fafbf7').attr('stroke','#d9e4db');
 svg.append('text').attr('x',m.l).attr('y',24).attr('class','plot-axis-title').attr('fill',color).text(label);
 svg.append('text').attr('x',w-m.r).attr('y',24).attr('text-anchor','end').attr('class','axis-label').text(`${from.toFixed(2)}–${to.toFixed(2)} s`);
 const clipId=`detail-clip-${record.id}`;
 svg.append('defs').append('clipPath').attr('id',clipId).append('rect').attr('x',m.l).attr('y',top).attr('width',w-m.l-m.r).attr('height',energyBottom-top);
 svg.append('g').attr('class','grid').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(dy).tickValues(yticks).tickSize(-(w-m.l-m.r)).tickFormat(''));
 svg.append('g').attr('class','axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(dy).tickValues(yticks).tickSize(0).tickPadding(8)).call(g=>g.select('.domain').remove());
 const clipped=svg.append('g').attr('clip-path',`url(#${clipId})`);
 if(ending)clipped.append('rect').attr('x',x(record.duration*.8)).attr('width',Math.max(0,x(record.duration)-x(record.duration*.8))).attr('y',top).attr('height',energyBottom-top).attr('fill','#e2c782').attr('opacity',.3);
 drawMelody(clipped,record,x,py,{color,guided,bottom,uid:`detail-fill-${record.id}`,width:guided?3:1.8});
 const energyY=d3.scaleLinear().domain([-60,0]).range([energyBottom,energyTop]).clamp(true);
 clipped.append('path').datum(record.frames).attr('fill',color).attr('opacity',.24).attr('d',d3.area().x(f=>x(f.t)).y0(energyBottom).y1(f=>energyY(f.rmsDb)).curve(d3.curveMonotoneX));
 record.lowEnergyIntervals.forEach(([start,end])=>clipped.append('rect').attr('x',x(start)).attr('width',Math.max(1,x(end)-x(start))).attr('y',energyTop).attr('height',energyBottom-energyTop).attr('fill','#899b80').attr('opacity',.38));
 svg.append('text').attr('x',m.l).attr('y',energyTop-10).attr('class','energy-caption').text(local(t,'energyStrip','相对能量','Relative energy'));
 const span=to-from,ticks=d3.ticks(from,to,small?3:6).filter(v=>v>from+span*.09&&v<to-span*.09);
 svg.append('g').attr('class','axis').attr('transform',`translate(0,${energyBottom+2})`).call(d3.axisBottom(x).tickValues([from,...ticks,to]).tickFormat(v=>v.toFixed(span<2?2:1)).tickSize(3));
 svg.append('text').attr('x',w-m.r).attr('y',h-7).attr('class','axis-label').attr('text-anchor','end').text(t('time'));
 const cursor=svg.append('line').attr('class','cursor-line detail-cursor').attr('y1',top).attr('y2',energyBottom).attr('opacity',0);
 const dot=svg.append('circle').attr('class','pitch-dot detail-pitch-dot').attr('r',5).attr('fill',color).attr('stroke','#fffefa').attr('stroke-width',2).attr('opacity',0).attr('pointer-events','none');
 const marker=svg.append('line').attr('stroke',color).attr('stroke-dasharray','2 3').attr('stroke-opacity',.5).attr('y1',top).attr('y2',energyBottom).attr('opacity',0).attr('pointer-events','none');
 const nearest=time=>record.frames[d3.leastIndex(record.frames,f=>Math.abs(f.t-time))];
 let lastTime=from,lastActive=false,keyboardTime=from,pressPoint=null;
 const setValue=time=>{keyboardTime=Math.max(from,Math.min(to,time));svg.attr('aria-valuenow',keyboardTime).attr('aria-valuetext',`${keyboardTime.toFixed(2)} s`)};
 const update=(time,active)=>{lastTime=time;lastActive=active;const within=active&&time>=from&&time<=to,tm=Math.max(from,Math.min(to,time)),f=nearest(tm);cursor.attr('x1',x(tm)).attr('x2',x(tm)).attr('opacity',within?1:0);dot.attr('cx',x(tm)).attr('cy',f?.f0?py(f.f0):bottom).attr('opacity',within&&f?.f0?1:0);if(within)setValue(tm)};
 const timeAt=event=>Math.max(from,Math.min(to,x.invert(d3.pointer(event,svg.node())[0])));
 const seek=time=>{setValue(time);onSeek(record,keyboardTime,{preserveRegion:true})};
 svg.on('pointerdown',event=>{if(event.button!==0)return;pressPoint=d3.pointer(event,svg.node())}).on('pointermove',event=>{
  const time=timeAt(event),f=nearest(time);marker.attr('x1',x(time)).attr('x2',x(time)).attr('opacity',1);
  tooltip.style('display','block').style('left',`${Math.max(8,Math.min(window.innerWidth-225,event.clientX+12))}px`).style('top',`${Math.min(window.innerHeight-65,event.clientY+16)}px`).text(`${time.toFixed(2)} s · ${f?.f0?Math.round(f.f0)+' Hz':local(t,'noPitchHere','此处无可靠音高','No reliable pitch here')}`);
  if(!lastActive){dot.attr('cx',x(time)).attr('cy',f?.f0?py(f.f0):bottom).attr('opacity',f?.f0?1:0)}
 }).on('pointerup',event=>{if(!pressPoint)return;const p=d3.pointer(event,svg.node()),moved=Math.hypot(p[0]-pressPoint[0],p[1]-pressPoint[1]);pressPoint=null;if(moved<8)seek(timeAt(event));tooltip.style('display','none')}).on('pointerleave',()=>{pressPoint=null;marker.attr('opacity',0);tooltip.style('display','none');update(lastTime,lastActive)}).on('pointercancel',()=>{pressPoint=null;tooltip.style('display','none')}).on('keydown',event=>{
  let target;if(event.key==='ArrowRight')target=keyboardTime+span/100;else if(event.key==='ArrowLeft')target=keyboardTime-span/100;else if(event.key==='Home')target=from;else if(event.key==='End')target=to;else return;
  event.preventDefault();seek(target);
 });
 return {update,destroy(){svg.on('pointerdown',null).on('pointermove',null).on('pointerup',null).on('pointerleave',null).on('pointercancel',null).on('keydown',null);svg.remove()}};
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
