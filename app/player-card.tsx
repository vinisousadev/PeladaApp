'use client';
import {useEffect,useRef} from 'react';
import {motion,useAnimationControls,useInView,useMotionValue,useReducedMotion,useSpring} from 'motion/react';
import {getFootballClub} from '@/lib/football-clubs';
import {cardTier} from '@/lib/card-tier';
import {CardFrame} from './card-frame';
import {type Ranked,monthLabel,photoStyle} from '@/lib/model';
export function PlayerCard({
  player,
  month,
  large = false,
  animated = true,
}: {
  player: Ranked;
  month: string;
  large?: boolean;
  animated?: boolean;
}) {
  const club = getFootballClub(player.favorite_club_id);
  const tier = cardTier(player.points);
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, {amount: 0.2});
  const reduced = useReducedMotion();
  const active = animated && !reduced && visible;
  const tiltX = useMotionValue(0), tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, {stiffness: 180, damping: 22});
  const rotateY = useSpring(tiltY, {stiffness: 180, damping: 22});
  const controls = useAnimationControls();
  const previous = useRef({id: player.id, month, level: tier.level});
  useEffect(() => {
    const last = previous.current;
    previous.current = {id: player.id, month, level: tier.level};
    if (active && last.id === player.id && last.month === month && tier.level > last.level) {
      void controls.start({scale: [1, 1.035, 1], transition: {duration: 0.7, ease: 'easeInOut'}});
    }
  }, [player.id, month, tier.level, active, controls]);
  useEffect(() => {
    if (!active) { tiltX.set(0); tiltY.set(0); controls.stop(); controls.set({scale: 1}); }
  }, [active, tiltX, tiltY, controls]);
  return (
    <motion.div
      ref={ref}
      animate={controls}
      initial={false}
      style={animated ? {rotateX, rotateY, transformPerspective: 900} : undefined}
      data-motion={active ? 'active' : 'static'}
      onPointerMove={event => {
        if (!active || event.pointerType !== 'mouse') return;
        const box = event.currentTarget.getBoundingClientRect();
        tiltX.set(Math.max(-3, Math.min(3, (0.5 - (event.clientY - box.top) / box.height) * 6)));
        tiltY.set(Math.max(-3, Math.min(3, ((event.clientX - box.left) / box.width - 0.5) * 6)));
      }}
      onPointerLeave={() => {tiltX.set(0); tiltY.set(0);}}
      className={`football-card card-tier-${tier.level} ${large ? "large" : ""}`}
      aria-label={`Carta de ${player.display_name}: ${player.points} pontos, ${tier.name}`}
    >
      <CardFrame level={tier.level}/>
      {animated && tier.level >= 70 && <span className="card-shimmer" aria-hidden="true"/>}
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
    </motion.div>
  );
}
