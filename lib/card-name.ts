// Display only; never change the registered name or alphabetical ranking.
export function cardDisplayName(name:string){
 const parts=name.trim().split(/\s+/).filter(Boolean);
 return parts.length>1?`${parts[0]} ${Array.from(parts[1])[0]}.`:(parts[0]??'');
}
