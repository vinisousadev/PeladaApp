'use client';
import {useState} from 'react';
import {Trash2} from 'lucide-react';
import {type Match,scheduleLabel,dateLabel} from '@/lib/model';
import {friendlyError} from '@/lib/supabase';

export function DeleteSession({session,save,disabled=false}:{session:Match;save:(s:Match)=>Promise<void>;disabled?:boolean}){
 const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(session.status!=='closed')return null;
 return <div className="delete-session">{confirm?<div className="delete-session-confirm" role="group" aria-label={'Excluir '+session.name}>
  <strong>Excluir “{session.name}”?</strong><p>{session.starts_at?scheduleLabel(session.starts_at):dateLabel(session.played_on)}</p>
  <p>Esta ação é definitiva. A pelada, as presenças, os desempenhos e o histórico de alterações desses desempenhos serão apagados. Os gols, assistências e participações desta pelada sairão das cartas e do ranking de todos.</p>
  <div className="delete-session-actions"><button type="button" className="danger-button" disabled={busy||disabled} onClick={async()=>{setBusy(true);setError('');try{await save(session);}catch(e){setError(friendlyError(e));}finally{setBusy(false);}}}>{busy?'Excluindo…':'Sim, excluir definitivamente'}</button>
  <button type="button" className="secondary" disabled={busy} onClick={()=>{setConfirm(false);setError('');}}>Manter pelada</button></div>
 </div>:<button type="button" className="danger-button" disabled={disabled} onClick={()=>setConfirm(true)}><Trash2 size={16}/> Excluir pelada</button>}
 {error&&<p className="error" role="alert">{error}</p>}</div>;
}
