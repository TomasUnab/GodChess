import { spawn } from 'node:child_process';
import { mateLibrary } from '../src/training/mates';

const engine = spawn('node', ['node_modules/stockfish/src/stockfish-17.1-single-a496a04.js']);
let buffer = '';
let waiting: ((value: { bestMove:string; mate?:number; pv:string[] }) => void) | undefined;
engine.stdout.on('data', chunk => { buffer += chunk.toString(); const lines = buffer.split('\n'); buffer = lines.pop() ?? ''; for (const line of lines) { if (line.startsWith('bestmove ')) { const pv = lines.find(item => item.includes(' pv '))?.split(' pv ')[1]?.trim().split(/\s+/) ?? []; const mateText = lines.find(item => item.includes(' score mate '))?.match(/score mate (-?\d+)/)?.[1]; waiting?.({ bestMove:line.split(/\s+/)[1], mate:mateText ? Number(mateText) : undefined, pv }); waiting=undefined; } } });
function analyze(fen:string){return new Promise<{bestMove:string;mate?:number;pv:string[]}>(resolve=>{waiting=resolve;engine.stdin.write(`position fen ${fen}\ngo depth 8\n`)})}
engine.stdin.write('uci\nisready\n');
await new Promise(resolve=>setTimeout(resolve,500));
const results=[]; for(const puzzle of mateLibrary){const result=await analyze(puzzle.fen);results.push({theme:puzzle.theme,index:puzzle.index,fen:puzzle.fen,...result})}
console.table(results.map(item=>({theme:item.theme,index:item.index,best:item.bestMove,mate:item.mate}))); console.log(`Verified ${results.length} positions with Stockfish 17.1 depth 8`); engine.stdin.write('quit\n');
