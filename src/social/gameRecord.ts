export type GameResult = 'white'|'black'|'draw'|'aborted';
export type LocalGameRecord = { id:string; startedAt:string; endedAt:string; pgn:string; result:GameResult; whiteMs:number; blackMs:number; finalFen:string; disconnect?:boolean };
const KEY='godchess.games.v1';
export function saveGameRecord(record:LocalGameRecord){const records=loadGameRecords();localStorage.setItem(KEY,JSON.stringify([record,...records].slice(0,100)));}
export function loadGameRecords():LocalGameRecord[]{try{return JSON.parse(localStorage.getItem(KEY)??'[]') as LocalGameRecord[]}catch{return[]}}
export function resultFromFen(fen:string,turn:string):GameResult|undefined{if(!fen.includes(' b ')&&!fen.includes(' w '))return undefined; return turn==='w'?'black':'white';}
