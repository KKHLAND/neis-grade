import { createContext, useContext, useState, useMemo, ReactNode, useCallback } from 'react';
import * as XLSX from 'xlsx';

export const G5 = [10, 34, 66, 90, 100];

export function readAB(file: File): Promise<ArrayBuffer> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target?.result as ArrayBuffer);
    r.onerror = rej;
    r.readAsArrayBuffer(file);
  });
}

export async function parseRoster(file: File) {
  const buf = await readAB(file);
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

  let hi = -1, colMap: Record<number, number> = {};
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const row = rows[r]; if (!row) continue;
    const c0 = String(row[0] || '');
    if (c0.includes('번호') || c0.includes('No') || c0.includes('no')) {
      hi = r;
      for (let c = 1; c < row.length; c++) {
        const v = row[c];
        if (v !== null && v !== undefined) {
          const n = parseInt(String(v).trim());
          if (!isNaN(n) && n >= 1 && n <= 30) colMap[n] = c;
        }
      }
      break;
    }
  }
  if (hi === -1) {
    hi = 0;
    const row = rows[0] || [];
    for (let c = 1; c < row.length; c++) {
      if (row[c] !== null) {
        const n = parseInt(String(row[c]).trim());
        if (!isNaN(n) && n >= 1 && n <= 30) colMap[n] = c;
      }
    }
  }
  if (Object.keys(colMap).length === 0) {
    const row = rows[hi] || []; let cn = 1; for (let c = 1; c < row.length; c++, cn++) colMap[cn] = c;
  }

  const roster: any = {};
  for (const cn of Object.keys(colMap)) roster[parseInt(cn)] = {};

  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r]; if (!row || row[0] === null || row[0] === undefined) continue;
    const sn = parseInt(String(row[0]).trim()); if (isNaN(sn) || sn <= 0) continue;
    for (const [cnStr, ci] of Object.entries(colMap)) {
      const cn = parseInt(cnStr);
      const nm = row[ci];
      if (nm !== null && nm !== undefined) {
        const s = String(nm).trim();
        if (s.length >= 2 && !/^\d+$/.test(s)) roster[cn][sn] = s;
      }
    }
  }
  return roster;
}

export async function parseNEIS(file: File) {
  const buf = await readAB(file);
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  const meta: any = { year: null, semester: null, grade: null, subject: null, aname: null, max: null, type: 'jiphil' };
  
  for (let r = 0; r <= Math.min(10, range.e.r); r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]; if (!cell || !cell.v) continue;
      const v = String(cell.v);
      
      const ym = v.match(/(\d{4})학년도/); if (ym) meta.year = parseInt(ym[1]);
      const sm = v.match(/(\d)학기/); if (sm) meta.semester = parseInt(sm[1]);
      const gm = v.match(/주간\s*(\d)학년/) || v.match(/(\d)학년(?!\s*도)/); if (gm && !meta.grade) meta.grade = parseInt(gm[1]);
      
      if (v.includes('교과목')) {
          let s = v.split(/교과목\s*:/)[1];
          if (s) {
              s = s.split('만점')[0].split('(')[0].trim();
              if (s) meta.subject = s;
          }
      }
      
      const maxm = v.match(/만점\s*:\s*([\d.]+)/); if (maxm && meta.type !== 'performance') meta.max = parseFloat(maxm[1]);
      
      if (v.includes('고사')) {
          let ex = v.split(/고사\s*:/)[1];
          if (ex) {
              ex = ex.split('교과')[0].trim();
              if (ex && !meta.aname) meta.aname = ex;
          }
      }
      
      if (v.includes('영 역')) {
          let ar = v.split(/영\s*역\s*:/)[1];
          if (ar) {
              ar = ar.split('영역만점')[0].replace(/\s+/g,'').trim();
              if (ar) { meta.aname = ar; meta.type = 'performance'; }
          }
      }
      
      const amm = v.match(/영역만점\s*:\s*([\d.]+)/); if (amm) { meta.max = parseFloat(amm[1]); meta.type = 'performance'; }
      if (v.includes('수행평가')) meta.type = 'performance';
      if (!meta.max) { const mm = v.match(/만점\s*:\s*([\d.]+)/); if (mm) meta.max = parseFloat(mm[1]); }
    }
  }

  let hi = -1, nc = -1;
  for (let r = 0; r <= Math.min(18, range.e.r); r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && String(cell.v || '').includes('번호')) { hi = r; nc = c; break; }
    }
    if (hi !== -1) break;
  }
  if (hi === -1) throw new Error('헤더 행(번호)을 찾을 수 없습니다.');

  const clsMap = new Map<number, number>();
  for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: hi, c })]; if (!cell || !cell.v) continue;
    const n = parseInt(String(cell.v).trim());
    if (!isNaN(n) && n >= 1 && n <= 30 && c !== nc) clsMap.set(n, c);
  }

  const scores: any = {};
  for (const cn of Array.from(clsMap.keys())) scores[cn] = {};
  const STOP = ['응시생수', '총', '평균', '성취기준'];

  for (let r = hi + 1; r <= range.e.r; r++) {
    const nc2 = ws[XLSX.utils.encode_cell({ r, c: nc })]; if (!nc2 || !nc2.v) continue;
    const nv = String(nc2.v).trim();
    if (STOP.some(w => nv.includes(w))) break;
    const sn = parseInt(nv); if (isNaN(sn) || sn <= 0) continue;
    for (const [cn, ci] of Array.from(clsMap.entries())) {
      const sc = ws[XLSX.utils.encode_cell({ r, c: ci })]; if (!sc || sc.v === null || sc.v === undefined) continue;
      const sv = sc.v;
      if (typeof sv === 'number') scores[cn][sn] = sv;
      else { const n = parseFloat(String(sv)); if (!isNaN(n)) scores[cn][sn] = n; }
    }
  }
  return { meta, scores };
}

export function buildRanks(scores: any) {
  const all: any[] = [];
  for (const [cn, cls] of Object.entries(scores)) {
    for (const [sn, sc] of Object.entries(cls as any)) all.push({ cn: +cn, sn: +sn, sc: sc as number });
  }
  all.sort((a, b) => b.sc - a.sc);
  let rank = 1;
  for (let i = 0; i < all.length; i++) {
    if (i > 0 && all[i].sc < all[i - 1].sc) rank = i + 1;
    all[i].rank = rank;
  }
  const total = all.length;
  const map: any = {};
  for (const it of all) {
    if (!map[it.cn]) map[it.cn] = {};
    map[it.cn][it.sn] = { rank: it.rank, total };
  }
  return map;
}

export function grade5(rank: number, total: number) {
  const pct = (rank / total) * 100;
  for (let g = 0; g < G5.length; g++) if (pct <= G5[g]) return g + 1;
  return 5;
}
