import clubs from './football-clubs.json';

export const footballClubs = clubs;
export function getFootballClub(id?: string | null) {
  return footballClubs.find(club => club.id === id);
}
export function searchFootballClubs(query: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const term = normalize(query.trim());
  return footballClubs.filter(club => normalize(`${club.name} ${club.country}`).includes(term));
}
