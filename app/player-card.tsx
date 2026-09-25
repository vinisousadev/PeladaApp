import {getFootballClub} from '@/lib/football-clubs';
import {cardTier} from '@/lib/card-tier';
import {CardFrame} from './card-frame';
import {type Ranked,monthLabel,photoStyle} from '@/lib/model';
export function PlayerCard({
  player,
  month,
  large = false,
}: {
  player: Ranked;
  month: string;
  large?: boolean;
}) {
  const club = getFootballClub(player.favorite_club_id);
  const tier = cardTier(player.points);
  return (
    <div
      className={`football-card card-tier-${tier.level} ${large ? "large" : ""}`}
      aria-label={`Carta de ${player.display_name}: ${player.points} pontos, ${tier.name}`}
    >
      <CardFrame level={tier.level}/>
      <div className="card-inner">
        <div className="card-photo">
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={`Foto de ${player.display_name}`}
              style={photoStyle(player)}
            />
          ) : (
            <div className="card-initials">
              {player.display_name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="card-rating">
            <strong>{player.points}</strong>
            <span>PTS</span>
            <span className="card-position">{player.position}</span>
            {club && <img className="card-club-crest" src={`/club-crests/${club.id}.png`} alt={`Escudo do ${club.name}`} title={club.name} />}
          </div>
          <span className="card-edition">PC / CLUB</span>
        </div>
        <div className="card-identity">
          <h3>{player.display_name}</h3>
          <span>{monthLabel(month)}</span>
        </div>
        <div className="card-stats">
          <div>
            <strong>{player.goals}</strong>
            <span>GOLS</span>
          </div>
          <div>
            <strong>{player.assists}</strong>
            <span>ASSIST.</span>
          </div>
          <div>
            <strong>{player.played}</strong>
            <span>PELADAS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
