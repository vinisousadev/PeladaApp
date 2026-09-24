'use client';
import {useEffect,useState} from 'react';
import {Trophy,Download,Share2} from 'lucide-react';
import {type Match,type Profile,type Performance,dateLabel,photoStyle} from '@/lib/model';
import {friendlyError} from '@/lib/supabase';

export function StarEditor({match,players,save}:{match:Match;players:Profile[];save:(s:Match,id:string|null)=>Promise<void>}){
 const [value,setValue]=useState(match.star_player_id??''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>setValue(match.star_player_id??''),[match.star_player_id]);
 if(match.status==='cancelled')return null;
 const future=match.starts_at?Date.now()<Date.parse(match.starts_at):match.played_on>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza'}).format(new Date());
 return <form className="star-editor" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await save(match,value||null);}catch(e){setError(friendlyError(e));}finally{setBusy(false);}}}><label>Craque da pelada<select aria-label={'Craque de '+match.name} value={value} disabled={busy||future} onChange={e=>setValue(e.target.value)}><option value="">Sem craque definido</option>{players.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label><button className="secondary" disabled={busy||future||value===(match.star_player_id??'')}>{busy?'Salvando…':'Salvar craque'}</button><small>{future?'Disponível após o início.':'Escolha entre os confirmados. Você pode corrigir ou remover a escolha.'}</small>{error&&<p role="alert" className="error">{error}</p>}</form>;
}

