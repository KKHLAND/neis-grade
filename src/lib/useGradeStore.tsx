import { createContext, useContext, useState, useMemo, ReactNode, useCallback } from 'react';
import { buildRanks, grade5, parseNEIS, parseRoster } from './store';

type StoreState = {
  mode: 'subject' | 'homeroom';
  info: { year: number | null, semester: number | null, grade: number | null, subject: string };
  settings: { weights: { midterm: number, final: number, perf: number }, perfMax: number };
  roster: any;
  jiphil: {
    midterm: { ok: boolean, name: string, max: number, scores: any, fname: string | null },
    final: { ok: boolean, name: string, max: number, scores: any, fname: string | null }
  };
  perfs: any[];
  ui: {
    tab: 'stats' | 'confirm' | 'lookup' | 'print';
    cls: number | null;
    num: number | null;
    lkCls: number | null;
    lkNum: string;
    lkResult: any | null;
    lkErr: string;
    stat: { key: string, filters: { classes: number[], grades: number[] }, sort: { key: string, dir: 'asc' | 'desc' } }
  };
  _rc: any;
  _rname: string | null;
};

const initialState: StoreState = {
  mode: 'subject',
  info: { year: new Date().getFullYear(), semester: 1, grade: 1, subject: '' },
  settings: {
    weights: { midterm: 30, final: 30, perf: 40 },
    perfMax: 40
  },
  roster: {},
  jiphil: {
    midterm: { ok: false, name: '중간고사', max: 100, scores: {}, fname: null },
    final: { ok: false, name: '기말고사', max: 100, scores: {}, fname: null },
  },
  perfs: [],
  ui: {
    tab: 'stats',
    cls: null,
    num: null,
    lkCls: null, lkNum: '',
    lkResult: null, lkErr: '',
    stat: {
      key: 'midterm',
      filters: { classes: [], grades: [] },
      sort: { key: 'id', dir: 'asc' }
    }
  },
  _rc: {},
  _rname: null,
};

const GradeContext = createContext<any>(null);

export function GradeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(initialState);

  const updateState = useCallback((updater: (prev: StoreState) => StoreState) => {
    setState(prev => updater(prev));
  }, []);

  const clearRC = useCallback((key: string) => {
    updateState(prev => {
      const _rc = { ...prev._rc };
      delete _rc[key];
      delete _rc['total'];
      return { ...prev, _rc };
    });
  }, [updateState]);

  const setTab = useCallback((tab: StoreState['ui']['tab']) => {
    updateState(prev => ({ ...prev, ui: { ...prev.ui, tab } }));
  }, [updateState]);

  const setMode = useCallback((mode: StoreState['mode']) => {
    updateState(prev => ({ ...prev, mode }));
  }, [updateState]);


  return (
    <GradeContext.Provider value={{ state, updateState, clearRC, setTab, setMode }}>
      {children}
    </GradeContext.Provider>
  );
}

export function useGradeStore() {
  return useContext(GradeContext);
}
