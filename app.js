import {MODEL_VERSION,DRUGS,TISSUES,scenario,event,uid,simulate,at,parseSave,validateScenario,forkScenario,isAdult,clamp} from './model.js';
import {createBody} from './body.js';

const $=(q,root=document)=>root.querySelector(q);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=['#b9e5ce','#e3b984','#aab6ef','#df9ab8','#89c9d9','#d9d39b','#c5a5e3','#f0a693'];
const STORE='limen-lab-v1';
let scenarios=[scenario()],active=scenarios[0].id,month=12,view='lab',playing=false,timer=null,chartMode='tissue',selectedTissue='breast',ghost=false,dirty=false;
const cache=new Map();
try{const raw=localStorage.getItem(STORE);if(raw){const save=parseSave(raw);scenarios=save.scenarios;active=scenarios[0].id;month=clamp(save.month??12,0,60);}}catch{/* Local state may be unavailable; the app stays usable. */}
const current=()=>scenarios.find(s=>s.id===active)||scenarios[0];
const result=s=>{const key=JSON.stringify(s);if(!cache.has(key)){if(cache.size>30)cache.clear();cache.set(key,simulate(s));}return cache.get(key);};
const formatMonth=m=>m===0?'基线':`${Number(m.toFixed(1))} 个月`;
const pct=v=>Math.round((v||0)*100);
let body;
const sources=[
 {id:'endo',label:'临床指南 · 2017',title:'Endocrine Society · 内分泌治疗指南',url:'https://www.endocrine.org/clinical-practice-guidelines/gender-dysphoria-gender-incongruence',text:'提供变化时间与监测议题的参考，不提供可直接预测个体结果的函数。网站资源页更新于 2024 年，指南本体为 2017 年。'},
 {id:'soc8',label:'临床指南 · 2022',title:'WPATH · Standards of Care 8',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC9553112/',text:'用于组织变化的起始与持续时间参考、青春期阶段和医疗监测背景。时间范围并非保证。'},
 {id:'ucsf',label:'临床指南 · 2016',title:'UCSF · 女性化激素治疗',url:'https://transcare.ucsf.edu/guidelines/feminizing-hormone-therapy',text:'参考作用机制与证据限制。该页面较旧，需要结合后续原始研究阅读。'},
 {id:'anti',label:'随机试验 · 2025',title:'螺内酯与环丙孕酮：乳房发育比较',url:'https://pubmed.ncbi.nlm.nih.gov/39288020/',text:'六个月研究中两组乳房增长无显著差异，尽管睾酮抑制不同。不能据此推断长期完全等效。'},
 {id:'three',label:'前瞻队列 · 2021',title:'乳房发育的三年随访',url:'https://pubmed.ncbi.nlm.nih.gov/33206172/',text:'观察到乳房发育可持续三年；不能把两年写成所有人的固定终点，也不能用这项队列拟合任意用药组合。'},
 {id:'injection',label:'回顾研究 · 2025',title:'注射雌二醇：多中心研究',url:'https://pubmed.ncbi.nlm.nih.gov/39797602/',text:'用于理解给药时间、剂量与测量时点。横断面数据不等于个体完整药代曲线；本软件没有据此拟合浓度。'},
 {id:'bica',label:'病例系列 · 2024',title:'比卡鲁胺与血清睾酮',url:'https://pubmed.ncbi.nlm.nih.gov/39691186/',text:'提示受体阻断不能简单用血清睾酮低值来评判。样本有限，不构成安全性保证。'},
 {id:'bone',label:'随访研究 · 2023',title:'青春期抑制后长期骨密度随访',url:'https://pubmed.ncbi.nlm.nih.gov/37902760/',text:'用于说明骨量累积值得关注。个体最终骨密度、骨折风险和身高没有在本模型中计算。'},
 {id:'prog',label:'研究机构公告 · 2025',title:'Amsterdam UMC · 孕酮试验初步结果',url:'https://amsterdamumc.org/en/spotlight/addition-of-progesterone-leads-to-increased-breast-growth-for-transgender-women',text:'会议结果公告提示潜在作用，但不当成已充分验证的个体响应模型。孕酮事件当前不改变模拟组织数值。'}
];

document.querySelector('#app').innerHTML=`
<header class="topbar">
 <a class="brand" href="#" aria-label="阈限主页"><span class="brand-mark">L<span>·</span></span><span>阈限 <b>LIMEN</b><small>BODY CHANGE LAB</small></span></a>
 <nav aria-label="主导航"><button data-view="lab" class="nav active">实验台</button><button data-view="compare" class="nav">分支对比 <span id="branch-count">1</span></button><button data-view="evidence" class="nav">证据与模型 <span class="nav-dot"></span></button></nav>
 <div class="top-actions"><span class="local-status"><i></i><span id="save-status">本地计算</span></span><button class="icon-btn" data-action="help" title="使用指南" aria-label="使用指南">?</button><button class="button compact" data-action="files">存档 <span>↗</span></button></div>
</header>
<div class="app-layout">
 <aside class="left-panel"><div class="section-eyebrow">YOUR SUBJECT <span>01 / 虚构人物</span></div><div id="profile"></div><div class="sidebar-divider"></div><div class="section-head"><h2>实验分支</h2><button class="icon-btn" data-action="new" title="新建人物方案" aria-label="新建人物方案">＋</button></div><div id="scenario-list"></div><button class="branch-add" data-action="fork">⑂ 从当前时间分叉</button><div class="local-note"><span>◈</span><p>你的实验留在这台设备。<br>存档不上传到服务器。</p></div></aside>
 <main id="workspace">
 <section id="lab-view">
  <div class="workspace-heading"><div><div class="section-eyebrow">A BODY, MANY POSSIBILITIES</div><h1>探索变化的可能。</h1></div><span class="model-tag">机制示意 <span>v${MODEL_VERSION}</span></span></div>
  <div class="stage" id="stage"><div class="stage-grid"></div><div class="stage-top"><span class="stage-subject" id="stage-subject"></span><span class="stage-time" id="stage-time"></span></div><div id="body-canvas"></div><div class="body-annotation annotation-chest"><span class="annotation-dot"></span><span>乳房组织<small>逐步响应 · 形态示意</small></span></div><div class="body-annotation annotation-hip"><span class="annotation-dot"></span><span>脂肪分布<small>时间与个体共同作用</small></span></div><span class="body-scale">ILLUSTRATIVE ANATOMY<br>形态不代表实测尺寸</span><div class="stage-bottom"><div class="view-buttons" role="group" aria-label="人体角度"><button data-angle="0" class="active">正面</button><button data-angle="1.5708">侧面</button><button data-angle="3.14159">背面</button></div><label class="ghost-toggle"><input id="ghost-toggle" type="checkbox"> 基线叠影</label><span class="drag-hint">↔ 拖动旋转</span></div></div>
  <div class="time-panel"><div class="time-head"><div class="time-controls"><button id="play" class="play-button" aria-label="播放时间">▶</button><strong id="time-label">12 <small>个月</small></strong><span id="time-age"></span></div><div class="time-jumps"><button data-month="0">基线</button><button data-month="6">6 月</button><button data-month="12">1 年</button><button data-month="36">3 年</button><button data-month="60">5 年</button></div><button class="button compact mint" data-action="fork">⑂ 保存分叉点</button></div><input id="time-slider" type="range" min="0" max="60" step="0.1" value="12" aria-label="模拟时间（月）"><div class="time-ticks"><span>0</span><span>12 个月</span><span>24</span><span>36</span><span>48</span><span>60</span></div><div id="timeline-tracks"></div></div>
  <div class="section-head results-head"><h2>身体的不同节奏 <span>点选组织查看依据</span></h2><span class="tiny-label">归一化示意状态 · 非发育完成度</span></div><div id="metrics" class="metrics"></div>
  <div class="chart-panel"><div class="chart-heading"><div><h2 id="chart-title">组织响应轨迹</h2><p id="chart-subtitle">每种组织有自己的时间尺度。</p></div><div class="segmented"><button data-chart="tissue" class="active">组织</button><button data-chart="exposure">暴露</button><button data-chart="androgen">雄激素</button></div></div><div id="main-chart"></div><div id="chart-legend" class="chart-legend"></div><p id="chart-note" class="chart-note"></p></div>
  <div id="warnings"></div>
 </section>
 <section id="compare-view" hidden><div class="workspace-heading"><div><div class="section-eyebrow">SAME ORIGIN, DIFFERENT PATHS</div><h1>让可能性并排发生。</h1></div><button class="button mint" data-action="fork">＋ 创建分支</button></div><div class="info-banner">⑂ 分叉会复制人物与完整干预历史。分叉前的设置会锁定；在分叉点调整之后的干预，观察差异。</div><div id="compare-content"></div></section>
 <section id="evidence-view" hidden><div class="workspace-heading"><div><div class="section-eyebrow">KNOW WHAT THE MODEL KNOWS</div><h1>让每个假设都可见。</h1></div><span class="model-tag">研究查阅 · 2026.10</span></div><div class="evidence-intro"><span class="big-asterisk">✳</span><div><h2>方向有依据，数值有边界。</h2><p>这是基于机制的教育沙盒。文献用于确定变化方向、时间背景与局限；药代系数、组织响应函数和外形映射均为作者设定，尚未经过临床数据拟合或外部验证。</p></div></div><div class="evidence-facts"><article><b>可以探索</b><p>时序、峰谷、机制差异、停止与恢复、同一虚构身体的分支。</p></article><article><b>不作预测</b><p>真实血药浓度、罩杯、最终身高、骨密度、生育能力与个人风险概率。</p></article><article><b>未知保持未知</b><p>无“最佳方案”评分；更高剂量不等于更好结果；无安全阈值判断。</p></article></div><div id="sources"></div><div class="method-panel"><h2>模型是怎样运行的？</h2><p>每 0.25 日推进一次：给药事件 → 储库吸收 → 中央消退 → 平滑相对暴露 → 分别计算生成抑制与受体阻断 → 组织迟滞、饱和及回转。一个模拟月固定为 30 日。所有相对指标都没有化验单位。</p><p>人体网格由组织状态驱动，仅用于示意。基线 E2/T 是档案记录，当前不用于浓度计算；肌肉基线用于外形展示。年龄仅用于切换成人/发育模式及时间显示，未拟合年龄效应。种子用于固定作者设定的响应幅度和速度，不代表测得的基因。</p><p>体脂与肌肉变化未包含饮食、训练、疾病或能量平衡。其他药物、肝肾功能、药物相互作用、真实制剂差异、GnRH 初始激动期均未建模。五年曲线有大量外推，持续时间不是有效性承诺。</p><a href="./docs/evidence.md" target="_blank" rel="noopener">完整证据与实现边界 ↗</a> <a href="./docs/model.md" target="_blank" rel="noopener">方程、参数与测试说明 ↗</a></div></section>
 <footer>阈限 LIMEN <span>一个身体，许多可能。</span><span>虚构实验 · 不能用于选择或调整真人用药</span></footer>
 </main>
 <aside class="right-panel"><div class="section-eyebrow">INTERVENTIONS <span>02 / 干预时间表</span></div><div class="section-head"><h2>安排一条新路径</h2><span class="live-dot"></span></div><p class="panel-description">改变开始时间、剂量与频率，<br>观察这一个虚构身体的响应。</p><div id="event-list"></div><button class="add-event" data-action="add-event">＋ 添加干预</button><div class="context-card"><span>↗</span><h3>数值不是处方</h3><p>输入保留真实药物单位，输出仅为相对机制示意。不同制剂不能据此换算；预填参数仅供操作演示。</p><button data-action="model">了解模型边界 →</button></div><div id="context-notes"></div></aside>
</div>`;
body=createBody($('#body-canvas'));

function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),4000);}
function persist(){dirty=false;try{localStorage.setItem(STORE,JSON.stringify({schema:1,model:MODEL_VERSION,month,scenarios}));$('#save-status').textContent='已存于本机';}catch{$('#save-status').textContent='未能自动存档';dirty=true;}}
function mutation(fn){stop();try{fn();scenarios.forEach(validateScenario);persist();render();}catch(e){toast(e.message);}}
function profileField(key,label,min,max,step=1,unit=''){
  const p=current().profile,locked=current().lockedUntil>0;
  return `<label class="profile-field"><span>${label}<small>${unit}</small></span><input data-profile="${key}" type="number" value="${p[key]}" min="${min}" max="${max}" step="${step}" ${locked?'disabled':''}></label>`;
}
function renderProfile(){
 const s=current(),p=s.profile,locked=s.lockedUntil>0;
 $('#profile').innerHTML=`<div class="subject-name"><div class="subject-avatar">${esc(p.name.charAt(0)||'林')}</div><div><input id="subject-name" aria-label="人物名称" maxlength="60" value="${esc(p.name)}" ${locked?'disabled':''}><span>出生时指定为男性 · 虚构档案</span></div></div><div class="mode-switch"><span class="${isAdult(p)?'selected':''}">成人路径</span><span class="${!isAdult(p)?'selected':''}">发育路径</span></div><div class="profile-fields">${profileField('age','起始年龄',10,80,1,'岁')}${profileField('height','身高',120,220,1,'cm')}${profileField('weight','体重',30,200,.5,'kg')}${profileField('fat','初始体脂',5,55,1,'%')}</div><label class="profile-select"><span>青春期阶段</span><select id="tanner" ${locked?'disabled':''}><option value="5" ${p.tanner===5?'selected':''}>Tanner V · 已完成</option><option value="4" ${p.tanner===4?'selected':''}>Tanner IV · 后期</option><option value="3" ${p.tanner===3?'selected':''}>Tanner III · 中期</option><option value="2" ${p.tanner===2?'selected':''}>Tanner II · 初期</option></select></label><details class="advanced-profile"><summary>更多身体参数 <span>＋</span></summary><div class="profile-fields">${profileField('muscle','肌肉基线',0,100,1,'示意')}${profileField('baselineT','基线 T',1,1500,1,'ng/dL')}${profileField('baselineE','基线 E2',1,200,1,'pg/mL')}</div><p class="micro-note">E2/T 仅作档案记录，当前不参与计算。肌肉基线影响示意外形。</p></details><div class="seed-row"><span>个体种子</span><input id="seed" aria-label="个体差异种子" type="number" min="1" max="999999" step="1" value="${p.seed}" ${locked?'disabled':''}><button data-action="random-seed" class="icon-btn" title="随机个体差异" aria-label="随机个体差异" ${locked?'disabled':''}>⤨</button></div>${locked?`<p class="micro-note lock-note">⌑ 分叉前的身体参数已锁定 · ${formatMonth(s.lockedUntil)}</p>`:''}`;
 $('#scenario-list').innerHTML=scenarios.map((b,i)=>`<button class="scenario-item ${b.id===active?'selected':''}" data-scenario="${esc(b.id)}"><i style="background:${colors[i]}"></i><span>${esc(b.name)}<small>${b.lockedUntil?formatMonth(b.lockedUntil)+' 分叉':'独立起始档案'}</small></span><span>↗</span></button>`).join('');
 $('#branch-count').textContent=scenarios.length;
}
function renderEvents(){
 const s=current();
 $('#event-list').innerHTML=s.events.map(e=>{
   const d=DRUGS[e.drug],locked=e.start<s.lockedUntil;
   return `<article class="event-card ${d.kind}" data-event="${esc(e.id)}"><div class="event-top"><span class="event-category">${{estrogen:'雌激素',anti:'抗雄激素',blocker:'轴抑制 / 阻断',dht:'DHT 路径',exploratory:'探索项 · 未计入'}[d.kind]}</span><button class="icon-btn" data-edit="${esc(e.id)}" aria-label="编辑 ${d.name}">↗</button></div><h3>${d.name}</h3><div class="event-dose">${e.dose}<small>${d.unit}</small><span>${d.continuous?'持续释放':`每 ${e.interval} 日`}</span></div><div class="event-time"><span>第 ${e.start}–${e.end} 月</span><span>${locked?'⌑ 历史已锁定':e.start<=month&&e.end>month?'● 当前进行中':e.start>month?'◷ 尚未开始':'已结束'}</span></div></article>`;
 }).join('')||'<div class="empty-small">这里还没有干预。<br>可以先观察基线，再添加一条路径。</div>';
 $('#context-notes').innerHTML=`<div class="micro-note">${s.events.length} 项干预 · 最多 30 项<br>生殖 / 生育、骨健康与个体风险仅提供背景说明，不输出概率。</div>`;
}
function renderTracks(){
 $('#timeline-tracks').innerHTML=current().events.map(e=>`<div class="timeline-track"><span title="${DRUGS[e.drug].name}">${DRUGS[e.drug].name.split(' · ')[0]}</span><div><i class="track-${DRUGS[e.drug].kind}" style="left:${e.start/60*100}%;width:${(e.end-e.start)/60*100}%"></i></div></div>`).join('');
}
function chartSvg(series,{max=1,unit='相对状态',selected=month,windowStart=0,windowEnd=60}={}){
 const W=800,H=224,L=44,R=16,T=14,B=32,w=W-L-R,h=H-T-B;
 const x=m=>L+(m-windowStart)/(windowEnd-windowStart)*w,y=v=>T+h-clamp(v/max)*h;
 const grid=[0,.25,.5,.75,1].map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v*max)}" y2="${y(v*max)}" stroke="#ffffff0c"/><text x="${L-10}" y="${y(v*max)+4}" text-anchor="end">${(v*max).toFixed(max>2?0:2).replace(/0+$/,'').replace(/\.$/,'')||'0'}</text>`).join('');
 const ticks=Array.from({length:6},(_,i)=>windowStart+(windowEnd-windowStart)*i/5).map(m=>`<text x="${x(m)}" y="${H-8}" text-anchor="middle">${Number(m.toFixed(1))} 月</text>`).join('');
 const paths=series.map(s=>{
   const data=s.data.filter(p=>p.month>=windowStart&&p.month<=windowEnd);
   const points=data.map(p=>`${x(p.month).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ');
   const point=data.reduce((a,b)=>Math.abs(a.month-selected)<Math.abs(b.month-selected)?a:b,data[0]);
   return `<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="${s.dashed?1.5:2.5}" ${s.dashed?'stroke-dasharray="5 5"':''} stroke-linejoin="round"/>${point&&selected>=windowStart&&selected<=windowEnd?`<circle cx="${x(point.month)}" cy="${y(point.value)}" r="4" fill="${s.color}" stroke="#142224" stroke-width="2"/>`:''}`;
 }).join('');
 return `<svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(unit)}随时间的示意曲线">${grid}${ticks}${selected>=windowStart&&selected<=windowEnd?`<line x1="${x(selected)}" x2="${x(selected)}" y1="${T}" y2="${H-B}" stroke="#aac9bd55" stroke-dasharray="3 5"/>`:''}${paths}</svg>`;
}
function renderChart(){
 const r=result(current());
 if(r.qualitative){$('#main-chart').innerHTML=pubertyPanel();$('#chart-legend').innerHTML='';$('#chart-title').textContent='发育路径 · 定性模式';$('#chart-subtitle').textContent='不把成人响应模型外推到青春期。';$('#chart-note').textContent='年龄小于 18 岁或 Tanner II–IV 时，自动切换至定性展示。';return;}
 const sample=r.samples.filter((s,i)=>i%5===0||i===r.samples.length-1);
 let series=[],max=1,start=0,end=60;
 if(chartMode==='tissue'){
   series=Object.entries(TISSUES).map(([key,t],i)=>({label:t.name,color:colors[i],data:sample.map(p=>({month:p.month,value:p[key]}))}));
   $('#chart-title').textContent='组织响应轨迹';$('#chart-subtitle').textContent='各组织独立响应；乳房状态保留已形成的变化。';
   $('#chart-note').textContent='0–1 是软件内部状态，不是实际尺寸或“完成度”。方向和大致时间参考指南，幅度和响应方程尚未临床校准。';
 }else if(chartMode==='exposure'){
   end=Math.max(1,month);start=Math.max(0,end-3);
   const daily=r.samples.filter(p=>p.month>=start&&p.month<=end);
   series=[{label:'外源雌激素相对暴露',color:colors[0],data:daily.map(p=>({month:p.month,value:p.exposure}))}];
   max=Math.max(1,...daily.map(p=>p.exposure))*1.1;
   $('#chart-title').textContent='给药节奏与相对暴露';$('#chart-subtitle').textContent='显示当前时间附近最多 90 日；每日取样可能漏掉短暂峰值。';
   $('#chart-note').textContent='无量纲教学曲线。参考尺度和吸收 / 消退系数均为作者设定，不是血清 E2，也不能用于制剂等效换算。';
 }else{
   series=[['production','内源生成示意',colors[1]],['androgen','组织雄激素作用',colors[2]],['dht','DHT 作用示意',colors[0]]].map(([k,label,color])=>({label,color,data:sample.map(p=>({month:p.month,value:p[k]}))}));
   $('#chart-title').textContent='生成 ≠ 组织作用';$('#chart-subtitle').textContent='相对未干预基线，分别展示生成、受体与 DHT 路径。';
   $('#chart-note').textContent='这些是机制示意指标，不能换算睾酮或 DHT 浓度。受体阻断不必伴随生成下降，抑制程度不线性决定身体外形。';
 }
 $('#main-chart').innerHTML=chartSvg(series,{max,windowStart:start,windowEnd:end});
 $('#chart-legend').innerHTML=series.map(s=>`<span><i style="background:${s.color}"></i>${s.label}</span>`).join('');
}
function pubertyPanel(){
 const p=current().profile,s=current(),ongoing=s.events.filter(e=>e.start<=month&&e.end>month),blocked=ongoing.some(e=>e.drug==='gnrh'),estrogen=ongoing.some(e=>DRUGS[e.drug].kind==='estrogen');
 return `<div class="puberty-panel"><span class="qual-tag">Tanner ${p.tanner} · 不预测发育阶段进展</span><h3>${blocked?'抑制进一步的内源青春期信号':estrogen?'外源雌激素干预的发育路径':'观察自然发育背景'}</h3><p>${blocked?'GnRH 激动剂的持续作用可抑制性腺轴，减少后续内源青春期信号；不同制剂、初始反应与个体恢复未建模。':estrogen?'开始时间与当时发育状态会影响后续路径；不能由成人数据计算个人最终身高、体型或乳房发育。':'没有当前 GnRH 干预不代表一定继续某种发育速度。软件不根据年龄自动推进 Tanner 阶段。'}</p><div class="puberty-grid"><span>已形成的变化<b>不自动逆转</b></span><span>最终身高 / 骨密度<b>无法可靠估计</b></span><span>生育与恢复<b>不输出概率</b></span></div><p class="micro-note">${!blocked&&!estrogen&&ongoing.some(e=>DRUGS[e.drug].kind==='anti')?'当前存在其他抗雄药；不将其等同于 GnRH 青春期阻断。':''} ${blocked&&!estrogen?'当前未安排外源雌激素；持续低性激素与骨量累积等议题需要单独研究，软件不判断其安全性。':''}</p></div>`;
}
function updateTime(){
 renderEvents();
 const s=current(),r=result(s),v=at(r,month);
 $('#time-slider').value=month;$('#time-slider').style.setProperty('--progress',`${month/60*100}%`);
 $('#time-label').innerHTML=`${Number(month.toFixed(1))} <small>个月</small>`;
 $('#time-age').textContent=`虚构年龄 ${(s.profile.age+month/12).toFixed(1)} 岁`;
 $('#stage-time').innerHTML=`<i></i> ${formatMonth(month)}`;
 $('#stage-subject').innerHTML=`${esc(s.profile.name)} <span>${r.qualitative?'发育路径 · 成人轮廓占位':'成人身体 · 形态示意'}</span>`;
 body.update(s.profile,v);
 $('.stage').classList.toggle('qualitative',r.qualitative);
 $('#metrics').innerHTML=Object.entries(TISSUES).map(([k,t],i)=>`<button class="metric-card ${k===selectedTissue?'selected':''}" data-tissue="${k}"><span><i style="background:${colors[i]}"></i>${t.name}<b>↗</b></span><strong>${v?(v[k]).toFixed(2):'—'}<small>${v?'相对状态':'未量化'}</small></strong><div class="metric-track"><i style="width:${v?pct(v[k]):0}%;background:${colors[i]}"></i></div><small>${t.onset}起始参考</small></button>`).join('');
 $('#warnings').innerHTML=[...r.warnings,...(!r.qualitative&&month>36?['当前处于 3–5 年区间：多项曲线为外推，长期个体结果证据有限。']:[])].map(w=>`<p class="warning">ⓘ ${esc(w)}</p>`).join('');
 renderChart();if(view==='compare')renderCompare();
}
function renderCompare(){
 const metric=selectedTissue,adult=scenarios.filter(s=>!result(s).qualitative);
 const series=adult.map(s=>({label:s.name,color:colors[scenarios.indexOf(s)],data:result(s).samples.filter((_,i)=>i%10===0).map(p=>({month:p.month,value:p[metric]}))}));
 $('#compare-content').innerHTML=`<div class="compare-toolbar"><label>对比组织 <select id="compare-metric">${Object.entries(TISSUES).map(([k,t])=>`<option value="${k}" ${k===metric?'selected':''}>${t.name}</option>`).join('')}</select></label><span>${formatMonth(month)} · 同样种子才能固定个体假设</span></div><div class="compare-cards">${scenarios.map((s,i)=>{const r=result(s),v=at(r,month);return `<article class="compare-card"><div class="section-head"><span style="color:${colors[i]}">● 分支 ${String(i+1).padStart(2,'0')}</span><button class="icon-btn" data-rename="${esc(s.id)}" aria-label="重命名分支 ${esc(s.name)}">✎</button></div><h2>${esc(s.name)}</h2><p>${esc(s.profile.name)} · 种子 ${s.profile.seed}</p><strong>${v?v[metric].toFixed(2):'定性'}<small>${TISSUES[metric].name} · 示意状态</small></strong><span class="compare-origin">${s.lockedUntil?`${formatMonth(s.lockedUntil)} 分叉`:'独立档案'} · ${s.events.length} 项干预</span><button class="button compact" data-scenario="${esc(s.id)}">打开实验台 →</button>${scenarios.length>1?`<button class="text-button danger" data-delete-scenario="${esc(s.id)}">移除此分支</button>`:''}</article>`;}).join('')}</div><div class="chart-panel"><h2>${TISSUES[metric].name} · 多路径叠加</h2>${series.length?chartSvg(series):'<p class="micro-note">发育模式不输出数值曲线。</p>'}<div class="chart-legend">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('')}</div><p class="chart-note">对比只是作者设定的机制模型所产生的差异，不构成两种治疗真实效果的比较证据。不同档案的基线不一定一致。</p></div><div class="info-banner">想探索个体差异？新建独立方案并使用同样干预，更换种子。种子只改变假设的组织响应，不是经过验证的人群分布。</div>`;
}
function render(){renderProfile();renderTracks();updateTime();}
function switchView(next){view=next;for(const v of ['lab','compare','evidence'])$(`#${v}-view`).hidden=v!==view;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='compare')renderCompare();}
$('#sources').innerHTML=sources.map(s=>`<article class="source-card"><span>${s.label}</span><h3><a href="${s.url}" target="_blank" rel="noopener">${s.title} ↗</a></h3><p>${s.text}</p></article>`).join('');

