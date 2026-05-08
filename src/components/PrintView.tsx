import React, { useState } from 'react';
import { useGradeStore } from '../lib/useGradeStore';
import { createRoot } from 'react-dom/client';
import StudentCard from './StudentCard';

export default function PrintView() {
  const { state } = useGradeStore();
  const { roster, jiphil, perfs } = state;
  const hasData = Object.keys(roster).length > 0 || jiphil.midterm.ok || jiphil.final.ok || perfs.length > 0;

  const clsSet = new Set<number>();
  for (const k of Object.keys(roster)) clsSet.add(+k);
  for (const k of ['midterm', 'final'] as const) for (const cn of Object.keys(jiphil[k].scores)) clsSet.add(+cn);
  for (const p of perfs) for (const cn of Object.keys(p.scores)) clsSet.add(+cn);
  const clsList = Array.from(clsSet).sort((a,b)=>a-b);

  const [prCls, setPrCls] = useState('');
  const [prS, setPrS] = useState('1');
  const [prE, setPrE] = useState('40');
  const [ppp, setPpp] = useState(2);

  if (!hasData) {
    return <div className="flex items-center justify-center h-full text-slate-400 fu">데이터를 먼저 업로드하세요</div>;
  }

  const stuList = (cn: number) => {
    const s = new Set<number>();
    for (const sn of Object.keys(roster[cn] || {})) s.add(+sn);
    for (const k of ['midterm', 'final'] as const) for (const sn of Object.keys(jiphil[k].scores[cn] || {})) s.add(+sn);
    for (const p of perfs) for (const cn of Object.keys(p.scores[cn] || {})) s.add(+sn);
    return Array.from(s).sort((a, b) => a - b);
  };

  const doBatch = () => {
    const cls = prCls ? [+prCls] : clsList;
    const s = +prS || 1;
    const e = +prE || 40;
    const cards: {cn:number, sn:number}[] = [];

    for (const cn of cls) {
      for (const sn of stuList(cn)) {
        if (sn < s || sn > e) continue;
        const hasAny = jiphil.midterm.scores[cn]?.[sn] !== undefined || jiphil.final.scores[cn]?.[sn] !== undefined || perfs.some(p => p.scores[cn]?.[sn] !== undefined) || roster[cn]?.[sn];
        if (hasAny) cards.push({cn, sn});
      }
    }
    
    if (!cards.length) { alert('인쇄할 학생 데이터가 없습니다.'); return; }
    alert('React 구조에서는 창을 통해 인쇄하는 기능을 복원하려면 추가 작업이 필요합니다.\n현재 앱 내에서 인쇄를 진행하려면 브라우저 기본 인쇄(Ctrl+P)를 활용하세요.');
  };

  return (
    <div className="max-w-xl mx-auto py-8 fu">
      <div className="card-lg p-6 bg-white border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 mb-5 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          일괄 인쇄 설정
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1.5">인쇄할 반</label>
            <select className="sel-st w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none text-slate-800 focus:border-indigo-400"
                    value={prCls} onChange={e=>setPrCls(e.target.value)}>
              <option value="">전체 반</option>
              {clsList.map(cn => <option key={cn} value={cn}>{cn}반</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1.5">시작 번호</label>
              <input type="number" value={prS} min="1" onChange={e=>setPrS(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-400 text-slate-800" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1.5">끝 번호</label>
              <input type="number" value={prE} min="1" onChange={e=>setPrE(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-400 text-slate-800" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">페이지당 학생 수</label>
            <div className="flex gap-2">
              {[1, 2, 4].map(n => (
                <label key={n} className="flex-1 cursor-pointer">
                  <input type="radio" name="ppp" value={n} checked={ppp === n} onChange={()=>setPpp(n)} className="peer sr-only" />
                  <div className="border rounded-xl py-2.5 font-bold text-sm text-center transition-all border-slate-200 bg-white text-slate-600 peer-checked:border-indigo-400 peer-checked:bg-indigo-50 peer-checked:text-indigo-700 hover:border-slate-300 shadow-sm">{n}명</div>
                </label>
              ))}
            </div>
          </div>
          <button onClick={doBatch} className="btn-pri w-full py-3 rounded-xl text-base mt-2 shadow-lg shadow-indigo-500/30">🖨️ 인쇄 기능 (브라우저 방식 대체예정)</button>
        </div>
      </div>
    </div>
  );
}
