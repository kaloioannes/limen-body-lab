import test from 'node:test';
import assert from 'node:assert/strict';
import {scenario,event,simulate,at,forkScenario,parseSave,MODEL_VERSION,validateScenario,toMicrograms} from '../model.js';
const empty=()=>{const s=scenario();s.events=[];return s;};
test('无干预基线保持不变，五种组织均为零',()=>{
 const r=simulate(empty());
 for(const p of r.samples){assert.equal(p.exposure,0);assert.equal(p.androgen,1);for(const k of ['breast','fat','muscle','skin','hair'])assert.equal(p[k],0);}
});
test('相同种子、档案与事件可完全重现',()=>{const s=scenario();assert.deepEqual(simulate(s),simulate(structuredClone(s)));});
test('改变响应种子不会改变药物输入暴露',()=>{const a=scenario(),b=structuredClone(a);b.profile.seed=444;const r=simulate(a),q=simulate(b);assert.equal(at(r,24).exposure,at(q,24).exposure);assert.notEqual(at(r,24).breast,at(q,24).breast);});
test('未来干预不能改变此前历史',()=>{const a=scenario(),b=structuredClone(a);b.events.push(event('ev',20,60));assert.deepEqual(simulate(a).samples.slice(0,601),simulate(b).samples.slice(0,601));});
test('直接分叉保留完整轨迹和独立档案',()=>{const s=scenario(),f=forkScenario(s,12);assert.equal(f.lockedUntil,12);assert.deepEqual(simulate(s).samples,simulate(f).samples);f.profile.name='独立';assert.notEqual(s.profile.name,f.profile.name);});
test('分叉点拆分注射事件时保持原给药相位及停药残留',()=>{
 const s=empty();s.events=[event('ev',0,60)];const f=forkScenario(s,12.1),old=f.events[0];
 const continuation={...old,id:'continuation',start:12.1,phase:0};old.end=12.1;f.events.push(continuation);
 const a=simulate(s),b=simulate(f);
 a.samples.forEach((p,i)=>{for(const k of ['exposure','androgen','breast'])assert.ok(Math.abs(p[k]-b.samples[i][k])<1e-10);});
});
test('分叉后改变剂量只影响分叉之后',()=>{
 const s=scenario(),f=forkScenario(s,12),old=f.events[0],next={...old,id:'after',start:12,phase:0,dose:.05};old.end=12;f.events.push(next);
 const a=simulate(s),b=simulate(f);assert.deepEqual(a.samples.slice(0,361),b.samples.slice(0,361));assert.notEqual(at(a,24).exposure,at(b,24).exposure);
});
test('注射停止不会瞬间清除暴露；远期逐渐消退',()=>{const s=empty();s.events=[event('ev',0,12)];const r=simulate(s);assert.ok(at(r,12.1).exposure>0);assert.ok(at(r,18).exposure<1e-12);});
test('乳房状态不会在停药后自动消失，可回转状态会逐渐降低',()=>{
 const s=scenario();s.events.forEach(e=>e.end=24);const r=simulate(s);assert.ok(at(r,60).breast>=at(r,24).breast);assert.ok(at(r,60).skin<at(r,24).skin);assert.ok(at(r,60).muscle<at(r,24).muscle);
});
test('受体阻断不强行降低生成指标',()=>{const s=empty();s.events=[event('bica')];const r=at(simulate(s),12);assert.equal(r.production,1);assert.ok(r.androgen<1);});
test('DHT 路径不被误当作全面抗雄',()=>{const s=empty();s.events=[event('fina')];const p=at(simulate(s),12);assert.equal(p.production,1);assert.equal(p.androgen,1);assert.ok(p.dht<1);});
test('孕酮探索事件不偷偷赋予未证实的身体收益',()=>{const s=scenario(),f=structuredClone(s);f.events.push(event('prog'));assert.deepEqual(simulate(s).samples,simulate(f).samples);});
test('发育路径没有成人数值结果，年龄和 Tanner 任一条件均能切换',()=>{for(const [age,tanner] of [[15,5],[25,2],[13,3]]){const s=scenario();s.profile.age=age;s.profile.tanner=tanner;const r=simulate(s);assert.equal(r.qualitative,true);assert.equal(r.samples.length,0);assert.equal(at(r,12),null);}});
test('无效存档 / 非有限数 / 异常相位被拒绝',()=>{
 const s=scenario();assert.throws(()=>parseSave('{}'));assert.throws(()=>parseSave(JSON.stringify({schema:1,model:'unknown',scenarios:[s]})));
 s.events[0].interval=0;assert.throws(()=>validateScenario(s));s.events[0].interval=1;s.events[0].phase=Infinity;assert.throws(()=>validateScenario(s));
});
test('存档可往返，微克换算只做物理单位转换',()=>{const s=scenario(),raw=JSON.stringify({schema:1,model:MODEL_VERSION,scenarios:[s]});assert.deepEqual(parseSave(raw).scenarios,[s]);assert.equal(toMicrograms(.1),100);});
test('极端但可接受输入仍有限且有界，同时标出参数外推',()=>{
 const s=scenario();s.events=[event('oral'),event('cpa')];s.events.forEach(e=>{e.dose=1000;e.interval=.25;});const r=simulate(s);
 assert.ok(r.warnings.some(w=>w.includes('参数域')));
 for(const p of r.samples)for(const k of ['activation','androgen','breast','fat','muscle','skin','hair'])assert.ok(Number.isFinite(p[k])&&p[k]>=0&&p[k]<=1);
});
