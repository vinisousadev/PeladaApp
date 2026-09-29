import type {Profile} from '@/lib/model';
import {unconfirmedMonthlyMembers} from '@/lib/unconfirmed-members';

export function UnconfirmedMembers({profiles, confirmed, waiting, meId}: {
  profiles: Profile[]; confirmed: Profile[]; waiting: Profile[]; meId: string;
}) {
  const players = unconfirmedMonthlyMembers(profiles, confirmed);
  const waitingIds = new Set(waiting.map(player => player.id));
  return <details className="unconfirmed-members">
    <summary>Mensalistas não confirmados ({players.length})</summary>
    <p className="muted">Mensalistas atuais do clube que não estão nos confirmados desta pelada.</p>
    {players.length ? <ul className="confirmed-list">
      {players.map(player => <li key={player.id}>
        <span>{player.display_name}{player.id === meId ? ' · Você' : ''}</span>
        <small>{waitingIds.has(player.id) ? 'Na lista de espera' : 'Sem confirmação'}</small>
      </li>)}
    </ul> : <p className="muted">{profiles.some(player => player.membership === 'monthly') ? 'Todos os mensalistas estão confirmados.' : 'Não há mensalistas cadastrados no clube.'}</p>}
  </details>;
}
