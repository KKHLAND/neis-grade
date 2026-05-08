import React from 'react';
import { GradeProvider, useGradeStore } from './lib/useGradeStore';
import Sidebar from './components/Sidebar';
import { ConfirmView, LookupView } from './components/MainViews';
import StatsDashboard from './components/StatsDashboard';
import PrintView from './components/PrintView';

function Header() {
  const { state, setMode } = useGradeStore();
  
  return (
    <header className="card-md hero-hd p-4 px-6 mb-4 flex-shrink-0 flex items-center justify-between text-white border border-slate-800 backdrop-blur-2xl shadow-lg z-20">
      <div className="flex items-center gap-4">
        <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <svg className="h-7 w-7 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
            NEIS 성적 확인 도우미 <span className="text-sm font-extrabold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md align-middle ml-1">{state.mode === 'subject' ? '교과용' : '담임용'}</span>
          </h1>
          <p className="text-sm text-slate-300 font-medium mt-0.5">
            {[state.info.year ? `${state.info.year}학년도` : null, state.info.semester ? `${state.info.semester}학기` : null, state.info.grade ? `${state.info.grade}학년` : null, state.info.subject].filter(Boolean).join(' · ') || '5등급제 환산 점수 분석 및 성적표 자동 생성'}
          </p>
        </div>
      </div>
      <div className="flex bg-white/5 rounded-xl p-1 gap-1 border border-white/10">
        <button onClick={() => setMode('subject')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${state.mode === 'subject' ? 'bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white'}`}>📚 교과용</button>
        <button onClick={() => setMode('homeroom')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${state.mode === 'homeroom' ? 'bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white'}`}>🏫 담임용</button>
      </div>
    </header>
  );
}

function MainContent() {
  const { state, setTab, setMode } = useGradeStore();
  const { tab } = state.ui;

  if (state.mode === 'homeroom') {
    return (
      <div className="flex-1 card-xl flex flex-col overflow-hidden">
        <div className="flex flex-col items-center justify-center h-full text-center fu">
          <div className="text-5xl mb-4 opacity-30">🏗️</div>
          <h2 className="text-xl font-bold text-slate-600">담임용 모드 개발 예정</h2>
          <p className="text-slate-400 text-sm mt-2">현재는 교과용 모드를 이용해 주세요</p>
          <button onClick={() => setMode('subject')} className="btn-pri mt-4 px-6">교과용으로 돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 card-xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
        <nav className="tab-nav">
          <button onClick={() => setTab('stats')} className={`tab-btn ${tab === 'stats' ? 'on' : ''}`}>📊 전체 통계</button>
          <button onClick={() => setTab('confirm')} className={`tab-btn ${tab === 'confirm' ? 'on' : ''}`}>📋 성적확인</button>
          <button onClick={() => setTab('lookup')} className={`tab-btn ${tab === 'lookup' ? 'on' : ''}`}>🎓 학생 조회</button>
          <button onClick={() => setTab('print')} className={`tab-btn ${tab === 'print' ? 'on' : ''}`}>🖨️ 일괄 인쇄</button>
        </nav>
      </div>
      <main className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
        {tab === 'stats' && <StatsDashboard />}
        {tab === 'confirm' && <ConfirmView />}
        {tab === 'lookup' && <LookupView />}
        {tab === 'print' && <PrintView />}
      </main>
    </div>
  );
}

function AppContent() {
  return (
    <div className="bg-slate-100 text-slate-800 antialiased p-4 md:p-5" style={{minHeight:'100vh'}}>
      <div className="w-full max-w-screen-2xl mx-auto flex flex-col" style={{height:'calc(100vh - 2.5rem)'}}>
        <Header />
        <div className="flex gap-4 flex-1 overflow-hidden">
          <Sidebar />
          <MainContent />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GradeProvider>
      <AppContent />
    </GradeProvider>
  );
}

