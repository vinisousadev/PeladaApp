'use client';
import {useState} from 'react';
import {getFootballClub, searchFootballClubs} from '@/lib/football-clubs';

export function ClubPicker({value, onChange, disabled}: {value: string; onChange: (id: string) => void; disabled: boolean}) {
  const [query, setQuery] = useState('');
  const selected = getFootballClub(value);
  const results = searchFootballClubs(query);
  const options = selected && !results.some(club => club.id === value) ? [selected, ...results] : results;
  return <fieldset className="club-picker" disabled={disabled}>
    <legend>Time do coração <small>opcional</small></legend>
    <p>Escolha um clube brasileiro ou internacional para levar o escudo na sua carta.</p>
    <label>Buscar clube<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: Flamengo, Real Madrid…" /></label>
    <label>Seu time<select value={value} onChange={event => onChange(event.target.value)}>
      <option value="">Não informar</option>
      {options.map(club => <option key={club.id} value={club.id}>{club.name} · {club.country}</option>)}
    </select></label>
    {results.length === 0 && <small role="status">Nenhum clube encontrado. Tente outro nome.</small>}
    {selected && <div className="club-choice"><img src={`/club-crests/${selected.id}.png`} alt="" /><span><strong>{selected.name}</strong><small>{selected.country}</small></span></div>}
  </fieldset>;
}
