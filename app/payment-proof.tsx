'use client';
import {useMemo,useState} from 'react';
import {getSupabase,friendlyError} from '@/lib/supabase';
import {createSignedUrlCache} from '@/lib/signed-url-cache';

export function PaymentProof({path,demoUrl}:{path:string;demoUrl?:string}) {
  const [open,setOpen]=useState(false),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const resolve=useMemo(()=>createSignedUrlCache(async paths=>{
    const {data,error}=await getSupabase()!.storage.from('payment-proofs').createSignedUrls(paths,900);
    if(error)throw error;
    return (data??[]).map(row=>({path:row.path??'',signedUrl:row.signedUrl}));
  },900),[]);
  return <div><button type="button" className="secondary" disabled={busy} aria-expanded={open} onClick={async()=>{
    if(open){setOpen(false);return;}
    setBusy(true);setError('');
    try{setUrl(demoUrl??(await resolve([path])).get(path)!);setOpen(true);}catch(e){setError(friendlyError(e));}finally{setBusy(false);}
  }}>{busy?'Carregando…':open?'Fechar comprovante':'Comprovante'}</button>
  {error&&<p className="error" role="alert">{error}</p>}
  {open&&<div><img src={url} alt="Comprovante de pagamento" style={{display:'block',maxWidth:'100%',maxHeight:500,objectFit:'contain'}}/><a href={url} target="_blank" rel="noreferrer">Abrir em nova aba</a></div>}
  </div>;
}
