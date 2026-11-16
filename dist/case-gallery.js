const d3=window.d3;
export function renderCaseGallery(el,{pairs,recordMap,lang,current,onSelect}){
 const all=pairs.flatMap(p=>p.recordIds.map(id=>recordMap.get(id))),valid=all.flatMap(r=>r.frames.filter(f=>f.f0>0).map(f=>f.f0));
 const maxTime=d3.max(all,r=>r.duration),lo=Math.max(40,d3.min(valid)*.95),hi=d3.max(valid)*1.05;
 el.replaceChildren();
 for(const [i,pair] of pairs.entries()){
  const button=document.createElement('button');button.type='button';button.className='case-card';button.dataset.case=pair.id;button.setAttribute('aria-pressed',String(pair.id===current));
  const label=`${lang==='zh'?'对照':'Pair'} ${String(i+1).padStart(2,'0')} · ${pair.recordIds.map(id=>parseInt(id.split('-').at(-1),10)).join(' / ')}`;
  const title=document.createElement('span');title.className='case-card-title';title.textContent=label;button.append(title);
  const w=250,h=125,x=d3.scaleLinear().domain([0,maxTime]).range([40,w-13]);
  const svg=d3.select(button).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('aria-hidden','true');
  pair.recordIds.forEach((id,j)=>{const r=recordMap.get(id),top=12+j*54,y=d3.scaleLog().domain([lo,hi]).range([top+38,top]);const color=j?'#c9654e':'#167b72';
   svg.append('line').attr('x1',40).attr('x2',w-13).attr('y1',top+38).attr('y2',top+38).attr('stroke','#e2e8e1');
   svg.append('text').attr('x',0).attr('y',top+20).attr('fill',color).attr('font-size',11).attr('font-weight',600).text(parseInt(id.split('-').at(-1),10));
   svg.append('path').datum(r.frames).attr('fill','none').attr('stroke',color).attr('stroke-width',1.9).attr('stroke-linecap','round').attr('d',d3.line().defined(f=>f.f0>0).x(f=>x(f.t)).y(f=>y(f.f0)));
  });
  svg.append('text').attr('x',40).attr('y',123).attr('fill','#718078').attr('font-size',9).text('0 s');svg.append('text').attr('x',w-13).attr('y',123).attr('text-anchor','end').attr('fill','#718078').attr('font-size',9).text(`${maxTime.toFixed(1)} s`);
  button.setAttribute('aria-label',label);button.onclick=()=>onSelect(pair.id);el.append(button);
 }
}
