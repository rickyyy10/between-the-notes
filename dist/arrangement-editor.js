import {normalizeArrangementEvents} from './audio-engine.js?v=20261116-explore';

/** Editable added-layer timeline. onChange runs only after a committed edit. */
export function mountArrangementEditor(el,{record,events=[],lang='zh',texture='soft',onChange=()=>{}}){
 const d3=window.d3,cn=lang==='zh',tr=(zh,en)=>cn?zh:en;
 const names={soft:tr('长音','Sustain'),pluck:tr('弹拨','Pluck'),percussion:tr('打击','Percussion')};
 const duration=record.duration,colors={soft:'#a77c3d',pluck:'#c48643',percussion:'#8e6d9c'};
 const copy=xs=>xs.map(e=>({...e}));
 const uid=()=>`edit-${globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)}`;
 let items=normalizeArrangementEvents(events.map(e=>({...e,id:e.id??uid()})),record,texture),selected=null,lastTime=0,added=true,destroyed=false,drag=null;
 // IDs are internal keys, not user-facing or HTML fragments.
 const seen=new Set();items.forEach(e=>{if(seen.has(e.id))e.id=uid();seen.add(e.id)});
 el.replaceChildren();el.classList.add('arrangement-editor');el.setAttribute('role','group');el.setAttribute('aria-label',tr('编辑伴奏时间线','Edit accompaniment timeline'));
 const controls=document.createElement('div');controls.className='ae-controls';
 const button=(text,label)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label||text);return b};
 const addButton=button(tr('+ 添加声音','+ Add sound'));addButton.className='ae-add';
 const deleteButton=button(tr('删除','Delete'));deleteButton.className='ae-delete';deleteButton.disabled=true;
 const fields=document.createElement('div');fields.className='ae-fields';fields.hidden=true;
 const numberField=(name)=>{const l=document.createElement('label');l.textContent=name;const input=document.createElement('input');input.type='number';input.step='.05';input.inputMode='decimal';l.append(input);fields.append(l);return input};
 const startInput=numberField(tr('开始 / 秒','Start / s'));startInput.min='0';startInput.max=String(Math.max(0,duration-.02));
 const durationInput=numberField(tr('持续 / 秒','Length / s'));durationInput.min='.02';durationInput.max=String(duration);
 controls.append(addButton,deleteButton,fields);el.append(controls);
 const scroll=document.createElement('div');scroll.className='ae-canvas';el.append(scroll);
 const w=Math.max(320,el.clientWidth||500),h=243,m={l:42,r:14};
 const x=d3.scaleLinear().domain([0,duration]).range([m.l,w-m.r]);
 const svg=d3.select(scroll).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('class','ae-svg').attr('aria-label',tr('原始人声与可编辑伴奏','Original voice and editable accompaniment'));
 const waveformCenter=37,lanes={soft:108,pluck:150,percussion:192};
 const peak=d3.max(record.waveform||[],p=>Math.max(Math.abs(p.min),Math.abs(p.max)))||1;
 const amp=d3.scaleLinear().domain([0,peak]).range([0,22]);
 svg.append('text').attr('x',0).attr('y',41).attr('class','ae-label').text(tr('人声','Voice'));
 svg.append('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',waveformCenter).attr('y2',waveformCenter).attr('stroke','#dce4d7');
 svg.append('path').datum(record.waveform||[]).attr('class','ae-waveform').attr('fill','#487b68').attr('opacity',.58).attr('d',d3.area().x(p=>x(p.t)).y0(p=>waveformCenter+amp(-p.min)).y1(p=>waveformCenter-amp(p.max)));
 for(const [kind,y] of Object.entries(lanes)){
  svg.append('rect').attr('x',m.l).attr('y',y-17).attr('width',w-m.l-m.r).attr('height',34).attr('rx',5).attr('fill',kind==='percussion'?'#f1edf3':'#f5f0e5').attr('class','ae-lane').attr('data-kind',kind);
  svg.append('text').attr('x',0).attr('y',y+4).attr('class','ae-label').text(names[kind]);
 }
 const axis=svg.append('g').attr('transform','translate(0,222)').attr('class','axis').call(d3.axisBottom(x).ticks(w<420?4:6).tickSize(3).tickFormat(v=>`${v}s`));
 const eventsLayer=svg.append('g').attr('class','ae-events');
 const cursor=svg.append('line').attr('class','ae-cursor').attr('y1',9).attr('y2',210).attr('x1',x(0)).attr('x2',x(0));
 const status=document.createElement('span');status.className='ae-sr';status.setAttribute('role','status');el.append(status);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const eventLabel=e=>`${names[e.kind]} · ${e.time.toFixed(2)}–${(e.time+e.duration).toFixed(2)} s`;
 function syncControls(){const e=items.find(e=>e.id===selected);deleteButton.disabled=!e;fields.hidden=!e;if(e){startInput.value=e.time.toFixed(2);durationInput.value=e.duration.toFixed(2);durationInput.max=String(duration-e.time)}addButton.disabled=items.length>=256}
 function select(id){selected=id;syncControls();drawEvents();const e=items.find(e=>e.id===selected);if(e)status.textContent=eventLabel(e)}
 function paintPlayback(){eventsLayer.selectAll('.ae-event').attr('opacity',e=>!added?.25:(lastTime>=e.time&&lastTime<=e.time+e.duration)?1:.78).classed('is-playing',e=>added&&lastTime>=e.time&&lastTime<=e.time+e.duration);cursor.attr('x1',x(lastTime)).attr('x2',x(lastTime))}
 function drawEvents(){
  if(destroyed)return;
  const groups=eventsLayer.selectAll('.ae-event').data(items,e=>e.id).join(enter=>{const g=enter.append('g').attr('class','ae-event').attr('role','button').attr('tabindex',0);g.append('title');g.append('rect').attr('class','ae-hit').attr('fill','transparent');g.append('rect').attr('class','ae-tone');g.append('circle').attr('class','ae-drum');g.append('line').attr('class','ae-pluck-mark');g.append('rect').attr('class','ae-resize');return g;});
  groups.attr('data-event-id',e=>e.id).attr('aria-label',eventLabel).attr('aria-pressed',e=>String(e.id===selected)).classed('is-selected',e=>e.id===selected);
  groups.select('title').text(eventLabel);
  groups.select('.ae-hit').attr('x',e=>x(e.time)-5).attr('y',e=>lanes[e.kind]-18).attr('width',e=>Math.max(22,x(e.time+e.duration)-x(e.time)+10)).attr('height',36);
  groups.select('.ae-tone').attr('display',e=>e.kind==='percussion'?'none':null).attr('x',e=>x(e.time)).attr('y',e=>lanes[e.kind]-(e.kind==='soft'?11:7)).attr('width',e=>Math.max(3,x(e.time+e.duration)-x(e.time))).attr('height',e=>e.kind==='soft'?22:14).attr('rx',e=>e.kind==='soft'?8:3).attr('fill',e=>colors[e.kind]);
  groups.select('.ae-drum').attr('display',e=>e.kind==='percussion'?null:'none').attr('cx',e=>x(e.time)).attr('cy',e=>lanes[e.kind]).attr('r',7).attr('fill',e=>colors[e.kind]);
  groups.select('.ae-pluck-mark').attr('display',e=>e.kind==='pluck'?null:'none').attr('x1',e=>x(e.time)+3).attr('x2',e=>x(e.time)+3).attr('y1',e=>lanes[e.kind]-10).attr('y2',e=>lanes[e.kind]+10).attr('stroke','#7c4a19').attr('stroke-width',2);
  groups.select('.ae-resize').attr('display',e=>e.kind==='percussion'||e.id!==selected?'none':null).attr('x',e=>x(e.time+e.duration)-5).attr('y',e=>lanes[e.kind]-13).attr('width',10).attr('height',26).attr('rx',3).attr('fill','#fff8e8').attr('stroke',e=>colors[e.kind]);
  groups.on('click',(event,e)=>{event.stopPropagation();if(!drag)select(e.id)}).on('keydown',(event,e)=>{
   if(event.key==='Enter'||event.key===' '){event.preventDefault();select(e.id);return}
   if(['Delete','Backspace'].includes(event.key)){event.preventDefault();selected=e.id;remove();return}
   const delta=event.shiftKey?.5:.1;
   if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();selected=e.id;e.time=clamp(e.time+(event.key==='ArrowLeft'?-delta:delta),0,duration-e.duration);commit()}
   if(['+','=','-','_'].includes(event.key)&&e.kind!=='percussion'){event.preventDefault();selected=e.id;e.duration=clamp(e.duration+(['-','_'].includes(event.key)?-delta:delta),.02,duration-e.time);commit()}
  }).on('pointerdown',(event,e)=>{
   if(event.button!==0)return;event.stopPropagation();event.preventDefault();selected=e.id;const node=event.currentTarget;const resize=event.target.classList.contains('ae-resize');drag={id:e.id,pointer:event.pointerId,node,resize,x:d3.pointer(event,svg.node())[0],time:e.time,duration:e.duration,changed:false};node.setPointerCapture(event.pointerId);syncControls();drawEvents();
  }).on('pointermove',(event)=>{
   if(!drag||drag.pointer!==event.pointerId)return;const e=items.find(e=>e.id===drag.id);if(!e)return;
   const delta=x.invert(d3.pointer(event,svg.node())[0])-x.invert(drag.x);
   if(drag.resize)e.duration=clamp(drag.duration+delta,.02,duration-e.time);else e.time=clamp(drag.time+delta,0,duration-e.duration);
   drag.changed=drag.changed||Math.abs(delta)>.005;syncControls();drawEvents();
  }).on('pointerup',(event)=>{
   if(!drag||drag.pointer!==event.pointerId)return;const previous=drag;drag=null;if(previous.node.hasPointerCapture(event.pointerId))previous.node.releasePointerCapture(event.pointerId);if(previous.changed)commit();else select(previous.id);
  }).on('pointercancel',(event)=>{if(!drag||drag.pointer!==event.pointerId)return;const e=items.find(e=>e.id===drag.id);if(e){e.time=drag.time;e.duration=drag.duration}drag=null;syncControls();drawEvents()});
  paintPlayback();
 }
 function commit(){items=normalizeArrangementEvents(items,record,texture);if(selected&&!items.some(e=>e.id===selected))selected=null;syncControls();drawEvents();const e=items.find(e=>e.id===selected);status.textContent=e?eventLabel(e):tr('已更新伴奏','Accompaniment updated');onChange(copy(items));}
 function add(at=lastTime,kind=texture){
  if(items.length>=256)return;
  kind=Object.hasOwn(names,kind)?kind:'soft';const time=clamp(at,0,duration-.02);const length=Math.min(kind==='soft'?1.4:kind==='pluck'?.7:.19,duration-time);
  const frame=(record.frames||[]).filter(f=>f.f0>0).reduce((best,f)=>!best||Math.abs(f.t-time)<Math.abs(best.t-time)?f:best,null);
  let frequency=frame?.f0||record.metrics?.pitchMedianHz||140;while(frequency>220)frequency/=2;while(frequency<85)frequency*=2;
  const e={id:uid(),time,duration:length,kind,frequency:kind==='percussion'?null:frequency};items.push(e);selected=e.id;commit();
 }
 function remove(){if(!selected)return;items=items.filter(e=>e.id!==selected);selected=null;commit();status.textContent=tr('声音已删除','Sound deleted')}
 addButton.onclick=()=>add(lastTime,texture);deleteButton.onclick=remove;
 startInput.onchange=()=>{const e=items.find(e=>e.id===selected);if(!e)return;const value=Number(startInput.value);if(Number.isFinite(value)){e.time=clamp(value,0,duration-e.duration);commit()}else syncControls()};
 durationInput.onchange=()=>{const e=items.find(e=>e.id===selected);if(!e)return;const value=Number(durationInput.value);if(Number.isFinite(value)){e.duration=clamp(value,.02,duration-e.time);commit()}else syncControls()};
 svg.on('dblclick',(event)=>{if(event.target.closest('.ae-event'))return;const [px,py]=d3.pointer(event,svg.node());if(px<m.l||px>w-m.r||py<85||py>212)return;const kind=Object.keys(lanes).reduce((a,b)=>Math.abs(lanes[a]-py)<Math.abs(lanes[b]-py)?a:b);add(x.invert(px),kind)});
 syncControls();drawEvents();
 return {update(time,showAdded=true){if(destroyed)return;lastTime=clamp(Number(time)||0,0,duration);added=showAdded;paintPlayback()},destroy(){destroyed=true;if(drag?.node.hasPointerCapture(drag.pointer))drag.node.releasePointerCapture(drag.pointer);drag=null;svg.on('dblclick',null);eventsLayer.selectAll('.ae-event').on('click keydown pointerdown pointermove pointerup pointercancel',null);addButton.onclick=deleteButton.onclick=startInput.onchange=durationInput.onchange=null;el.replaceChildren();el.classList.remove('arrangement-editor')}};
}
