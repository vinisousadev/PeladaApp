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
  return (
    <div
      className={`football-card ${large ? "large" : ""}`}
      aria-label={`Carta de ${player.display_name}: ${player.points} pontos`}
    >
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
