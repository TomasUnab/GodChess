export type Opening = { eco:string; name:string; pgn:string };
const files = ['a','b','c','d','e'];
let cached: Opening[] | null = null;
export async function loadOpenings() { if(cached)return cached; const rows:Opening[]=[]; for(const file of files){const text=await fetch(`/data/openings/${file}.tsv`).then(r=>r.text()); for(const line of text.split('\n').slice(1)){const [eco,name,pgn]=line.split('\t'); if(eco&&name)rows.push({eco,name,pgn:pgn??''})}} cached=rows; return rows; }
export function searchOpenings(rows:Opening[], query:string){const q=query.trim().toLowerCase(); return q?rows.filter(row=>`${row.eco} ${row.name} ${row.pgn}`.toLowerCase().includes(q)).slice(0,40):rows.slice(0,40)}