function openDialog(html){stop();const d=$('#dialog');d.innerHTML=`<button class="dialog-close icon-btn" aria-label="关闭" data-action="close">×</button>${html}`;if(!d.open)d.showModal();}
function closeDialog(){$('#dialog').close();}
function editEvent(id){
 const s=current(),existing=s.events.find(e=>e.id===id),e=existing?{...existing}:event('patch',Math.max(s.lockedUntil,month<60?month:0),60),locked=existing&&e.start<s.lockedUntil;
 openDialog(`<div class="section-eyebrow">DESIGN AN INTERVENTION</div><h2>${existing?'编辑干预':'添加干预'}</h2>${locked?`<p class="info-banner">分叉前历史已锁定。${e.end>s.lockedUntil?'可以从分叉点创建后续调整，之前的给药节奏保持原样。':'这项干预已在分叉前结束。'}</p>`:''}<form id="event-form"><label class="form-field">药物 / 途径<select id="event-drug" ${locked?'disabled':''}>${Object.entries(DRUGS).map(([k,d])=>`<option value="${k}" ${e.drug===k?'selected':''}>${d.name}</option>`).join('')}</select></label><p id="drug-note" class="micro-note">${DRUGS[e.drug].note}</p><div class="form-grid"><label class="form-field">单次剂量 / 释放量<input id="event-dose" type="number" step="any" min="0.0001" max="1000" value="${e.dose}" required ${locked?'disabled':''}><small id="dose-unit">${DRUGS[e.drug].unit}</small></label><label class="form-field">给药间隔（日）<input id="event-interval" type="number" step="0.25" min="0.25" max="180" value="${e.interval}" required ${locked||DRUGS[e.drug].continuous?'disabled':''}><small id="interval-note">${DRUGS[e.drug].continuous?'贴片假定连续释放':'按给药日离散输入'}</small></label><label class="form-field">开始（月）<input id="event-start" type="number" step="0.1" min="${s.lockedUntil}" max="59.9" value="${e.start}" required ${locked?'disabled':''}></label><label class="form-field">结束（月，不含该时刻）<input id="event-end" type="number" step="0.1" min="0.1" max="60" value="${e.end}" required ${locked?'disabled':''}></label></div><p class="form-error" id="event-error" role="alert"></p><p class="micro-note">预填数值是演示输入，不代表推荐、安全或等效剂量。超过演示域会标注外推；软件不做医疗安全判断。</p><div class="dialog-actions">${existing&&!locked?'<button type="button" class="text-button danger" id="remove-event">删除干预</button>':''}${locked&&e.end>s.lockedUntil?'<button type="button" class="button mint" id="continue-event">从分叉点调整 →</button>':!locked?'<button class="button mint" type="submit">保存干预 →</button>':''}</div></form>`);
 $('#event-drug').addEventListener('change',()=>{const d=DRUGS[$('#event-drug').value];$('#event-dose').value=d.dose;$('#event-interval').value=d.interval;$('#event-interval').disabled=!!d.continuous;$('#dose-unit').textContent=d.unit;$('#drug-note').textContent=d.note;$('#interval-note').textContent=d.continuous?'贴片假定连续释放':'按给药日离散输入';});
 $('#event-form').addEventListener('submit',ev=>{ev.preventDefault();if(locked)return;const next={...e,drug:$('#event-drug').value,dose:Number($('#event-dose').value),interval:Number($('#event-interval').value),start:Number($('#event-start').value),end:Number($('#event-end').value)};if(!existing||next.start!==e.start||next.drug!==e.drug||next.interval!==e.interval)delete next.phase;try{if(next.start<s.lockedUntil)throw Error('不能修改分叉点之前的历史');const test={...s,events:existing?s.events.map(o=>o.id===id?next:o):[...s.events,next]};validateScenario(test);s.events=test.events;persist();closeDialog();render();}catch(err){$('#event-error').textContent=err.message;}});
 $('#remove-event')?.addEventListener('click',()=>{s.events=s.events.filter(o=>o.id!==id);persist();closeDialog();render();});
 $('#continue-event')?.addEventListener('click',()=>{
   if(s.events.length>=30){toast('每方案最多 30 项干预');return;}
   const split=s.lockedUntil,following={...existing,id:uid(),start:split,phase:existing.phase??existing.start};
   existing.end=split;s.events.push(following);persist();closeDialog();render();editEvent(following.id);
 });
}
function tissueDialog(key){
 selectedTissue=key;updateTime();const t=TISSUES[key],s=result(current()),v=at(s,month);
 openDialog(`<div class="section-eyebrow">TISSUE RESPONSE</div><h2>${t.name}</h2><div class="tissue-detail-value">${v?v[key].toFixed(2):'未量化'}<small>模型内部状态 · 不代表实际尺寸或完成度</small></div><div class="evidence-facts"><article><b>起始时间参考</b><p>${t.onset}</p></article><article><b>持续时间参考</b><p>${t.plateau}</p></article><article><b>停止之后</b><p>${t.reversible}</p></article></div><p>${t.note}</p><p class="micro-note">指南时间范围并非个人时间表。各组织并不共享一个“女性化程度”。</p><a href="${sources.find(s=>s.id===t.source).url}" target="_blank" rel="noopener">查阅指南来源 ↗</a><button class="button mint" data-action="evidence">查看全部模型依据 →</button>`);
}
function stop(){playing=false;clearInterval(timer);$('#play').textContent='▶';$('#play').setAttribute('aria-label','播放时间');}
function fork(){if(scenarios.length>=8){toast('最多保留 8 个分支，可以先导出存档');return;}const source=current(),forked=forkScenario(source,month);scenarios.push(forked);active=forked.id;persist();render();switchView('lab');toast(`已在 ${formatMonth(month)} 创建分支，之前历史已锁定`);}
function download(name,data,type){const blob=new Blob([data],{type}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function exportJSON(){download('limen-experiment.json',JSON.stringify({schema:1,model:MODEL_VERSION,month,scenarios},null,2),'application/json');toast('实验存档已导出');}
function exportCSV(){const s=current(),r=result(s);if(r.qualitative){toast('发育路径不生成数值数据，请导出 JSON 存档');return;}const header='model,month,relative_exposure,androgen_production,androgen_action,dht_action,breast_state,fat_state,muscle_state,skin_state,hair_state';download('limen-illustrative-data.csv',header+'\n'+r.samples.filter((p,i)=>i%30===0).map(p=>[MODEL_VERSION,p.month,p.exposure,p.production,p.androgen,p.dht,p.breast,p.fat,p.muscle,p.skin,p.hair].join(',')).join('\n'),'text/csv;charset=utf-8');toast('已导出每月示意数据，不能视为化验或临床预测');}
function rename(id){const s=scenarios.find(s=>s.id===id);openDialog(`<div class="section-eyebrow">NAME YOUR PATH</div><h2>命名实验分支</h2><form id="rename-form"><label class="form-field">分支名称<input id="rename-value" maxlength="60" value="${esc(s.name)}" required></label><button class="button mint">保存名称</button></form>`);$('#rename-form').addEventListener('submit',e=>{e.preventDefault();s.name=$('#rename-value').value.trim()||'未命名分支';persist();closeDialog();render();});}

document.addEventListener('click',e=>{
 const b=e.target.closest('button,a.brand');if(!b)return;
 if(b.matches('a.brand')){e.preventDefault();switchView('lab');}
 if(b.dataset.view){stop();switchView(b.dataset.view);}
 if(b.dataset.scenario){stop();active=b.dataset.scenario;render();switchView('lab');}
 if(b.dataset.edit)editEvent(b.dataset.edit);
 if(b.dataset.tissue)tissueDialog(b.dataset.tissue);
 if(b.dataset.rename)rename(b.dataset.rename);
 if(b.dataset.deleteScenario){const id=b.dataset.deleteScenario;openDialog(`<h2>移除此实验分支？</h2><p>只移除“${esc(scenarios.find(s=>s.id===id).name)}”，其他分支独立保留。你可以先导出存档。</p><div class="dialog-actions"><button class="button" data-action="export">导出所有实验</button><button class="button danger" id="confirm-delete">移除此分支</button></div>`);$('#confirm-delete').onclick=()=>{scenarios=scenarios.filter(s=>s.id!==id);if(active===id)active=scenarios[0].id;persist();closeDialog();render();};}
 if(b.dataset.angle!==undefined){body.rotate(Number(b.dataset.angle));document.querySelectorAll('[data-angle]').forEach(x=>x.classList.toggle('active',x===b));}
 if(b.dataset.month!==undefined){stop();month=Number(b.dataset.month);updateTime();persist();}
 if(b.dataset.chart){chartMode=b.dataset.chart;document.querySelectorAll('[data-chart]').forEach(x=>x.classList.toggle('active',x===b));renderChart();}
 const action=b.dataset.action;
 if(action==='close')closeDialog();
 if(action==='fork')fork();
 if(action==='add-event'){if(current().events.length>=30)toast('每方案最多 30 项干预');else editEvent();}
 if(action==='random-seed')mutation(()=>{if(!current().lockedUntil)current().profile.seed=Math.floor(Math.random()*999998)+1;});
 if(action==='new'){if(scenarios.length>=8){toast('最多 8 个方案');return;}const s=scenario(`独立方案 ${scenarios.length+1}`);scenarios.push(s);active=s.id;month=0;persist();render();switchView('lab');}
 if(action==='model'||action==='evidence'){closeDialog();switchView('evidence');}
 if(action==='export')exportJSON();
 if(action==='csv')exportCSV();
 if(action==='import')$('#import-file').click();
 if(action==='files')openDialog(`<div class="section-eyebrow">KEEP YOUR EXPERIMENTS</div><h2>带走你的实验。</h2><p>自动存档只保存在当前浏览器。清理浏览器数据会移除存档；导出 JSON 可以备份或在另一设备恢复。</p><div class="file-actions"><button class="button mint" data-action="export">↓ 导出所有实验 · JSON</button><button class="button" data-action="csv">↓ 当前方案示意数据 · CSV</button><button class="button" data-action="import">↑ 导入实验存档</button></div><p class="micro-note">导入会替换当前所有实验；选择文件后会显示确认。JSON 可能包含你填写的名称和身体参数，请自行保管。</p>`);
 if(action==='help')openDialog(`<div class="section-eyebrow">WELCOME TO LIMEN</div><h2>一个身体，许多可能。</h2><ol class="help-steps"><li><b>定义身体</b><p>设置年龄、发育阶段和基线。固定种子，得到可重复的假设响应。</p></li><li><b>安排路径</b><p>在右侧添加干预，设置开始与结束时间。剂量与频率只驱动教学模型。</p></li><li><b>让时间流动</b><p>拖动 0–60 月时间轴，或点击播放。人体可拖动旋转，点击组织卡片查看证据。</p></li><li><b>从这里分叉</b><p>复制此刻的方案。分叉前历史锁定，在干预编辑中选择“从分叉点调整”，再到分支对比查看差异。</p></li></ol><p class="info-banner">所有数值为机制示意，尚未临床拟合。青春期使用定性模式；不预测真人疗效，不判断剂量安全。</p><button class="button mint" data-action="close">开始探索 →</button>`);
});
document.addEventListener('change',e=>{
 const el=e.target;
 if(el.dataset.profile){const key=el.dataset.profile;if(current().lockedUntil)return;const old=current().profile[key];try{current().profile[key]=Number(el.value);validateScenario(current());persist();render();}catch(err){current().profile[key]=old;toast(err.message);renderProfile();}}
 if(el.id==='subject-name'&&!current().lockedUntil)mutation(()=>{current().profile.name=el.value.trim()||'虚构人物';});
 if(el.id==='tanner'&&!current().lockedUntil)mutation(()=>{current().profile.tanner=Number(el.value);});
 if(el.id==='seed'&&!current().lockedUntil){const old=current().profile.seed;try{current().profile.seed=Number(el.value);validateScenario(current());persist();render();}catch(err){current().profile.seed=old;toast(err.message);renderProfile();}}
 if(el.id==='ghost-toggle'){ghost=el.checked;body.ghost(ghost);}
 if(el.id==='compare-metric'){selectedTissue=el.value;renderCompare();}
 if(el.id==='time-slider')persist();
});
$('#time-slider').addEventListener('input',e=>{stop();month=Number(e.target.value);updateTime();});
$('#play').onclick=()=>{if(playing){stop();persist();return;}if(month>=60)month=0;playing=true;$('#play').textContent='Ⅱ';$('#play').setAttribute('aria-label','暂停时间');timer=setInterval(()=>{month=Math.min(60,Math.round((month+.2)*10)/10);updateTime();if(month>=60){stop();persist();}},100);};
$('#import-file').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;try{if(file.size>1_000_000)throw Error('文件过大，最大 1 MB');const save=parseSave(await file.text());openDialog(`<h2>恢复 ${save.scenarios.length} 个实验？</h2><p>这会替换当前 ${scenarios.length} 个方案。建议先导出当前存档。</p><div class="dialog-actions"><button class="button" data-action="export">先导出当前存档</button><button class="button mint" id="confirm-import">恢复导入的实验</button></div>`);$('#confirm-import').onclick=()=>{scenarios=save.scenarios;active=scenarios[0].id;month=clamp(save.month||0,0,60);cache.clear();persist();closeDialog();render();switchView('lab');toast('实验已恢复');};}catch(err){toast('导入失败：'+err.message);}finally{e.target.value='';}
});
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
window.addEventListener('pagehide',()=>{persist();stop();});
render();
