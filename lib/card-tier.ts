export function cardTier(points: number) {
  if (points >= 100) return {level: 100, name: 'Lenda'};
  if (points >= 90) return {level: 90, name: 'Raro'};
  if (points >= 80) return {level: 80, name: 'Elite'};
  if (points >= 70) return {level: 70, name: 'Dupla'};
  if (points >= 60) return {level: 60, name: 'Realce'};
  return {level: 50, name: 'Original'};
}
