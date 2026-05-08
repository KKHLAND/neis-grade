import React, { useEffect, useMemo, useRef } from 'react';
import { useGradeStore } from '../lib/useGradeStore';
import { buildRanks, grade5 } from '../lib/store';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default function StatsDashboard() {
  const { state, updateState } = useGradeStore();
  const { ui, roster, jiphil, perfs, settings, info } = state;
  const pieCanvas = useRef<HTMLCanvasElement>(null);
  const barCanvas = useRef<HTMLCanvasElement>(null);
  const pieChart = useRef<Chart|null>(null);
  const barChart = useRef<Chart|null>(null);

  const hasData = Object.keys(roster).length > 0 || jiphil.midterm.ok || jiphil.final.ok || perfs.length > 0;
  
  const clsSet = new Set<number>();
  for (const k of Object.keys(roster)) clsSet.add(+k);
  for (const k of ['midterm', 'final'] as const) for (const cn of Object.keys(jiphil[k].scores)) clsSet.add(+cn);
  for (const p of perfs) for (const cn of Object.keys(p.scores)) clsSet.add(+cn);
  const clsList = Array.from(clsSet).sort((a,b)=>a-b);

  const getRankCached = (key: string, cn: number, sn: number) => {
    if (key === 'total') return state._rc['total']?.[cn]?.[sn] || null;
    return state._rc[key]?.[cn]?.[sn] || null;
  };

  const perfTotal = (cn: number, sn: number) => {
    if (!perfs.length) return null;
    let tot = 0, maxT = 0, any = false;
    for (const p of perfs) {
      const s = p.scores?.[cn]?.[sn];
      if (s !== undefined && s !== null) { tot += s; any = true; }
      maxT += p.max;
    }
    return any ? { tot, maxT } : null;
  };

  const calculateTotalScores = () => {
    const scores: any = {};
    const w = settings.weights;
    const pMax = settings.perfMax;

    for (const cn of clsList) {
      scores[cn] = {};
      const sSet = new Set<number>();
      for (const sn of Object.keys(roster[cn] || {})) sSet.add(+sn);
      for (const k of ['midterm', 'final'] as const) for (const sn of Object.keys(jiphil[k].scores[cn] || {})) sSet.add(+sn);
      for (const p of perfs) for (const sn of Object.keys(p.scores[cn] || {})) sSet.add(+sn);
      
      for (const sn of Array.from(sSet)) {
        let mConv = null, fConv = null, pConv = null;
        let hasData = false;

        if (jiphil.midterm.ok && jiphil.midterm.scores[cn]?.[sn] !== undefined) {
          mConv = (jiphil.midterm.scores[cn][sn] / (jiphil.midterm.max || 100)) * w.midterm;
          hasData = true;
        }
        if (jiphil.final.ok && jiphil.final.scores[cn]?.[sn] !== undefined) {
          fConv = (jiphil.final.scores[cn][sn] / (jiphil.final.max || 100)) * w.final;
          hasData = true;
        }
        const pSum = perfTotal(cn, sn);
        if (pSum) {
          pConv = (pSum.tot / pMax) * w.perf;
          hasData = true;
        }

        if (hasData) {
          let tot = 0;
          if (mConv !== null) tot += mConv;
          if (fConv !== null) tot += fConv;
          if (pConv !== null) tot += pConv;
          scores[cn][sn] = tot;
        }
      }
    }
    return scores;
  };


  useEffect(() => {
    let needsUpdate = false;
    const newRc = { ...state._rc };
    if (jiphil.midterm.ok && !newRc['midterm']) { newRc['midterm'] = buildRanks(jiphil.midterm.scores); needsUpdate = true; }
    if (jiphil.final.ok && !newRc['final']) { newRc['final'] = buildRanks(jiphil.final.scores); needsUpdate = true; }
    if (!newRc['total']) { newRc['total'] = buildRanks(calculateTotalScores()); needsUpdate = true; }
    
    if (needsUpdate) {
      updateState((prev: any) => ({ ...prev, _rc: { ...prev._rc, ...newRc } }));
    }
  }, [jiphil, perfs, settings]);

  const key = ui.stat.key;
  const isTotal = key === 'total';
  const targetScores = isTotal ? calculateTotalScores() : (jiphil[key as 'midterm'|'final']?.scores || {});
  const targetRanks = state._rc[key] || {};

  const allScores: number[] = [];
  const gradeCounts = {1:0, 2:0, 3:0, 4:0, 5:0};
  const binCounts = {'0-9':0, '10-19':0, '20-29':0, '30-39':0, '40-49':0, '50-59':0, '60-69':0, '70-79':0, '80-89':0, '90-100':0};
  const studentList: any[] = [];
  const gradeStr = String(info.grade || 1);

  for (const cn of Object.keys(targetScores)) {
    for (const sn of Object.keys(targetScores[cn as any])) {
      const sc = targetScores[cn as any][sn as any];
      if (sc !== undefined && sc !== null) {
        allScores.push(sc);
        const rInfo = targetRanks[cn]?.[sn];
        let g = null;
        if (rInfo) {
          g = grade5(rInfo.rank, rInfo.total);
          gradeCounts[g as keyof typeof gradeCounts]++;
        }

        let max = 100;
        if (isTotal) max = settings.weights.midterm + settings.weights.final + settings.weights.perf; 
        else max = jiphil[key as 'midterm'|'final'].max || 100;

        const pct = max > 0 ? (sc / max) * 100 : 0;
        if (pct >= 90) binCounts['90-100']++;
        else if (pct >= 80) binCounts['80-89']++;
        else if (pct >= 70) binCounts['70-79']++;
        else if (pct >= 60) binCounts['60-69']++;
        else if (pct >= 50) binCounts['50-59']++;
        else if (pct >= 40) binCounts['40-49']++;
        else if (pct >= 30) binCounts['30-39']++;
        else if (pct >= 20) binCounts['20-29']++;
        else if (pct >= 10) binCounts['10-19']++;
        else binCounts['0-9']++;

        const id = gradeStr + String(cn).padStart(2,'0') + String(sn).padStart(2,'0');
        
        let mRaw: number|string = '-', fRaw: number|string = '-', pRaw: number|string = '-';
        if (jiphil.midterm.ok && jiphil.midterm.scores[cn]?.[sn] !== undefined) mRaw = jiphil.midterm.scores[cn][sn];
        if (jiphil.final.ok && jiphil.final.scores[cn]?.[sn] !== undefined) fRaw = jiphil.final.scores[cn][sn];
        const pSum = perfTotal(+cn, +sn);
        if (pSum) pRaw = pSum.tot;

        studentList.push({ 
          id, cn: parseInt(cn), sn: parseInt(sn), name: roster[cn]?.[sn] || `${sn}번`, 
          sc, max, pct, rank: rInfo?.rank, total: rInfo?.total, g, mRaw, fRaw, pRaw
        });
      }
    }
  }

  const count = allScores.length;
  const mean = count > 0 ? allScores.reduce((a,b)=>a+b,0) / count : 0;
  const stdDev = count > 0 ? Math.sqrt(allScores.reduce((a,b)=>a+Math.pow(b-mean,2),0) / count) : 0;

  useEffect(() => {
    if (!pieCanvas.current || !barCanvas.current) return;
    if (pieChart.current) pieChart.current.destroy();
    if (barChart.current) barChart.current.destroy();

    const pieLabels = [], pieData = [];
    const pieColors = ['#4f46e5','#2563eb','#059669','#ca8a04','#dc2626']; 
    for(let i=1; i<=5; i++) {
        if(gradeCounts[i as keyof typeof gradeCounts] > 0) {
            pieLabels.push(i + '등급');
            pieData.push(gradeCounts[i as keyof typeof gradeCounts]);
        }
    }

    if(pieData.length > 0) {
      pieChart.current = new Chart(pieCanvas.current, {
        type: 'doughnut',
        data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: pieLabels.map(l => pieColors[parseInt(l)-1]), borderWidth: 2, borderColor: '#ffffff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { family: 'Pretendard', size: 11 } } } } }
      });
    }

    const barLabels = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-100'];
    const barData = barLabels.map(l => binCounts[l as keyof typeof binCounts] || 0);

    barChart.current = new Chart(barCanvas.current, {
        type: 'bar',
        data: {
            labels: barLabels,
            datasets: [{ label: '학생 수', data: barData, backgroundColor: 'rgba(99, 102, 241, 0.85)', borderRadius: 4 }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

  }, [gradeCounts, binCounts]);

  const toggleFilter = (type: 'classes' | 'grades', val: number) => {
    updateState((prev: any) => {
      const arr = prev.ui.stat.filters[type];
      const nextArr = arr.includes(val) ? arr.filter((v: number) => v !== val) : [...arr, val];
      return { ...prev, ui: { ...prev.ui, stat: { ...prev.ui.stat, filters: { ...prev.ui.stat.filters, [type]: nextArr } } } };
    });
  };

  const selectAll = (type: 'classes' | 'grades') => {
    const allVals = type === 'classes' ? clsList : [1,2,3,4,5];
    updateState((prev: any) => {
      const arr = prev.ui.stat.filters[type];
      const nextArr = arr.length === allVals.length ? [] : [...allVals];
      return { ...prev, ui: { ...prev.ui, stat: { ...prev.ui.stat, filters: { ...prev.ui.stat.filters, [type]: nextArr } } } };
    });
  };

  const statSort = (k: string) => {
    updateState((prev: any) => {
      const dir = prev.ui.stat.sort.key === k ? (prev.ui.stat.sort.dir === 'asc' ? 'desc' : 'asc') : 'asc';
      return { ...prev, ui: { ...prev.ui, stat: { ...prev.ui.stat, sort: { key: k, dir } } } };
    });
  };

  const filteredList = studentList.filter(s => {
    const cMatch = ui.stat.filters.classes.length === 0 || ui.stat.filters.classes.includes(s.cn);
    const gMatch = ui.stat.filters.grades.length === 0 || ui.stat.filters.grades.includes(s.g);
    return cMatch && gMatch;
  });

  const sortKey = ui.stat.sort.key;
  const sortDir = ui.stat.sort.dir;
  filteredList.sort((a, b) => {
    let vA = a[sortKey]; let vB = b[sortKey];
    if (vA === '-') vA = -999; if (vB === '-') vB = -999;
    if(vA == null) return 1; if(vB == null) return -1;
    if(vA > vB) return sortDir === 'asc' ? 1 : -1;
    if(vA < vB) return sortDir === 'asc' ? -1 : 1;
    return 0;
  });

  const exportCSV = () => {
    if (!filteredList.length) { alert("저장할 데이터가 없습니다."); return; }
    let keyName = {midterm: '중간고사', final: '기말고사', total: '환산합산점수'}[key as string] || '통계';
    const infoText = [`학년도,${info.year||''}`, `학기,${info.semester||''}`, `학년,${info.grade||''}`, `과목,"${info.subject||''}"`].join('\n');
    const headers = isTotal ? ['학번','이름','중간(원점수)','기말(원점수)','수행(원점수)','환산합계','석차','등급'] : ['학번','이름','점수','만점','석차','등급'];
    const rows = filteredList.map(s => {
      if (isTotal) return [s.id, s.name, s.mRaw, s.fRaw, s.pRaw, s.sc, s.rank||'', s.g||''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      return [s.id, s.name, s.sc, s.max, s.rank||'', s.g||''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = "\uFEFF" + infoText + "\n\n" + headers.map(h=>`"${h}"`).join(',') + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `성적분석_${info.year||''}_${info.semester||''}학기_${info.subject||'과목'}_${keyName}.csv`;
    link.click();
  };

  const sortIcon = (k: string) => sortKey === k ? (sortDir === 'asc' ? <span className="text-indigo-500">↑</span> : <span className="text-indigo-500">↓</span>) : null;

  if (!hasData) {
    return <div className="flex items-center justify-center h-full text-slate-400 fu">데이터를 먼저 업로드하세요</div>;
  }

  return (
    <div className="max-w-6xl mx-auto fu space-y-6 pb-8">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">📊 전체 성적 통계 대시보드 <span className="text-sm bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded ml-2 align-middle border border-indigo-100">5등급제</span></h2>
        <div className="tab-nav bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          {[ 
            {id: 'midterm', name: '중간고사', active: jiphil.midterm.ok}, 
            {id: 'final', name: '기말고사', active: jiphil.final.ok}, 
            {id: 'total', name: '합산 점수', active: true} 
          ].map(t => (
            <button key={t.id} onClick={() => t.active && updateState((p: any) => ({...p, ui: {...p.ui, stat: {...p.ui.stat, key: t.id}}}))}
                    className={`tab-btn ${key===t.id ? 'on !bg-indigo-600 !text-white !shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'} ${!t.active ? '!cursor-not-allowed !opacity-40' : ''}`} disabled={!t.active}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="mini-stat" style={{background:'linear-gradient(135deg,#3b82f6,#06b6d4)'}}><div className="circle"></div><p className="text-blue-100 text-sm font-bold relative z-10 uppercase tracking-wider">평균 점수</p><p className="text-4xl font-extrabold text-white mt-2 relative z-10">{mean.toFixed(2)}</p></div>
        <div className="mini-stat" style={{background:'linear-gradient(135deg,#8b5cf6,#ec4899)'}}><div className="circle"></div><p className="text-purple-100 text-sm font-bold relative z-10 uppercase tracking-wider">표준편차</p><p className="text-4xl font-extrabold text-white mt-2 relative z-10">{stdDev.toFixed(2)}</p></div>
        <div className="mini-stat" style={{background:'linear-gradient(135deg,#059669,#14b8a6)'}}><div className="circle"></div><p className="text-emerald-100 text-sm font-bold relative z-10 uppercase tracking-wider">응시 인원</p><p className="text-4xl font-extrabold text-white mt-2 relative z-10">{count}<span className="text-lg font-normal text-emerald-100 ml-1">명</span></p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="card-lg p-6 md:col-span-2 bg-white border border-slate-200">
          <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span> 5등급 분포도</h3>
          <div style={{position:'relative', height:'240px'}}><canvas ref={pieCanvas}></canvas></div>
        </div>
        <div className="card-lg p-6 md:col-span-3 bg-white border border-slate-200">
          <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span> 점수대별 달성률 (%) 분포</h3>
          <div style={{position:'relative', height:'240px'}}><canvas ref={barCanvas}></canvas></div>
        </div>
      </div>

      <div className="card-lg p-6 bg-white border border-slate-200">
        <div className="mb-5 border-b border-slate-100 pb-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 text-base">🏫 학급 필터</h3>
            <button onClick={()=>selectAll('classes')} className="text-sm text-indigo-600 font-bold hover:underline">전체 / 해제</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {clsList.map(c => <button key={c} onClick={()=>toggleFilter('classes', c)} className={`filter-btn border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm ${ui.stat.filters.classes.includes(c) ? 'active-5 !bg-indigo-50 !text-indigo-700 !border-indigo-300' : ''}`}>{c}반</button>)}
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 text-base">⭐ 등급 필터 (1~5등급)</h3>
            <button onClick={()=>selectAll('grades')} className="text-sm text-indigo-600 font-bold hover:underline">전체 / 해제</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1,2,3,4,5].map(g => <button key={g} onClick={()=>toggleFilter('grades', g)} className={`filter-btn border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm w-10 h-10 !p-0 flex items-center justify-center text-base ${ui.stat.filters.grades.includes(g) ? 'active-5 !bg-indigo-50 !text-indigo-700 !border-indigo-300' : ''}`}>{g}</button>)}
          </div>
        </div>
      </div>

      <div className="data-table-wrapper bg-white border border-slate-200 rounded-xl overflow-hidden mt-6 shadow-sm">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-base font-bold text-slate-800">학생 데이터 <span className="text-sm font-semibold text-slate-500 ml-1">({filteredList.length} / {studentList.length}명)</span></h3>
          <button onClick={exportCSV} className="btn-pri text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white">
            CSV 다운로드
          </button>
        </div>
        <div className="overflow-x-auto max-h-[600px]">
          <table className="data-table w-full">
            <thead className="bg-slate-50 select-none border-b border-slate-200 text-slate-600">
              <tr>
                <th onClick={() => statSort('id')} className="w-32 cursor-pointer hover:text-slate-900 px-4 py-3 text-left">학번 {sortIcon('id')}</th>
                <th onClick={() => statSort('name')} className="cursor-pointer hover:text-slate-900 px-4 py-3 text-left">이름 {sortIcon('name')}</th>
                {isTotal ? (
                  <>
                    <th onClick={() => statSort('mRaw')} className="text-right cursor-pointer hover:text-slate-900 px-4 py-3">중간 {sortIcon('mRaw')}</th>
                    <th onClick={() => statSort('fRaw')} className="text-right cursor-pointer hover:text-slate-900 px-4 py-3">기말 {sortIcon('fRaw')}</th>
                    <th onClick={() => statSort('pRaw')} className="text-right cursor-pointer hover:text-slate-900 px-4 py-3">수행 {sortIcon('pRaw')}</th>
                    <th onClick={() => statSort('sc')} className="text-right text-indigo-700 cursor-pointer hover:text-indigo-900 px-4 py-3">환산합계 {sortIcon('sc')}</th>
                  </>
                ) : (
                  <>
                    <th onClick={() => statSort('sc')} className="text-right cursor-pointer hover:text-slate-900 px-4 py-3">점수 {sortIcon('sc')}</th>
                    <th onClick={() => statSort('max')} className="text-right cursor-pointer hover:text-slate-900 px-4 py-3">만점 {sortIcon('max')}</th>
                  </>
                )}
                <th onClick={() => statSort('rank')} className="text-center cursor-pointer hover:text-slate-900 px-4 py-3">석차 {sortIcon('rank')}</th>
                <th onClick={() => statSort('g')} className="text-center cursor-pointer hover:text-slate-900 px-4 py-3">등급 {sortIcon('g')}</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredList.map(s => {
                const scStr = Number.isInteger(s.sc) ? s.sc : s.sc.toFixed(2);
                return (
                  <tr key={s.id} className="transition-colors hover:bg-slate-50 border-b border-slate-100">
                    <td className="font-mono text-slate-500 px-4 py-3">{s.id}</td>
                    <td className="font-bold text-slate-800 px-4 py-3">{s.name}</td>
                    {isTotal ? (
                      <>
                        <td className="text-right font-mono text-slate-600 px-4 py-3">{s.mRaw !== '-' ? (Number.isInteger(s.mRaw) ? s.mRaw : s.mRaw.toFixed(1)) : '-'}</td>
                        <td className="text-right font-mono text-slate-600 px-4 py-3">{s.fRaw !== '-' ? (Number.isInteger(s.fRaw) ? s.fRaw : s.fRaw.toFixed(1)) : '-'}</td>
                        <td className="text-right font-mono text-slate-600 px-4 py-3">{s.pRaw !== '-' ? (Number.isInteger(s.pRaw) ? s.pRaw : s.pRaw.toFixed(1)) : '-'}</td>
                        <td className="text-right font-mono text-indigo-700 font-bold bg-indigo-50/50 px-4 py-3">{scStr}</td>
                      </>
                    ) : (
                      <>
                        <td className="text-right font-mono text-indigo-700 font-bold px-4 py-3">{scStr}</td>
                        <td className="text-right text-slate-500 text-sm font-mono px-4 py-3">/ {s.max}</td>
                      </>
                    )}
                    <td className="text-center font-semibold text-slate-600 px-4 py-3">{s.rank ? `${s.rank} / ${s.total}` : '-'}</td>
                    <td className="text-center px-4 py-3">{s.g ? <span className={`gb gb${s.g} !w-6 !h-6 !text-xs shadow-sm`}>{s.g}</span> : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
