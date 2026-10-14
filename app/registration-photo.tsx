'use client';
import {useEffect,useState} from 'react';
import {preparePhoto} from '@/lib/photo';
import {getSupabase} from '@/lib/supabase';

export function RegistrationPhoto({userId,refresh}:{userId:string;refresh:()=>Promise<void>}) {
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 async function select(raw:File|undefined){setFile(null);setError('');if(!raw)return;setBusy(true);try{setFile(await preparePhoto(raw));}catch(e){setError(e instanceof Error?e.message:'Não foi possível preparar a foto.');}finally{setBusy(false);}}
 async function save(){if(!file||busy)return;setBusy(true);setError('');try{const sb=getSupabase()!;const {error:uploadError}=await sb.storage.from('player-photos').upload(`${userId}/registration.webp`,file,{contentType:'image/webp',upsert:true});if(uploadError)throw uploadError;const {error:saveError}=await sb.rpc('save_registration_photo');if(saveError)throw saveError;await refresh();}catch(e){setError(e&&typeof e==='object'&&'message' in e?String(e.message):'Falha ao enviar. Tente novamente.');}finally{setBusy(false);}}
 return <section className="registration-photo"><h2>Primeiro, sua foto na carta</h2><p>Envie uma foto sua para concluir o cadastro. Seu convite só poderá ser aprovado depois do envio.</p><label>Foto obrigatória<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>void select(e.target.files?.[0])}/></label><small>JPG, PNG ou WebP, até 5 MB. Depois de entrar, você poderá ajustar o enquadramento na sua carta.</small>{preview&&<img src={preview} alt="Prévia da sua foto" width={180} height={180} style={{objectFit:'cover',borderRadius:12}}/>}{error&&<p role="alert" className="error">{error}</p>}<button className="primary" disabled={!file||busy} onClick={()=>void save()}>{busy?'Preparando e enviando…':'Salvar foto e continuar'}</button></section>;
}
