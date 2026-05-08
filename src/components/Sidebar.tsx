import React, { useRef } from 'react';
import { useGradeStore } from '../lib/useGradeStore';
import { parseRoster, parseNEIS } from '../lib/store';

export default function Sidebar() {
  const { state, updateState, clearRC } = useGradeStore();
  const { roster, jiphil, perfs, ui } = state;
  const hasR = Object.keys(roster).length > 0;
  
  const clsSet = new Set<number>();
  for (const k of Object.keys(roster)) clsSet.add(+k);
  for (const k of ['midterm', 'final']) for (const cn of Object.keys(jiphil[k as 'midterm'|'final'].scores)) clsSet.add(+cn);
  for (const p of perfs) for (const cn of Object.keys(p.scores)) clsSet.add(+cn);
  const cls = Array.from(clsSet).sort((a,b) => a - b);

  const onRosterClick = () => {
    const el = document.getElementById('roster-upload');
    if (el) el.click();
  };

  const onRoster = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0]; if (!f) return;
    try {
      const rosterData = await parseRoster(f);
      updateState((p: any) => ({ ...p, roster: rosterData, _rname: f.name }));
    } catch (e: any) { alert('명렬표 파싱 오류: ' + e.message); }
    ev.target.value = '';
  };

  const onJiphil = async (ev: React.ChangeEvent<HTMLInputElement>, key: 'midterm' | 'final') => {
    const f = ev.target.files?.[0]; if (!f) return;
    try {
      const { meta, scores } = await parseNEIS(f);
      updateState((prev: any) => {
        const next = { ...prev };
        if (meta.year) next.info.year = meta.year;
        if (meta.semester) next.info.semester = meta.semester;
        if (meta.grade) next.info.grade = meta.grade;
        if (meta.subject) next.info.subject = meta.subject;
        const e = next.jiphil[key];
        e.ok = true; e.scores = scores; e.fname = f.name;
        if (meta.max) e.max = meta.max;
        if (meta.aname) e.name = meta.aname;
        return next;
      });
      clearRC(key);
    } catch (e: any) { alert(`성적 파일 파싱 오류: ${e.message}`); }
    ev.target.value = '';
  };

  const rmJiphil = (key: 'midterm' | 'final') => {
    updateState((prev: any) => {
      const next = { ...prev };
      next.jiphil[key] = { ok: false, name: key === 'midterm' ? '중간고사' : '기말고사', max: 100, scores: {}, fname: null };
      return next;
    });
    clearRC(key);
  };

  const onPerfs = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = ev.target.files;
    const files: File[] = fileList ? Array.from(fileList) : [];
    if (!files.length) return;
    const newPerfs = [];
    let metaStore = null;
    for (const f of files) {
      try {
        const { meta, scores } = await parseNEIS(f);
        if(!metaStore) metaStore = meta;
        newPerfs.push({ id: 'p' + Date.now() + '_' + Math.random().toString(36).slice(2, 5), name: meta.aname || f.name.replace(/\.[^.]+$/, ''), max: meta.max || 10, scores, fname: f.name });
      } catch (e: any) { alert(`수행평가 파싱 오류 (${f.name}): ${e.message}`); }
    }
    updateState((prev: any) => {
      const next = { ...prev };
      if (metaStore) {
        if (metaStore.year) next.info.year = metaStore.year;
        if (metaStore.semester) next.info.semester = metaStore.semester;
        if (metaStore.grade) next.info.grade = metaStore.grade;
        if (metaStore.subject) next.info.subject = metaStore.subject;
      }
      next.perfs = [...next.perfs, ...newPerfs];
      return next;
    });
    clearRC('total');
    ev.target.value = '';
  };

  const rmPerf = (id: string) => {
    updateState((prev: any) => ({ ...prev, perfs: prev.perfs.filter((p: any) => p.id !== id) }));
    clearRC('total');
  };

  const updWeight = (key: string, val: string) => {
    updateState((prev: any) => {
      const next = { ...prev };
      next.settings.weights[key] = Number(val);
      return next;
    });
    clearRC('total');
  };

  const stuList = (cn: number) => {
    const s = new Set<number>();
    for (const sn of Object.keys(state.roster[cn] || {})) s.add(+sn);
    for (const k of ['midterm', 'final'] as const) for (const sn of Object.keys(state.jiphil[k].scores[cn] || {})) s.add(+sn);
    for (const p of state.perfs) for (const sn of Object.keys(p.scores[cn] || {})) s.add(+sn);
    return Array.from(s).sort((a, b) => a - b);
  };
  
  const stuName = (cn: number, sn: number) => state.roster[cn]?.[sn] || `${sn}번`;

  const hasData = Object.keys(state.roster).length > 0 || state.jiphil.midterm.ok || state.jiphil.final.ok || state.perfs.length > 0;

  return (
    <aside className="w-80 flex-shrink-0 card-xl flex flex-col overflow-hidden z-20">
      <div className="p-4 border-b border-slate-100 flex-shrink-0">
        <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          데이터 업로드
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        <div className="step step-i">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-bold text-indigo-900 flex items-center text-sm">
              <span className="sbadge bg-indigo-500 text-white shadow-sm">1</span>명렬표 파일
            </h3>
            {hasR ? <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">✓ 완료</span> 
                  : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">필수</span>}
          </div>
          <label className="block cursor-pointer">
            <div className={`dropz w-full text-sm ${hasR ? 'ok' : ''}`}>
              {hasR ? 
                <><p className="font-bold text-indigo-700 truncate">{state._rname || '명렬표'}</p><p className="text-xs text-indigo-500 mt-0.5">{cls.length}개 반 · {Object.values(roster).reduce((s:number, c:any)=>s+Object.keys(c).length,0)}명</p></>
                : <><svg className="w-5 h-5 text-slate-400 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <p className="font-semibold text-slate-600 text-sm">명렬표 업로드</p><p className="text-xs text-slate-400">.xlsx / .xls</p></>
              }
            </div>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onRoster} />
          </label>
        </div>

        <div className="step step-b">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-bold text-blue-900 flex items-center text-sm">
              <span className="sbadge bg-blue-500 text-white shadow-sm">2</span>지필고사
            </h3>
            <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-bold">NEIS 엑셀</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['midterm', 'final'] as const).map(k => {
              const e = jiphil[k];
              return (
                <label key={k} className="cursor-pointer">
                  <div className={`border rounded-lg p-3 text-center transition-all ${e.ok ? 'border-blue-200 bg-blue-50' : 'border-dashed border-slate-200 bg-white hover:border-blue-300'}`}>
                    <p className={`text-xs font-bold ${e.ok ? 'text-blue-700' : 'text-slate-500'}`}>{e.name}</p>
                    {e.ok ? <>
                      <p className="text-xs text-slate-500 mt-1 truncate" title={e.fname||''}>{e.fname||''}</p>
                      <p className="text-xs text-blue-600 font-semibold">만점 {e.max}</p>
                      <button onClick={(ev) => { ev.preventDefault(); rmJiphil(k); }} className="text-xs text-red-500 hover:text-red-700 mt-0.5">삭제</button>
                    </> : <p className="text-xs text-slate-400 mt-1">+ 업로드</p>}
                  </div>
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(ev)=>onJiphil(ev,k)} />
                </label>
              );
            })}
          </div>
        </div>

        <div className="step step-e">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-bold text-emerald-900 flex items-center text-sm">
              <span className="sbadge bg-emerald-500 text-white shadow-sm">3</span>수행평가
            </h3>
            <label className="btn-suc text-xs py-1 px-3 cursor-pointer">
              + 추가
              <input type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={onPerfs} />
            </label>
          </div>
          <div className="space-y-1.5">
            {perfs.length === 0 ? (
              <label className="dropz block w-full text-sm font-bold text-emerald-600 hover:border-emerald-300 py-3 cursor-pointer">
                + 수행평가 파일 추가
                <input type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={onPerfs} />
              </label>
            ) : perfs.map((p: any, i: number) => (
              <div key={p.id} className="perf-it shadow-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700">{p.name}</p>
                    <p className="text-xs text-slate-500 truncate">만점 {p.max}</p>
                  </div>
                </div>
                <button onClick={() => rmPerf(p.id)} className="text-slate-400 hover:text-red-500 ml-1 shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">평가 반영 비율</h3>
          <div className="card-md p-3 space-y-3 bg-white">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600">중간고사 (%)</span>
              <input type="number" min="0" max="100" value={state.settings.weights.midterm} onChange={e=>updWeight('midterm', e.target.value)} className="w-14 text-right p-1 border border-slate-200 bg-slate-50 rounded outline-none focus:border-indigo-400 font-bold text-indigo-700"/>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600">기말고사 (%)</span>
              <input type="number" min="0" max="100" value={state.settings.weights.final} onChange={e=>updWeight('final', e.target.value)} className="w-14 text-right p-1 border border-slate-200 bg-slate-50 rounded outline-none focus:border-indigo-400 font-bold text-indigo-700"/>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600">수행평가 (%)</span>
              <input type="number" min="0" max="100" value={state.settings.weights.perf} onChange={e=>updWeight('perf', e.target.value)} className="w-14 text-right p-1 border border-slate-200 bg-slate-50 rounded outline-none focus:border-indigo-400 font-bold text-indigo-700"/>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="font-bold text-orange-600">수행 만점 기준</span>
              <input type="number" min="1" value={state.settings.perfMax} onChange={e=>{updateState((prev:any)=>({...prev, settings: {...prev.settings, perfMax: Number(e.target.value)}})); clearRC('total');}} className="w-16 text-right p-1 border border-orange-200 bg-orange-50 rounded outline-none focus:border-orange-400 font-bold text-orange-700"/>
            </div>
          </div>
        </div>

        {hasData && cls.length > 0 && ui.tab === 'confirm' && (
          <div className="border-t border-slate-100 pt-3 mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-slate-700">👥 학생 목록</h3>
              <select className="sel-st text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-600 outline-none text-black"
                      value={ui.cls || ''}
                      onChange={e=>updateState((prev:any)=>({...prev, ui: {...prev.ui, cls: e.target.value?+e.target.value:null, num: null}}))}>
                <option value="" className="text-black">반 선택</option>
                {cls.map(cn=><option key={cn} value={cn} className="text-black">{cn}반</option>)}
              </select>
            </div>
            {ui.cls ? (
              <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
                {stuList(ui.cls).map(sn => {
                  const sel = ui.num === sn;
                  return (
                    <div key={sn} className={`stu-item ${sel?'sel text-white':'text-slate-700'}`} onClick={()=>updateState((prev:any)=>({...prev, ui: {...prev.ui, num: sn}}))}>
                      <span className="stu-num">{sn}</span>
                      <span className="stu-nm">{stuName(ui.cls!, sn)}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-xs text-slate-400 text-center py-3">반을 선택하면 학생 목록이 표시됩니다</p>}
          </div>
        )}
      </div>
    </aside>
  );
}
