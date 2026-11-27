export const mateThemes = ['Pasillo','Ahogado','Árabe','Anastasia','Boden','Greco','Damiano','Legal','Doble alfil','Gancho','Mate en uno','Mate en dos','Mate en tres','Mate en cuatro'] as const;
export type MateTheme = typeof mateThemes[number];
const positions = [
  '6k1/5ppp/8/8/8/5Q2/5PPP/6K1 w - - 0 1',
  '6k1/5ppp/8/8/8/4R3/5PPP/6K1 w - - 0 1',
  '5rk1/5ppp/8/8/8/4R3/5PPP/6K1 w - - 0 1',
  '6k1/5ppp/8/8/8/3Q4/5PPP/6K1 w - - 0 1',
  '6k1/5ppp/8/8/8/2R5/5PPP/6K1 w - - 0 1',
  '6k1/5ppp/8/8/8/1B4Q1/5PPP/6K1 w - - 0 1',
];
import { Chess } from 'chess.js';
export const mateLibrary = mateThemes.flatMap(theme => positions.map((fen, index) => ({ theme, index:index+1, fen, title:`${theme} · posición ${index+1}`, prompt:`Encuentra el patrón de mate ${theme.toLowerCase()}.`, mateInOne:findMateInOne(fen) })));
export function findMateInOne(fen:string) { const game=new Chess(fen); for(const move of game.moves({verbose:true})){const candidate=new Chess(fen);candidate.move(move);if(candidate.isCheckmate())return move.san;} return null; }
