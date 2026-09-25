'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {toBlob} from 'html-to-image';
import {PlayerCard} from './player-card';
import {Trophy,Download,Share2,X,ChevronRight} from 'lucide-react';
import {type Match,type Profile,type Performance,type Ranked,dateLabel,monthLabel,photoStyle} from '@/lib/model';
import {friendlyError} from '@/lib/supabase';

export function StarEditor({match,players,save}:{match:Match;players:Profile[];save:(s:Match,id:string|null)=>Promise<void>}){
 const [value,setValue]=useState(match.star_player_id??''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>setValue(match.star_player_id??''),[match.star_player_id]);
 if(match.status==='cancelled')return null;
 const future=match.starts_at?Date.now()<Date.parse(match.starts_at):match.played_on>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza'}).format(new Date());
 return <form className="star-editor" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await save(match,value||null);}catch(e){setError(friendlyError(e));}finally{setBusy(false);}}}><label>Craque da pelada<select aria-label={'Craque de '+match.name} value={value} disabled={busy||future} onChange={e=>setValue(e.target.value)}><option value="">Sem craque definido</option>{players.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label><button className="secondary" disabled={busy||future||value===(match.star_player_id??'')}>{busy?'Salvando…':'Salvar craque'}</button><small>{future?'Disponível após o início.':'Escolha entre os confirmados. Você pode corrigir ou remover a escolha.'}</small>{error&&<p role="alert" className="error">{error}</p>}</form>;
}

export function MatchStar({match,player,performance,totalPlayers}:{totalPlayers:number;match:Match;player:Ranked;performance?:Performance}){
 const poster=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null);
 const titleId=useId();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState<{url:string;name:string}|null>(null);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview.url);},[preview]);
 useEffect(()=>setPreview(null),[totalPlayers,player.id,player.rank,player.points,player.photo_url,player.photo_x,player.photo_y,player.photo_zoom,player.favorite_club_id,player.display_name,performance?.goals,performance?.assists,match.played_on,match.name]);
 async function exportCard(share:boolean,withoutPhoto=false){setBusy(true);setError('');try{
  if(!poster.current)throw Error('A carta ainda não está pronta.');
  await document.fonts.ready;
  const clone=poster.current.cloneNode(true) as HTMLDivElement;
  const photo=clone.querySelector<HTMLImageElement>('.card-photo > img');
  if(photo && withoutPhoto){photo.remove();}
  else if(photo && player.photo_url){
    const response=await fetch(player.photo_url);if(!response.ok)throw Error('Não foi possível carregar a foto. Atualize a página e tente novamente.');
    const photoBlob=await response.blob();
    const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(photoBlob);});
    photo.src=dataUrl;await photo.decode();
  }
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;pointer-events:none';host.appendChild(clone);document.body.appendChild(host);
  let blob:Blob|null;
  try{blob=await toBlob(clone,{pixelRatio:6,skipFonts:true,includeQueryParams:true});}finally{host.remove();}
  if(!blob)throw Error('Não foi possível gerar a imagem.');
  const name='craque-'+player.display_name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-')+'-'+match.played_on+'-story-hd.png';
  const file=new File([blob],name,{type:'image/png'});
  const url=URL.createObjectURL(blob);setPreview({url,name});
  if(share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Craque da pelada',text:player.display_name+' foi o craque de '+match.name+'!'});}
  else{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();}
 }catch(e){if((e as Error).name!=='AbortError')setError((e as Error).message||'Não foi possível gerar a carta.');}finally{setBusy(false);}}
 if(match.status==='cancelled')return null;
 return <><button className="open-match-star" onClick={()=>dialog.current?.showModal()} aria-haspopup="dialog"><span className="star-button-icon"><Trophy size={20}/></span><span><small>CRAQUE DA PELADA</small><strong>{player.display_name}</strong></span><span className="star-button-label">Ver carta</span><ChevronRight size={18}/></button><dialog ref={dialog} className="modal champion-modal" aria-labelledby={titleId} onClose={()=>setPreview(null)}><div className="modal-heading"><div><span className="eyebrow">EDIÇÃO ESPECIAL</span><h2 id={titleId}>Craque da pelada</h2></div><button className="icon-button" aria-label="Fechar carta do craque" onClick={()=>dialog.current?.close()}><X size={22}/></button></div><section className="match-star" aria-label={'Craque da pelada: '+player.display_name}><div className="star-profile-card"><div className="champion-frame"><PlayerCard player={player} month={match.played_on.slice(0,7)} large/><span className="champion-seal"><Trophy size={12}/> DESTAQUE DA PELADA</span></div><div className="star-rank"><Trophy size={16}/><strong>{player.rank}º no ranking · {player.points} pts</strong></div></div><div className="star-copy"><span className="eyebrow">DESTAQUE DENTRO DE CAMPO</span><h3>O craque foi {player.display_name}.</h3><p>Reconhecimento da pelada. Uma carta para guardar e compartilhar com a turma.</p><div className="star-buttons"><button className="primary" disabled={busy} onClick={()=>exportCard(false)}><Download size={17}/>{busy?'Gerando…':'Baixar carta'}</button><button className="secondary" disabled={busy} onClick={()=>exportCard(true)}><Share2 size={17}/>Compartilhar</button></div><small>Story 9:16 · PNG HD 2160 × 3840</small>{preview&&<details className="star-export" open><summary>Imagem pronta para compartilhar</summary><img src={preview.url} alt="Carta do craque pronta para compartilhar"/><a href={preview.url} download={preview.name}>Salvar imagem PNG</a><small>No celular, você também pode segurar a imagem para salvar.</small></details>}{error&&<div role="alert"><p className="error">{error}</p><button className="secondary" disabled={busy} onClick={()=>exportCard(false,true)}>Baixar sem foto</button></div>}</div><div className="star-poster-host" aria-hidden="true"><div className="star-poster" ref={poster}><header><h2><Trophy size={20}/> CRAQUE DA PELADA</h2></header><div className="champion-frame"><PlayerCard player={player} month={match.played_on.slice(0,7)} large/><span className="champion-seal"><Trophy size={12}/> DESTAQUE DA PELADA</span></div><div className="poster-rank"><div className="poster-rank-label"><Trophy size={13}/><span>RANKING DO MÊS</span></div><div className="poster-rank-values"><div><strong>{player.rank}<em>º</em></strong><span>ENTRE {totalPlayers} JOGADORES</span></div><div><strong>{player.points}<em>/100</em></strong><span>PONTOS NO MÊS</span></div></div><div className="poster-score-track"><i style={{width:player.points+'%'}}/></div><small>{monthLabel(match.played_on.slice(0,7))}</small></div><footer><strong>{match.name}</strong><span>{dateLabel(match.played_on)} · {performance?.goals??0} gols e {performance?.assists??0} assistências na pelada</span></footer></div></div></section></dialog></>;
}
