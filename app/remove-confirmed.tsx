'use client';
import {useState} from 'react';
import {friendlyError} from '@/lib/supabase';

export function RemoveConfirmed({name, remove}: {name: string; remove: () => Promise<void>}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className="remove-confirmed">
    {!asking ? <button type="button" className="text-button" aria-label={`Retirar ${name} dos confirmados`} onClick={() => setAsking(true)}>Retirar</button> : <>
      <p>Retirar {name}? A vaga será liberada, sem promover ninguém da espera.</p>
      <div className="remove-confirmed-actions">
        <button type="button" className="secondary" disabled={busy} onClick={async () => {
          setBusy(true); setError('');
          try { await remove(); setAsking(false); }
          catch (e) { setError(friendlyError(e)); }
          finally { setBusy(false); }
        }}>{busy ? 'Retirando…' : 'Confirmar retirada'}</button>
        <button type="button" className="text-button" disabled={busy} onClick={() => {setAsking(false); setError('');}}>Voltar</button>
      </div>
    </>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
