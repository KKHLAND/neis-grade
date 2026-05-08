import React, { useEffect, useRef, useMemo } from 'react';
import { useGradeStore } from '../lib/useGradeStore';
import { grade5, buildRanks } from '../lib/store';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default function StudentCard({ cn, sn, isLookup = false }: { cn: number, sn: number, isLookup?: boolean }) {
  const { state, updateState } = useGradeStore();
  const { info, jiphil, perfs, settings, roster } = state;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const getRankCached = (key: string, cn: number, sn: number) => {
    if (key === 'total') return state._rc['total']?.[cn]?.[sn] || null;
    if (!state._rc[key]) {
      if (!jiphil[key as 'midterm'|'final'].ok) return null;
      updateState((prev: any) => {
        const _rc = {...prev._rc};
        _rc[key] = buildRanks(prev.jiphil[key as 'midterm'|'final'].scores);
        return {...prev, _rc};
      });
      // Will return null this render, but fine
      return null;
    }
    return state._rc[key]?.[cn]?.[sn] || null;
  };

  const stuName = roster[cn]?.[sn] || `${sn}번`;
  const ini = stuName.slice(-1);

  const jRows: any[] = [];
  for (const key of ['midterm', 'final'] as const) {
    const e = jiphil[key]; if (!e.ok) continue;
    const sc = e.scores[cn]?.[sn]; if (sc === undefined || sc === null) continue;
    const ri = getRankCached(key, cn, sn);
    const g = ri ? grade5(ri.rank, ri.total) : null;
    jRows.push({ name: e.name, sc, max: e.max, pct: ((sc / e.max) * 100).toFixed(1), rank: ri?.rank || null, total: ri?.total || null, g, key });
  }

  const pRows: any[] = [];
  let pTot = 0, pMaxT = 0, pAny = false;
  for (const p of perfs) {
    const sc = p.scores?.[cn]?.[sn]; 
    if (sc !== undefined && sc !== null) {
      pTot += sc; pMaxT += p.max; pAny = true;
      pRows.push({ name: p.name, sc, max: p.max, pct: ((sc / p.max) * 100).toFixed(1) });
    }
  }
  const pSum = pAny ? { tot: pTot, maxT: pMaxT } : null;

  const labels = [...jRows.map(r => r.name), ...pRows.map(r => r.name)];
  const data = [...jRows.map(r => +r.pct), ...pRows.map(r => +r.pct)];
  const colors = [...jRows.map(() => 'rgba(99,102,241,.8)'), ...pRows.map(() => 'rgba(16,185,129,.8)')];
  const borderColors = [...jRows.map(() => 'rgba(99,102,241,1)'), ...pRows.map(() => 'rgba(16,185,129,1)')];

  useEffect(() => {
    if (!canvasRef.current || !labels.length) return;
    if (chartInstance.current) chartInstance.current.destroy();
    
    const useRadar = labels.length >= 3;
    chartInstance.current = new Chart(canvasRef.current, {
      type: useRadar ? 'radar' : 'bar',
      data: {
        labels,
        datasets: [{
          label: '달성률(%)', data,
          backgroundColor: useRadar ? 'rgba(99,102,241,.18)' : colors,
          borderColor: useRadar ? 'rgba(99,102,241,.8)' : borderColors,
          borderWidth: 2,
          pointBackgroundColor: useRadar ? 'rgba(99,102,241,1)' : undefined,
          pointRadius: useRadar ? 3 : undefined,
          borderRadius: useRadar ? undefined : 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${(ctx.raw as number).toFixed(1)}%` } } },
        scales: useRadar ? { r: { min: 0, max: 100, ticks: { stepSize: 25, font: { size: 9 } }, pointLabels: { font: { size: 10, family: 'Pretendard', weight: 'bold' as any } } } }
          : { y: { min: 0, max: 100, ticks: { callback: v => v + '%', font: { size: 9 } } as any }, x: { ticks: { font: { size: 9, family: 'Pretendard' } } } },
      }
    });
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [labels.join(','), data.join(',')]);

  let mConv = 0, fConv = 0, pConv = 0;
  let hasM = false, hasF = false, hasP = false;

  const mRow = jRows.find(r => r.key === 'midterm');
  if (mRow) { mConv = (mRow.sc / mRow.max) * settings.weights.midterm; hasM = true; }
  
  const fRow = jRows.find(r => r.key === 'final');
  if (fRow) { fConv = (fRow.sc / fRow.max) * settings.weights.final; hasF = true; }

  if (pSum) { pConv = (pSum.tot / settings.perfMax) * settings.weights.perf; hasP = true; }

  const totConv = mConv + fConv + pConv;
  const tScFmt = Number.isInteger(totConv) ? totConv : totConv.toFixed(2);
  const curMax = (hasM ? settings.weights.midterm : 0) + (hasF ? settings.weights.final : 0) + (hasP ? settings.weights.perf : 0);
  const avg = curMax > 0 ? ((totConv / curMax) * 100).toFixed(1) : '0.0';

  const totRi = getRankCached('total', cn, sn);
  const totG = totRi ? grade5(totRi.rank, totRi.total) : null;

  return (
    <div className="grade-card card-xl overflow-hidden print-avoid border border-slate-200">
      <div className="p-5 flex items-center gap-4 text-white print-hdr" style={{background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'}}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-extrabold shrink-0 border-2 shadow-inner" style={{background:'rgba(255,255,255,.18)', borderColor:'rgba(255,255,255,.3)'}}>{ini}</div>
        <div className="flex-1">
          <h2 className="text-2xl font-extrabold tracking-tight">{stuName}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm font-bold px-2 py-0.5 rounded-md" style={{background:'rgba(255,255,255,.2)'}}>{cn}반 {sn}번</span>
            {info.grade && <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{background:'rgba(255,255,255,.12)'}}>{info.grade}학년</span>}
            {info.subject && <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{background:'rgba(255,255,255,.12)'}}>{info.subject}</span>}
            {info.semester && <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{background:'rgba(255,255,255,.12)'}}>{info.semester}학기</span>}
          </div>
        </div>
      </div>

      <div className="p-5 bg-white">
        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {jRows.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📝 지필고사</p>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full">
                    <thead><tr className="bg-slate-50">
                      <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">평가</th>
                      <th className="text-center px-3 py-2.5 text-xs font-bold text-slate-600 uppercase">점수</th>
                      <th className="text-center px-3 py-2.5 text-xs font-bold text-slate-600 uppercase">만점</th>
                      <th className="text-center px-3 py-2.5 text-xs font-bold text-slate-600 uppercase">석차</th>
                      <th className="text-center px-3 py-2.5 text-xs font-bold text-slate-600 uppercase">등급</th>
                    </tr></thead>
                    <tbody>
                      {jRows.map(r => (
                        <React.Fragment key={r.name}>
                          <tr className="border-t border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-sm text-slate-800">{r.name}</td>
                            <td className="px-3 py-3 text-center font-mono font-bold text-base text-indigo-600">{r.sc}</td>
                            <td className="px-3 py-3 text-center text-sm text-slate-500 font-mono">{r.max}</td>
                            <td className="px-3 py-3 text-center text-sm font-semibold text-slate-600">{r.rank ? `${r.rank}` : '—'}{r.rank && <span className="text-xs text-slate-400">/{r.total}</span>}</td>
                            <td className="px-3 py-3 text-center">{r.g ? <span className={`gb gb${r.g} print-hdr shadow-sm`}>{r.g}등급</span> : '—'}</td>
                          </tr>
                          <tr><td colSpan={5} className="px-4 pt-0 pb-2.5">
                            <div className="bar-bg bg-slate-100"><div className="bar-fill" style={{width:`${r.pct}%`, background:'linear-gradient(90deg,#818cf8,#4f46e5)'}}></div></div>
                            <div className="flex justify-between mt-0.5"><span className="text-xs text-slate-500">{r.pct}%</span></div>
                          </td></tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {pRows.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📌 수행평가</p>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full">
                    <thead><tr className="bg-emerald-50">
                      <th className="text-left px-4 py-2.5 text-xs font-bold text-emerald-700 uppercase tracking-wide">평가</th>
                      <th className="text-center px-3 py-2.5 text-xs font-bold text-emerald-700 uppercase">점수</th>
                      <th className="text-center px-3 py-2.5 text-xs font-bold text-emerald-700 uppercase">만점</th>
                      <th className="text-center px-3 py-2.5 text-xs font-bold text-emerald-700 uppercase">달성률</th>
                    </tr></thead>
                    <tbody>
                      {pRows.map(r => {
                        const pctN = +r.pct;
                        const pctColor = pctN >= 90 ? 'text-emerald-600' : pctN >= 70 ? 'text-blue-600' : 'text-amber-600';
                        return (
                          <React.Fragment key={r.name}>
                            <tr className="border-t border-slate-100 hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-semibold text-sm text-slate-800">{r.name}</td>
                              <td className="px-3 py-3 text-center font-mono font-bold text-base text-emerald-600">{r.sc}</td>
                              <td className="px-3 py-3 text-center text-sm text-slate-500 font-mono">{r.max}</td>
                              <td className="px-3 py-3 text-center"><span className={`font-bold text-sm ${pctColor}`}>{r.pct}%</span></td>
                            </tr>
                            <tr><td colSpan={4} className="px-4 pt-0 pb-2.5">
                              <div className="bar-bg bg-slate-100"><div className="bar-fill" style={{width:`${r.pct}%`, background:'linear-gradient(90deg,#34d399,#059669)'}}></div></div>
                            </td></tr>
                          </React.Fragment>
                        );
                      })}
                      {pSum && (
                        <tr className="border-t border-emerald-100 bg-emerald-50">
                          <td className="px-4 py-3 font-extrabold text-sm text-emerald-700">합계</td>
                          <td className="px-3 py-3 text-center font-mono font-extrabold text-base text-emerald-600">{pSum.tot}</td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-emerald-600">{pSum.maxT}</td>
                          <td className="px-3 py-3 text-center"><span className="font-extrabold text-sm text-emerald-600">{((pSum.tot/pSum.maxT)*100).toFixed(1)}%</span></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {jRows.length === 0 && pRows.length === 0 && (
              <div className="text-center py-8 text-slate-400"><p className="text-sm">이 학생의 성적 데이터가 없습니다.</p></div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📊 성적 현황</p>
            <div className="card-lg p-4 bg-white border border-slate-200">
              <div style={{position:'relative', height:'220px'}}>
                <canvas ref={canvasRef}></canvas>
              </div>
              
              {(jRows.length > 0 || pRows.length > 0) && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center bg-indigo-50 px-3 py-2.5 rounded-lg mb-3 border border-indigo-100">
                    <span className="text-indigo-800 font-bold text-sm">환산 총점</span>
                    <span className="font-extrabold text-indigo-600 text-base">{tScFmt} <span className="text-xs text-indigo-400 font-semibold">/ {curMax}</span></span>
                  </div>
                  <div className="flex justify-between text-xs"><span className="text-slate-600 font-semibold">평균 달성률</span><span className="font-bold text-indigo-600">{avg}%</span></div>
                  {jRows[0]?.g && <div className="flex justify-between text-xs"><span className="text-slate-600 font-semibold">{jRows[0].name} 등급</span><span className="font-bold"><span className={`gb gb${jRows[0].g} print-hdr shadow-sm`} style={{width:'1.3rem',height:'1.3rem',fontSize:'.65rem'}}>{jRows[0].g}</span></span></div>}
                  {jRows[1]?.g && <div className="flex justify-between text-xs"><span className="text-slate-600 font-semibold">{jRows[1].name} 등급</span><span className="font-bold"><span className={`gb gb${jRows[1].g} print-hdr shadow-sm`} style={{width:'1.3rem',height:'1.3rem',fontSize:'.65rem'}}>{jRows[1].g}</span></span></div>}
                  {totG && <div className="flex justify-between text-xs pt-1.5 border-t border-indigo-100 mt-1.5"><span className="text-indigo-700 font-bold">환산합계 등급</span><span className="font-bold"><span className={`gb gb${totG} print-hdr shadow-sm`} style={{width:'1.3rem',height:'1.3rem',fontSize:'.65rem'}}>{totG}</span></span></div>}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
