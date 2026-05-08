import React, { useEffect, useRef, useState } from 'react';
import { useGradeStore } from '../lib/useGradeStore';
import StudentCard from './StudentCard';
import { buildRanks, grade5 } from '../lib/store';
import { Chart } from 'chart.js';

export function ConfirmView() {
  const { state } = useGradeStore();
  const { ui, roster, jiphil, perfs } = state;
  const hasData = Object.keys(roster).length > 0 || jiphil.midterm.ok || jiphil.final.ok || perfs.length > 0;
  
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center fu">
        <div className="text-6xl mb-5 opacity-25">📋</div>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">성적 데이터를 업로드하세요</h2>
        <p className="text-slate-400 text-sm leading-relaxed max-w-xs">좌측 패널에서 <strong>명렬표</strong>와<br/><strong>NEIS 성적 파일</strong>을 업로드하면<br/>학생 개인 성적표를 확인할 수 있습니다.</p>
      </div>
    );
  }

  if (!ui.cls || !ui.num) {
    const clsSet = new Set<number>();
    for (const k of Object.keys(roster)) clsSet.add(+k);
    for (const k of ['midterm', 'final'] as const) for (const cn of Object.keys(jiphil[k].scores)) clsSet.add(+cn);
    for (const p of perfs) for (const cn of Object.keys(p.scores)) clsSet.add(+cn);

    return (
      <div className="fu space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="mini-stat" style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)'}}><div className="circle"></div>
            <p className="text-indigo-200 text-sm font-bold relative z-10">전체 반</p>
            <p className="text-3xl font-extrabold text-white mt-2 relative z-10">{clsSet.size}<span className="text-base font-normal text-indigo-200 ml-1">개</span></p>
          </div>
          <div className="mini-stat" style={{background:'linear-gradient(135deg,#2563eb,#06b6d4)'}}><div className="circle"></div>
            <p className="text-blue-200 text-sm font-bold relative z-10">지필고사</p>
            <p className="text-3xl font-extrabold text-white mt-2 relative z-10">{(jiphil.midterm.ok?1:0)+(jiphil.final.ok?1:0)}<span className="text-base font-normal text-blue-200 ml-1">개</span></p>
          </div>
          <div className="mini-stat" style={{background:'linear-gradient(135deg,#059669,#10b981)'}}><div className="circle"></div>
            <p className="text-emerald-200 text-sm font-bold relative z-10">수행평가</p>
            <p className="text-3xl font-extrabold text-white mt-2 relative z-10">{perfs.length}<span className="text-base font-normal text-emerald-200 ml-1">종</span></p>
          </div>
        </div>
        <div className="card-lg p-6 flex flex-col items-center justify-center text-center" style={{minHeight:'200px'}}>
          <div className="text-4xl mb-3 opacity-40">👈</div>
          <h2 className="text-xl font-bold text-slate-600">학생을 선택하세요</h2>
          <p className="text-slate-400 text-sm mt-2">좌측에서 반과 학생을 선택하면<br/>개인 성적 카드를 확인할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto fu">
      <StudentCard cn={ui.cls} sn={ui.num} />
    </div>
  );
}

export function LookupView() {
  const { state, updateState } = useGradeStore();
  const { ui, roster, jiphil, perfs } = state;
  
  const clsSet = new Set<number>();
  for (const k of Object.keys(roster)) clsSet.add(+k);
  for (const k of ['midterm', 'final'] as const) for (const cn of Object.keys(jiphil[k].scores)) clsSet.add(+cn);
  for (const p of perfs) for (const cn of Object.keys(p.scores)) clsSet.add(+cn);
  const cls = Array.from(clsSet).sort((a,b)=>a-b);

  const [lkCls, setLkCls] = useState<number | null>(null);
  const [lkNum, setLkNum] = useState('');
  const [lkResult, setLkResult] = useState<any>(null);
  const [lkErr, setLkErr] = useState('');

  const doLookup = () => {
    if (!lkCls || !lkNum) {
      setLkErr('반과 번호를 모두 입력해주세요.'); return;
    }
    const sn = parseInt(lkNum);
    if (isNaN(sn)) {
      setLkErr('올바른 번호를 입력해주세요.'); return;
    }
    const nm = roster[lkCls]?.[sn];
    const hasS = jiphil.midterm.scores[lkCls]?.[sn] !== undefined || jiphil.final.scores[lkCls]?.[sn] !== undefined || perfs.some(p => p.scores[lkCls]?.[sn] !== undefined);
    
    if (!nm && !hasS) {
      setLkErr(`${lkCls}반 ${sn}번 학생 데이터를 찾을 수 없습니다.`);
      setLkResult(null);
    } else {
      setLkErr('');
      setLkResult({ cn: lkCls, sn });
    }
  };

  return (
    <div className="flex flex-col items-center justify-start pt-8 pb-12 fu">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎓</div>
          <h2 className="text-2xl font-bold text-slate-800">학생 성적 조회</h2>
          <p className="text-slate-400 text-sm mt-1.5">본인의 반과 번호를 입력하세요</p>
        </div>
        <div className="card-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1.5">반</label>
            <select className="sel-st w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-400"
                    value={lkCls || ''} onChange={e => {setLkCls(e.target.value ? +e.target.value : null); setLkResult(null); setLkErr('');}}>
              <option value="">반을 선택하세요</option>
              {cls.map(c => <option key={c} value={c}>{c}반</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1.5">번호</label>
            <input type="number" min="1" max="60" value={lkNum}
                   placeholder="번호 입력"
                   className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-400"
                   onChange={e => {setLkNum(e.target.value); setLkResult(null); setLkErr('');}}
                   onKeyDown={e => e.key === 'Enter' && doLookup()} />
          </div>
          {lkErr && <p className="text-sm text-red-500 font-semibold bg-red-50 rounded-lg py-2 text-center">{lkErr}</p>}
          <button onClick={doLookup} className="btn-pri w-full py-3 rounded-xl text-base justify-center">🔍 성적 확인</button>
        </div>
      </div>
      {lkResult && (
        <div className="w-full max-w-3xl mt-8 fu">
          <StudentCard cn={lkResult.cn} sn={lkResult.sn} isLookup={true} />
        </div>
      )}
    </div>
  );
}
