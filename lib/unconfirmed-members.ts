import type {Profile} from './model';

export function unconfirmedMonthlyMembers(profiles: Profile[], confirmed: Profile[]) {
  const confirmedIds = new Set(confirmed.map(player => player.id));
  return profiles
    .filter(player => player.membership === 'monthly' && !confirmedIds.has(player.id))
    .sort((a, b) => a.display_name.localeCompare(b.display_name, 'pt-BR'));
}
