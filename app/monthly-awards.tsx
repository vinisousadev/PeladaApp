'use client';

import {useEffect,useRef,useState} from 'react';
import {toBlob} from 'html-to-image';
import {Download,Share2,Trophy} from 'lucide-react';
import {rankPlayers,rankingPeriodLabel,type ClubData,type Ranked} from '@/lib/model';
import {PlayerCard} from './player-card';
import './monthly-awards.css';

const categories = {
 points: {label:'Geral',title:'OS MELHORES',subtitle:'RANKING GERAL',unit:'PONTOS'},
 goals: {label:'Gols',title:'ARTILHEIROS',subtitle:'FARO DE GOL',unit:'GOLS'},
 assists: {label:'Assistências',title:'OS GARÇONS',subtitle:'QUEM FAZ A BOLA CHEGAR',unit:'ASSISTÊNCIAS'},
 player: {label:'Jogador do mês',title:'JOGADOR DO MÊS',subtitle:'UMA TEMPORADA PARA LEMBRAR',unit:'PONTOS'},
};
type Category=keyof typeof categories;
type Format='story'|'feed';

export function MonthlyAwards({data,month,isAdmin}:{data:ClubData;month:string;isAdmin:boolean}){
 return <AwardsEditor key={month} data={data} month={month} isAdmin={isAdmin}/>;
}