// Original canvas artwork: generates an actual PNG without sending photos to another service.
async function cardImage(match:Match,player:Profile,performance?:Performance,withoutPhoto=false):Promise<Blob>{
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível gerar a imagem neste navegador.');
 const gold=ctx.createLinearGradient(0,0,1080,1350);gold.addColorStop(0,'#fff4a5');gold.addColorStop(.4,'#f5c918');gold.addColorStop(1,'#98701b');
 ctx.fillStyle='#090a09';ctx.fillRect(0,0,1080,1350);
 const light=ctx.createRadialGradient(540,520,40,540,520,720);light.addColorStop(0,'#4c3d12');light.addColorStop(1,'#090a09');ctx.fillStyle=light;ctx.fillRect(0,0,1080,1350);
 ctx.strokeStyle='#d7b64022';ctx.lineWidth=1;for(let i=-1400;i<1300;i+=70){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+1350,1350);ctx.stroke();}
 ctx.textAlign='center';ctx.fillStyle=gold;ctx.font='bold 28px Arial';ctx.fillText('P/  PELADA CLUB',540,75);
 ctx.beginPath();ctx.moveTo(100,190);ctx.lineTo(180,140);ctx.lineTo(900,140);ctx.lineTo(980,190);ctx.lineTo(980,1130);ctx.lineTo(540,1245);ctx.lineTo(100,1130);ctx.closePath();ctx.fillStyle='#11120e';ctx.fill();ctx.strokeStyle=gold;ctx.lineWidth=6;ctx.stroke();
 if(player.photo_url&&!withoutPhoto){
  const image=new Image();image.crossOrigin='anonymous';image.src=player.photo_url;
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('A foto demorou para carregar. Tente novamente.')),15000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(Error('Não foi possível carregar a foto para a imagem. Tente novamente ou baixe sem foto.'));};});
  ctx.save();ctx.beginPath();ctx.rect(120,275,840,650);ctx.clip();
  const base=Math.max(840/image.width,650/image.height),zoom=player.photo_zoom??1;
  const w=image.width*base*zoom,h=image.height*base*zoom;
  ctx.drawImage(image,120+(840-w)*(player.photo_x??50)/100,275+(650-h)*player.photo_y/100,w,h);ctx.restore();
 }else{ctx.fillStyle='#f2ce39';ctx.font='bold 200px Arial';ctx.fillText(player.display_name.slice(0,2).toUpperCase(),540,660);}
 const fade=ctx.createLinearGradient(0,680,0,980);fade.addColorStop(0,'#11120e00');fade.addColorStop(1,'#11120e');ctx.fillStyle=fade;ctx.fillRect(120,680,840,310);
 ctx.fillStyle=gold;ctx.font='bold 46px Arial';ctx.fillText('CRAQUE DA PELADA',540,230);
 const textFit=(text:string,y:number,size:number,color:string|CanvasGradient)=>{ctx.fillStyle=color;do{ctx.font='bold '+size+'px Arial';size-=2;}while(ctx.measureText(text).width>790&&size>14);ctx.fillText(text,540,y);}
 textFit(player.display_name.toUpperCase(),925,80,gold);
 ctx.strokeStyle='#d6b43266';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(190,965);ctx.lineTo(890,965);ctx.stroke();
 ctx.fillStyle='#fff7d4';ctx.font='bold 64px Arial';ctx.fillText(String(performance?.goals??0),360,1045);ctx.fillText(String(performance?.assists??0),720,1045);
 ctx.font='22px Arial';ctx.fillStyle='#cfbd82';ctx.fillText('GOLS',360,1085);ctx.fillText('ASSISTÊNCIAS',720,1085);
 textFit(match.name,1150,27,'#f4e5b8');textFit(new Date(match.played_on+'T12:00:00').toLocaleDateString('pt-BR'),1194,24,'#b8aa7e');
 ctx.fillStyle='#e0bf45';ctx.font='22px Arial';ctx.fillText('DESTAQUE DENTRO DE CAMPO.',540,1305);
 return new Promise((resolve,reject)=>{try{canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Não foi possível gerar a imagem.')),'image/png');}catch{reject(Error('A foto não permite exportação. Tente baixar sem foto.'));}});
}

export function MatchStar({match,player,performance}:{match:Match;player:Profile;performance?:Performance}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState<{url:string;name:string}|null>(null);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview.url);},[preview]);
 async function exportCard(share:boolean,withoutPhoto=false){setBusy(true);setError('');try{
  const blob=await cardImage(match,player,performance,withoutPhoto);
  const name='craque-'+player.display_name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-')+'-'+match.played_on+'.png';
  const file=new File([blob],name,{type:'image/png'});
  const url=URL.createObjectURL(blob);setPreview({url,name});
  if(share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Craque da pelada',text:player.display_name+' foi o craque de '+match.name+'!'});}
  else{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();}
 }catch(e){if((e as Error).name!=='AbortError')setError((e as Error).message||'Não foi possível gerar a carta.');}finally{setBusy(false);}}
 if(match.status==='cancelled')return null;
 return <section className="match-star" aria-label={'Craque da pelada: '+player.display_name}><div className="star-card"><div className="star-title"><Trophy size={20}/> CRAQUE DA PELADA</div><div className="star-portrait">{player.photo_url?<img src={player.photo_url} alt={player.display_name} style={photoStyle(player)}/>:<span>{player.display_name.slice(0,2).toUpperCase()}</span>}</div><h3>{player.display_name}</h3><div className="star-numbers"><span><b>{performance?.goals??0}</b> GOLS</span><span><b>{performance?.assists??0}</b> ASSIST.</span></div><small>{dateLabel(match.played_on)}</small></div><div className="star-copy"><span className="eyebrow">DESTAQUE DENTRO DE CAMPO</span><h3>O craque foi {player.display_name}.</h3><p>Reconhecimento da pelada. Uma carta para guardar e compartilhar com a turma.</p><div className="star-buttons"><button className="primary" disabled={busy} onClick={()=>exportCard(false)}><Download size={17}/>{busy?'Gerando…':'Baixar carta'}</button><button className="secondary" disabled={busy} onClick={()=>exportCard(true)}><Share2 size={17}/>Compartilhar</button></div><small>Imagem PNG · gols e assistências desta pelada</small>{preview&&<details className="star-export" open><summary>Imagem pronta para compartilhar</summary><img src={preview.url} alt="Carta do craque pronta para compartilhar"/><a href={preview.url} download={preview.name}>Salvar imagem PNG</a><small>No celular, você também pode segurar a imagem para salvar.</small></details>}{error&&<div role="alert"><p className="error">{error}</p><button className="secondary" disabled={busy} onClick={()=>exportCard(false,true)}>Baixar sem foto</button></div>}</div></section>;
}
