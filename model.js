// LIMEN educational model v1.0. All numerical PK/PD coefficients below are
// illustrative assumptions, NOT fitted or clinically validated parameters.
// Outputs have no concentration, breast-volume, BMD or risk-probability units.
export const MODEL_VERSION = '1.0.0';
export const MONTH = 30;
export const clamp = (n,a=0,b=1) => Math.max(a,Math.min(b,n));
export const DRUGS = {
  oral: {name:'雌二醇 · 口服',kind:'estrogen',unit:'mg / 次',dose:2,interval:1,ref:2,ka:4,ke:1.5,limit:8,note:'口服途径；简化吸收与首过过程，不预测雌酮或血药浓度。'},
  sublingual: {name:'雌二醇 · 舌下',kind:'estrogen',unit:'mg / 次',dose:1,interval:1,ref:2,ka:12,ke:4,limit:6,note:'仅示意较快吸收与峰谷；吞咽比例和个体生物利用度未知。'},
  patch: {name:'雌二醇 · 贴片',kind:'estrogen',unit:'mg / 日释放量',dose:0.1,interval:1,ref:0.1,ka:1,ke:1,limit:0.2,continuous:true,note:'填写每天标示释放量，非整片总含量；假定全程连续贴用，未模拟换片或脱落。'},
  gel: {name:'雌二醇 · 凝胶',kind:'estrogen',unit:'mg / 次',dose:1.5,interval:1,ref:1.5,ka:1.2,ke:1,limit:4,note:'皮肤吸收差异大；部位、面积与制剂差异不在模型内。'},
  ev: {name:'戊酸雌二醇 · 注射',kind:'estrogen',unit:'mg / 次',dose:4,interval:7,ref:4/7,ka:0.35,ke:1,limit:10,note:'仅示意油剂储库释放；未区分肌注、皮下及配方，不是经验证药代曲线。'},
  ec: {name:'环戊丙酸雌二醇 · 注射',kind:'estrogen',unit:'mg / 次',dose:4,interval:7,ref:4/7,ka:0.2,ke:1,limit:10,note:'与其他雌二醇酯的差别属于教学假设，不能用于剂量换算。'},
  spiro: {name:'螺内酯',kind:'anti',unit:'mg / 次',dose:50,interval:1,ref:100,ka:3,ke:0.8,limit:200,note:'受体阻断与抑制生成分开处理；程度是教学设定。关注血压、肾功能及血钾。'},
  cpa: {name:'醋酸环丙孕酮',kind:'anti',unit:'mg / 次',dose:10,interval:1,ref:10,ka:3,ke:0.35,limit:25,note:'以抑制生成并兼有受体作用来示意；关注肝功能、泌乳素和累积暴露相关脑膜瘤风险。'},
  bica: {name:'比卡鲁胺',kind:'anti',unit:'mg / 次',dose:25,interval:1,ref:25,ka:2,ke:0.1,limit:50,note:'主要模拟雄激素受体阻断，不直接降低睾酮产生；临床证据有限，存在肝损伤风险。'},
  gnrh: {name:'GnRH 激动剂 · 阻断',kind:'blocker',unit:'mg / 次（示意制剂）',dose:3.75,interval:28,ref:3.75/28,ka:0.04,ke:0.5,limit:11.25,note:'仅示意长期抑制；不同分子、储库制剂不能按 mg 互换。未建模初始 flare；青春期模式仅定性。'},
  fina: {name:'非那雄胺',kind:'dht',unit:'mg / 次',dose:1,interval:1,ref:1,ka:3,ke:1,limit:5,note:'仅示意降低 DHT 作用，不视为全面阻断睾酮；毛囊响应证据不足。'},
  prog: {name:'微粒化孕酮 · 探索项',kind:'exploratory',unit:'mg / 次',dose:100,interval:1,ref:100,ka:3,ke:2,limit:200,note:'保留事件用于比较研究问题；当前模型不为它添加乳房、情绪或睡眠收益，亦不预测其风险。'}
};
export const TISSUES = {
  breast:{name:'乳房发育',onset:'约 3–6 月',plateau:'2–3 年或更久',reversible:'部分变化可持续',tau:540,lag:90,source:'endo',note:'发育时间有研究依据；这里的形态幅度、迟滞与饱和函数是示意假设，不能换算罩杯或体积。'},
  fat:{name:'脂肪分布',onset:'约 3–6 月',plateau:'约 2–5 年',reversible:'可能逐步回转',tau:660,lag:90,source:'endo',note:'表现为分布倾向，不是既有脂肪瞬间移动；总脂肪量、营养和运动未作代谢预测。'},
  muscle:{name:'肌肉变化',onset:'约 3–6 月',plateau:'约 1–2 年',reversible:'可能逐步回转',tau:400,lag:90,source:'endo',note:'显示相对基线的变化进程，不能换算肌肉公斤数或运动表现。'},
  skin:{name:'皮肤 / 皮脂',onset:'约 3–6 月',plateau:'最大效应时间未明',reversible:'可能逐步回转',tau:150,lag:60,source:'endo',note:'皮脂与触感用一个示意状态表示；不能预测肤色、皮肤病或实际触感。'},
  hair:{name:'体毛变化',onset:'约 6–12 月',plateau:'通常 >3 年',reversible:'存在个体差异',tau:1100,lag:180,source:'endo',note:'主要指体毛；已形成胡须通常不能靠激素消除。没有模拟激光或电解脱毛。'}
};
export function defaultProfile(){return {name:'林 · 01',age:25,tanner:5,height:175,weight:68,fat:20,muscle:50,baselineT:550,baselineE:25,seed:2026};}
export function event(drug,start=0,end=60){const d=DRUGS[drug];return {id:uid(),drug,dose:d.dose,interval:d.interval,start,end};}
export function uid(){return globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)+Date.now().toString(36);}
export function scenario(name='起始方案'){return {id:uid(),name,profile:defaultProfile(),events:[event('patch'),event('spiro')],lockedUntil:0};}
export function isAdult(p){return p.age>=18 && p.tanner===5;}
export function rng(seed){let a=seed|0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function validateScenario(s){
  if(!s || typeof s.id!=='string' || typeof s.name!=='string' || s.name.length>60 || !s.profile || !Array.isArray(s.events) || s.events.length>30) throw Error('方案格式不正确（每方案最多 30 项干预）');
  const p=s.profile;
  const bounds={age:[10,80],tanner:[2,5],height:[120,220],weight:[30,200],fat:[5,55],muscle:[0,100],baselineT:[1,1500],baselineE:[1,200],seed:[1,999999]};
  if(typeof p.name!=='string' || p.name.length>60)throw Error('人物名称过长或缺失');
  for(const [k,[lo,hi]] of Object.entries(bounds)) if(!Number.isFinite(p[k])||p[k]<lo||p[k]>hi)throw Error('人物参数超出允许范围：'+k);
  if(!Number.isInteger(p.tanner)||!Number.isInteger(p.seed))throw Error('发育阶段与种子需要整数');
  if(!Number.isFinite(s.lockedUntil)||s.lockedUntil<0||s.lockedUntil>60)throw Error('分支时间无效');
  const ids=new Set();
  for(const e of s.events){
    if(!e || !DRUGS[e.drug] || typeof e.id!=='string'||ids.has(e.id))throw Error('干预类型或编号无效');ids.add(e.id);
    for(const k of ['dose','interval','start','end'])if(!Number.isFinite(e[k]))throw Error('干预参数必须为有限数字');
    if(e.phase!==undefined&&(!Number.isFinite(e.phase)||e.phase<0||e.phase>e.start))throw Error('给药相位无效');
    if(e.dose<=0||e.dose>1000||e.interval<0.25||e.interval>180||e.start<0||e.end>60||e.start>=e.end)throw Error('剂量需 >0 且 ≤1000，间隔 0.25–180 日，开始时间必须早于结束时间（0–60 月）');
  }
  return s;
}
export function parseSave(raw){
  if(typeof raw!=='string'||raw.length>1_000_000)throw Error('文件过大');
  const d=JSON.parse(raw);
  if(d.schema!==1||d.model!==MODEL_VERSION)throw Error('存档版本不兼容，请使用模型 '+MODEL_VERSION);
  if(d.month!==undefined&&(!Number.isFinite(d.month)||d.month<0||d.month>60))throw Error('存档时间无效');
  if(!Array.isArray(d.scenarios)||!d.scenarios.length||d.scenarios.length>8)throw Error('存档需包含 1–8 个方案');
  d.scenarios.forEach(validateScenario);
  if(new Set(d.scenarios.map(s=>s.id)).size!==d.scenarios.length)throw Error('方案编号重复');
  return d;
}
export function forkScenario(source,month){
  const m=clamp(month,0,60), s=structuredClone(source); s.id=uid();s.name=source.name.slice(0,54)+' · 分支';s.lockedUntil=m;
  // Keep original events and dose phase intact. Editing an ongoing event later
  // requires a linked continuation with the same original phase anchor.
  s.events=s.events.map(e=>({...e,id:uid(),phase:e.phase??e.start}));
  return s;
}
function pd(x){return x/(1+x);}
function warnings(s){
  const w=[];
  if(!isAdult(s.profile))w.push('发育模式：仅展示干预路径与机制，不输出成人定量曲线或人体发育预测。');
  if(s.events.some(e=>e.drug==='gnrh'))w.push('GnRH 仅为机制示意：制剂不可换算，未模拟初始激动期。');
  if(s.events.some(e=>e.drug==='prog'))w.push('孕酮被记录但不参与身体变化计算；缺乏可用于本模型的可靠响应参数。');
  if(s.events.some(e=>e.dose>DRUGS[e.drug].limit || (!DRUGS[e.drug].continuous&&e.interval>30)))w.push('存在超出本演示参数域的输入；所有结果仍仅为示意，不表示安全或有效。');
  for(let i=0;i<s.events.length;i++)for(let j=i+1;j<s.events.length;j++){
    const a=s.events[i],b=s.events[j];if(DRUGS[a.drug].kind==='estrogen'&&DRUGS[b.drug].kind==='estrogen'&&a.start<b.end&&b.start<a.end){w.push('存在重叠雌激素干预；模型将叠加示意暴露，未模拟相互作用。');return w;}
  }
  return w;
}
export function simulate(s,months=60){
  validateScenario(s);
  const warn=warnings(s);
  if(!isAdult(s.profile))return {samples:[],warnings:warn,qualitative:true};
  const random=rng(s.profile.seed), sensitivity=0.75+random()*0.5, speed=0.8+random()*0.4;
  const tissue={breast:0,fat:0,muscle:0,skin:0,hair:0}, activeDays={breast:0,fat:0,muscle:0,skin:0,hair:0};
  const states=s.events.map(e=>({e,depot:0,central:0,next:((e.phase??e.start)*MONTH)}));
  const samples=[];const dt=0.25;
  const totalDays=Math.round(clamp(months,0,60)*MONTH);
  let levels={exposure:0,androgen:1,production:1,dht:1,activation:0}, accumulatedE=0;
  const take=(day)=>samples.push({day,month:day/MONTH,...levels,...tissue});
  take(0);
  for(let step=0;step<totalDays/dt;step++){
    const day=step*dt, byDrug={};
    for(const st of states){
      const {e}=st,d=DRUGS[e.drug],start=e.start*MONTH,end=e.end*MONTH;
      if(day>=start && day<end){
        if(d.continuous) st.central+=e.dose*dt;
        else {
          // Advance the schedule without resetting the phase when an event is split.
          if(st.next<start)st.next+=Math.ceil((start-st.next)/(e.interval))*e.interval;
          if(day+1e-8>=st.next){st.depot+=e.dose;st.next+=e.interval;}
        }
      }
      const absorbed=st.depot*(1-Math.exp(-d.ka*dt));st.depot-=absorbed;st.central+=absorbed;
      const eliminated=st.central*(1-Math.exp(-d.ke*dt));st.central-=eliminated;
      byDrug[e.drug]=(byDrug[e.drug]||0)+eliminated/dt/d.ref;
    }
    let exposure=0;for(const [k,v] of Object.entries(byDrug))if(DRUGS[k].kind==='estrogen')exposure+=v;
    accumulatedE+=(exposure-accumulatedE)*(1-Math.exp(-dt/14));
    const sp=pd(byDrug.spiro||0),cp=pd(byDrug.cpa||0),bi=pd(byDrug.bica||0),gn=pd(byDrug.gnrh||0),fi=pd(byDrug.fina||0);
    // These strengths are declared pedagogical assumptions, not estimated effects.
    const production=clamp((1-.65*pd(accumulatedE))*(1-.25*sp)*(1-.9*cp)*(1-.98*gn));
    const androgen=clamp(production*(1-.65*sp)*(1-.4*cp)*(1-.9*bi));
    const dht=clamp(androgen*(1-.85*fi));
    // Smooth saturated activation: no linear dose → breast size mapping.
    const activation=clamp((1-Math.exp(-1.7*accumulatedE))*(.45+.55*(1-androgen)));
    levels={exposure,androgen,production,dht,activation};
    for(const [k,t] of Object.entries(TISSUES)){
      const drive=k==='muscle'?1-androgen:k==='hair'?(1-dht)*.55:activation;
      activeDays[k]+=(drive>.05?dt:0);
      const gate=clamp((activeDays[k]-t.lag)/60);
      const target=clamp(drive*sensitivity)*gate;
      if(k==='breast')tissue[k]+=Math.max(0,target-tissue[k])*(1-Math.exp(-dt/(t.tau*speed)));
      else tissue[k]+=(target-tissue[k])*(1-Math.exp(-dt/((target<tissue[k]?360:t.tau)*speed)));
      tissue[k]=clamp(tissue[k]);
    }
    if((step+1)%4===0)take((step+1)*dt);
  }
  return {samples,warnings:warn,qualitative:false,sensitivity,speed};
}
export function at(result,month){if(result.qualitative)return null;return result.samples[Math.min(result.samples.length-1,Math.max(0,Math.round(month*MONTH)))];}
export function toMicrograms(mg){return mg*1000;}