function AwardsEditor({data,month,isAdmin}:{data:ClubData;month:string;isAdmin:boolean}){
 const [category,setCategory]=useState<Category>('points'),[format,setFormat]=useState<Format>('story');
 const [chosen,setChosen]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [download,setDownload]=useState<{url:string;name:string}|null>(null);
 const container=useRef<HTMLDivElement>(null),poster=useRef<HTMLDivElement>(null);
 const [scale,setScale]=useState(1);
 const general=rankPlayers(data,month).filter(p=>p.played>0);
 const winner=general.find(p=>p.id===chosen)??general[0];
 const criterion=category==='player'?'points':category;
 const top=rankPlayers(data,month,criterion).filter(p=>p.played>0&&(criterion==='points'||p[criterion]>0)).slice(0,3);
 const eligible=category==='player'?!!winner:top.length>0;
 useEffect(()=>{const node=container.current;if(!node)return;const resize=()=>setScale(Math.min(1,node.clientWidth/540));resize();const observer=new ResizeObserver(resize);observer.observe(node);return()=>observer.disconnect();},[]);
 useEffect(()=>()=>{if(download)URL.revokeObjectURL(download.url);},[download]);
 useEffect(()=>setDownload(null),[category,format,chosen]);

 async function generate(share:boolean){
  if(busy||!poster.current||!eligible)return;
  setBusy(true);setError('');
  let host:HTMLDivElement|null=null;
  try{
   await document.fonts.ready;
   const clone=poster.current.cloneNode(true) as HTMLDivElement;
   host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;pointer-events:none';host.appendChild(clone);document.body.appendChild(host);
   // Embed the original signed photos and local crests once; do not change their URLs or framing.
   const cache=new Map<string,Promise<string>>();
   await Promise.all(Array.from(clone.querySelectorAll('img')).map(async img=>{
    const source=img.src;
    if(!cache.has(source))cache.set(source,(async()=>{const response=await fetch(source);if(!response.ok)throw Error('Não foi possível carregar uma foto ou escudo. Atualize a página e tente novamente.');const blob=await response.blob();return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Não foi possível ler a imagem.'));reader.readAsDataURL(blob);});})());
    img.src=await cache.get(source)!;await img.decode();
   }));
   const blob=await toBlob(clone,{pixelRatio:2,width:540,height:format==='story'?960:675,preferredFontFormat:'truetype',includeQueryParams:true});
   if(!blob)throw Error('Não foi possível gerar a arte. Tente novamente.');
   const name=`pelada-club-${category}-${month}-${format}.png`,url=URL.createObjectURL(blob);
   setDownload({url,name});
   const file=new File([blob],name,{type:'image/png'});
   if(share&&navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:categories[category].title,text:rankingPeriodLabel(month)});
   else{const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();}
  }catch(e){if((e as Error).name!=='AbortError')setError((e as Error).message||'Não foi possível gerar a arte.');}
  finally{host?.remove();setBusy(false);}
 }

 return <section className="monthly-awards" aria-label="Premiação do mês">
  <div className="section-heading"><div><span className="eyebrow">A RESENHA VIROU HISTÓRIA</span><h2>Premiação do mês</h2><p className="muted">Escolha o período no topo da página e leve os destaques para o Instagram.</p></div><Trophy size={30}/></div>
  <div className="awards-layout"><div className="awards-controls">
   <fieldset disabled={busy}><legend>Escolha a arte</legend><div className="awards-options">{Object.entries(categories).map(([id,c])=><button type="button" key={id} aria-pressed={category===id} onClick={()=>setCategory(id as Category)}>{c.label}</button>)}</div></fieldset>
   <fieldset disabled={busy}><legend>Formato</legend><div className="awards-options"><button type="button" aria-pressed={format==='story'} onClick={()=>setFormat('story')}>Story · 9:16</button><button type="button" aria-pressed={format==='feed'} onClick={()=>setFormat('feed')}>Feed · 4:5</button></div></fieldset>
   {category==='player'&&isAdmin&&<label>Jogador do mês nesta arte<select disabled={busy} value={winner?.id??''} onChange={e=>setChosen(e.target.value)}>{general.map(p=><option key={p.id} value={p.id}>{p.display_name} · {p.rank}º geral</option>)}</select><small>A escolha vale para esta arte e não altera o ranking.</small></label>}
   <p className="awards-details">{rankingPeriodLabel(month)}<br/>PNG em alta qualidade · {format==='story'?'1080 × 1920':'1080 × 1350'} px<br/>As artes refletem os registros atuais do período.</p>
   <button className="primary" disabled={busy||!eligible} onClick={()=>void generate(false)}><Download size={18}/>{busy?'Gerando arte…':'Baixar arte em HD'}</button>
   <button className="secondary" disabled={busy||!eligible} onClick={()=>void generate(true)}><Share2 size={18}/>Compartilhar</button>
   {!eligible&&<p role="status">Ainda não há {category==='goals'?'gols':category==='assists'?'assistências':'desempenhos registrados'} neste período para gerar esta arte.</p>}
   {top.length<3&&top.length>0&&category!=='player'&&<small>Serão exibidos os {top.length} jogadores com registros nesta categoria.</small>}
   {error&&<p className="error" role="alert">{error}</p>}
   {download&&<div className="awards-download"><a href={download.url} download={download.name}>Salvar imagem gerada</a><p>No celular, você também pode abrir ou segurar a imagem para salvar.</p><a href={download.url} target="_blank" rel="noreferrer"><img src={download.url} alt="Arte pronta para compartilhar"/></a></div>}
  </div><div ref={container} className="awards-preview"><div style={{height:(format==='story'?960:675)*scale,width:540*scale,position:'relative',margin:'0 auto'}}><div style={{transform:`scale(${scale})`,transformOrigin:'top left',width:540}}><AwardPoster refValue={poster} category={category} format={format} month={month} top={top} winner={winner}/></div></div></div></div>
 </section>;
}

function AwardPoster({refValue,category,format,month,top,winner}:{refValue:React.Ref<HTMLDivElement>;category:Category;format:Format;month:string;top:Ranked[];winner?:Ranked}){
 const info=categories[category],criterion=category==='player'?'points':category;
 const display=top.length===3?[{player:top[1],place:2},{player:top[0],place:1},{player:top[2],place:3}]:top.map((player,i)=>({player,place:i+1}));
 return <div ref={refValue} className={`award-poster award-${format} award-${category}`}>
  <div className="award-grain"/><header className="award-heading"><span className="award-kicker">{info.subtitle}</span><h2>{category==='player'?<>JOGADOR<br/><em>DO MÊS.</em></>:<>{info.title}<em>DO PERÍODO.</em></>}</h2><p>{rankingPeriodLabel(month)}</p></header>
  <main className="award-main">{category==='player'?winner?<><div className="award-hero-card"><span className="award-crown">★</span><div className="award-hero-scale"><PlayerCard player={winner} month={month} large animated={false}/></div></div><div className="award-player-summary"><strong>{winner.display_name}</strong><span>{winner.rank}º NO GERAL <i/> {winner.points} PONTOS</span></div><div className="award-metrics"><div><b>{winner.goals}</b><span>GOLS</span></div><div><b>{winner.assists}</b><span>ASSISTÊNCIAS</span></div><div><b>{winner.played}</b><span>PELADAS</span></div></div></>:<p className="award-empty">O próximo destaque começa em campo.</p>:<div className="award-podium">{display.map(({player,place})=><div key={player.id} className={`award-place award-place-${place}`}><div className="award-place-number">{place===1&&<span>★</span>}{place}º</div><div className="award-card-slot"><div><PlayerCard player={player} month={month} animated={false}/></div></div><div className="award-podium-base"><strong>{player[criterion]}</strong><span>{info.unit}</span><p>{player.display_name}</p></div></div>)}{!display.length&&<p className="award-empty">Uma nova disputa está começando.</p>}</div>}</main>
  <footer className="award-footer"><div className="award-rule"/><strong>O CAMPO É NOSSO.<br/><span>A HISTÓRIA TAMBÉM.</span></strong><small>PELADA CLUB · EDIÇÃO DO PERÍODO</small></footer>
 </div>;
}
