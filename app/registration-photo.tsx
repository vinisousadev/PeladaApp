'use client';
import {useEffect,useState,useRef} from 'react';
import {photoStyle} from '@/lib/model';
import {preparePhoto} from '@/lib/photo';
import {getSupabase} from '@/lib/supabase';

export function RegistrationPhoto({userId,refresh,existing=false}:{userId:string;refresh:()=>Promise<void>;existing?:boolean}) {
 const [x,setX]=useState(50),[y,setY]=useState(25),[zoom,setZoom]=useState(1);
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 async function select(raw:File|undefined){setFile(null);setError('');if(!raw)return;setBusy(true);try{setFile(await preparePhoto(raw));setX(50);setY(25);setZoom(1);}catch(e){setError(e instanceof Error?e.message:'Não foi possível preparar a foto.');}finally{setBusy(false);}}
 async function save(){if(!file||busy)return;setBusy(true);setError('');try{const sb=getSupabase()!;const {error:uploadError}=await sb.storage.from('player-photos').upload(`${userId}/registration.webp`,file,{contentType:'image/webp',upsert:true});if(uploadError)throw uploadError;const {error:saveError}=await sb.rpc('save_registration_photo',{p_photo_x:x,p_photo_y:y,p_photo_zoom:zoom});if(saveError)throw saveError;await refresh();}catch(e){setError(e&&typeof e==='object'&&'message' in e?String(e.message):'Falha ao enviar. Tente novamente.');}finally{setBusy(false);}}
 return <section className="registration-photo"><h2>Primeiro, sua foto na carta</h2><p>{existing?'Para continuar no clube, coloque uma foto sua na carta. Ela ajudará a turma a reconhecer você.':'Envie uma foto sua para concluir o cadastro. Seu convite só poderá ser aprovado depois do envio.'}</p><label>Foto obrigatória<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>void select(e.target.files?.[0])}/></label><small>JPG, PNG ou WebP, até 5 MB. Ajuste o enquadramento abaixo antes de salvar.</small>{preview&&<div className="registration-framing">
 <div className="registration-photo-preview"><span className="eyebrow">PRÉVIA DO ENQUADRAMENTO</span><div className="card-photo"><img src={preview} alt="Prévia da sua foto" style={photoStyle({photo_x:x,photo_y:y,photo_zoom:zoom})}/></div></div>
 <fieldset disabled={busy}><legend>Enquadrar sua foto</legend>
 <label>Enquadramento horizontal <output>{x}%</output><input aria-label="Enquadramento horizontal" type="range" min="0" max="100" step="1" value={x} onChange={e=>setX(Number(e.target.value))}/></label>
 <label>Enquadramento vertical <output>{y}%</output><input aria-label="Enquadramento vertical" type="range" min="0" max="100" step="1" value={y} onChange={e=>setY(Number(e.target.value))}/></label>
 <label>Zoom da foto <output>{zoom.toFixed(2)}×</output><input aria-label="Zoom da foto" type="range" min="1" max="3" step="0.05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
 <button className="text-button" type="button" onClick={()=>{setX(50);setY(25);setZoom(1);}}>Redefinir enquadramento</button>
 </fieldset></div>}{error&&<p role="alert" className="error">{error}</p>}<button className="primary" disabled={!file||busy} onClick={()=>void save()}>{busy?'Preparando e enviando…':'Salvar foto e continuar'}</button></section>;
}

export function MandatoryPhoto({userId,name,refresh,error,existing}:{userId:string;name:string;refresh:()=>Promise<void>;error:string;existing:boolean}) {
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=dialog.current;if(el&&!el.open)el.showModal();return()=>el?.close();},[]);
 return <main className="photo-gate"><dialog ref={dialog} className="mandatory-photo" aria-labelledby="mandatory-photo-title" onCancel={e=>e.preventDefault()}><span className="eyebrow">PELADA CLUB · SUA IDENTIDADE EM CAMPO</span><h1 id="mandatory-photo-title">{name}, falta sua foto!</h1><RegistrationPhoto userId={userId} refresh={refresh} existing={existing}/>{error&&<p role="alert" className="error">{error}</p>}</dialog></main>;
}
