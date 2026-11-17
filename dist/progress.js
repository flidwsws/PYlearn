import {tasks,legacyIdMap} from './data.js';
export const emptyProgress=()=>({version:2,completed:[],drafts:{},days:[],solvedDays:[],attempts:0,solutions:[]});
export function normalizeProgress(raw){
  const legacy=raw.version!==2&&raw.format!=='pylearn-v2';
  const mapId=id=>legacy?legacyIdMap[id]:id;
  const validId=id=>Number.isInteger(id)&&id>=0&&id<tasks.length;
  const validIds=a=>Array.isArray(a)?[...new Set(a.filter(Number.isInteger).map(mapId).filter(validId))].sort((a,b)=>a-b):[];
  const drafts={};
  if(raw.drafts&&typeof raw.drafts==='object')for(const [oldId,code]of Object.entries(raw.drafts)){
    const id=mapId(Number(oldId));if(/^\d+$/.test(oldId)&&validId(id)&&typeof code==='string')drafts[id]=code.slice(0,50000);
  }
  const validDays=a=>Array.isArray(a)?[...new Set(a.filter(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)))].slice(-500):[];
  // Preserve completed legacy tasks beyond new modules; unlock the first gap.
  return {version:2,completed:validIds(raw.completed),drafts,days:validDays(raw.days),solvedDays:validDays(raw.solvedDays),attempts:Math.max(0,Number(raw.attempts)||0),solutions:validIds(raw.solutions)};
}
export const nextTaskId=state=>tasks.find(t=>!state.completed.includes(t.id))?.id??tasks.length-1;
export const isUnlocked=(state,id)=>state.completed.includes(id)||id===nextTaskId(state);
