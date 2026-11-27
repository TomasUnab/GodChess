import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const source=JSON.parse(readFileSync('public/data/puzzles/index.json','utf8')).puzzles;
const mapping={Pasillo:'backRankMate',Ahogado:'smotheredMate','Árabe':'arabianMate',Anastasia:'anastasiaMate',Boden:'bodenMate',Greco:'operaMate',Damiano:'dovetailMate',Legal:'mateIn2'};
const output=[]; for(const [theme,sourceTheme] of Object.entries(mapping)){const rows=source.filter(p=>p.themes.includes(sourceTheme)).slice(0,6); for(const [index,puzzle] of rows.entries())output.push({...puzzle,theme,index:index+1,sourceTheme,title:`${theme} · posición ${index+1}`,prompt:`Resuelve el patrón ${theme.toLowerCase()} según la línea real de Lichess.`});}
mkdirSync('public/data/mates',{recursive:true});writeFileSync('public/data/mates/index.json',JSON.stringify({source:'Lichess Puzzle Database',mapping,count:output.length,puzzles:output}));console.log(`Built ${output.length} verified-theme mate puzzles`);
