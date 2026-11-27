/**
 * Spanish names for the Lichess opening table. Families are translated whole;
 * the rest follows the usual pattern ("X Variation" → "variante X").
 */
const FAMILIES: Record<string, string> = {
  'Sicilian Defense': 'Defensa Siciliana', 'French Defense': 'Defensa Francesa', 'Caro-Kann Defense': 'Defensa Caro-Kann',
  'Italian Game': 'Partida Italiana', 'Ruy Lopez': 'Ruy López', 'Scotch Game': 'Partida Escocesa', 'Vienna Game': 'Partida Vienesa',
  'Four Knights Game': 'Partida de los Cuatro Caballos', 'Three Knights Opening': 'Apertura de los Tres Caballos', 'Two Knights Defense': 'Defensa de los Dos Caballos',
  "King's Gambit": 'Gambito de Rey', "King's Gambit Accepted": 'Gambito de Rey aceptado', "King's Gambit Declined": 'Gambito de Rey rehusado',
  "Queen's Gambit": 'Gambito de Dama', "Queen's Gambit Accepted": 'Gambito de Dama aceptado', "Queen's Gambit Declined": 'Gambito de Dama rehusado',
  'Slav Defense': 'Defensa Eslava', 'Semi-Slav Defense': 'Defensa Semieslava', "King's Indian Defense": 'Defensa India de Rey', "Queen's Indian Defense": 'Defensa India de Dama',
  'Nimzo-Indian Defense': 'Defensa Nimzoindia', 'Grünfeld Defense': 'Defensa Grünfeld', 'Benoni Defense': 'Defensa Benoni', 'Modern Benoni': 'Benoni Moderna',
  'Dutch Defense': 'Defensa Holandesa', 'English Opening': 'Apertura Inglesa', 'Scandinavian Defense': 'Defensa Escandinava', 'Alekhine Defense': 'Defensa Alekhine',
  'Pirc Defense': 'Defensa Pirc', 'Modern Defense': 'Defensa Moderna', 'Petrov\'s Defense': 'Defensa Petrov', 'Russian Game': 'Defensa Petrov', 'Philidor Defense': 'Defensa Philidor',
  'Catalan Opening': 'Apertura Catalana', 'Réti Opening': 'Apertura Réti', 'Zukertort Opening': 'Apertura Zukertort', 'London System': 'Sistema Londres',
  "Bishop's Opening": 'Apertura del Alfil', 'Center Game': 'Partida del Centro', 'Ponziani Opening': 'Apertura Ponziani', 'Bird Opening': 'Apertura Bird',
  'Old Indian Defense': 'Defensa India Antigua', 'Budapest Defense': 'Gambito Budapest', 'Benko Gambit': 'Gambito Benko', 'Indian Defense': 'Defensa India',
  "Queen's Pawn Game": 'Peón de Dama', "King's Pawn Game": 'Peón de Rey', 'Owen Defense': 'Defensa Owen', 'Polish Opening': 'Apertura Polaca',
  'Nimzo-Larsen Attack': 'Ataque Nimzo-Larsen', "King's Indian Attack": 'Ataque Indio de Rey', 'Trompowsky Attack': 'Ataque Trompowsky', 'Elephant Gambit': 'Gambito Elefante',
  'Latvian Gambit': 'Gambito Letón', 'Englund Gambit': 'Gambito Englund', 'Danish Gambit': 'Gambito Danés', 'Evans Gambit': 'Gambito Evans', 'Blackmar-Diemer Gambit': 'Gambito Blackmar-Diemer',
  'Hungarian Opening': 'Apertura Húngara', 'Van Geet Opening': 'Apertura Van Geet', 'Bogo-Indian Defense': 'Defensa Bogoindia', 'Rat Defense': 'Defensa de la Rata',
  'Horwitz Defense': 'Defensa Horwitz', 'Kings Indian Defense': 'Defensa India de Rey', 'Torre Attack': 'Ataque Torre', 'Colle System': 'Sistema Colle',
  'Tarrasch Defense': 'Defensa Tarrasch', 'Mieses Opening': 'Apertura Mieses', 'Saragossa Opening': 'Apertura Zaragoza', 'Grob Opening': 'Apertura Grob',
  'Amar Opening': 'Apertura Amar', 'Anderssen\'s Opening': 'Apertura Anderssen', 'Barnes Opening': 'Apertura Barnes', 'Clemenz Opening': 'Apertura Clemenz',
  'Durkin Opening': 'Apertura Durkin', 'Kádas Opening': 'Apertura Kádas', 'Sodium Attack': 'Ataque Sodio', 'Ware Opening': 'Apertura Ware',
};

const PHRASES: [RegExp, string][] = [
  [/^Main Line$/, 'línea principal'], [/^Exchange Variation$/, 'variante del cambio'], [/^Advance Variation$/, 'variante del avance'],
  [/^Classical Variation$/, 'variante clásica'], [/^Modern Variation$/, 'variante moderna'], [/^Closed Variation$/, 'variante cerrada'], [/^Open Variation$/, 'variante abierta'],
  [/^Accelerated Dragon$/, 'Dragón acelerado'], [/^Dragon Variation$/, 'variante del Dragón'], [/^Fianchetto Variation$/, 'variante del fianchetto'],
  [/^(.+) Variations$/, 'variantes $1'], [/^Accepted$/, 'aceptado'], [/^Declined$/, 'rehusado'], [/^Deferred$/, 'diferida'], [/^Normal Variation$/, 'variante normal'], [/^Symmetrical Variation$/, 'variante simétrica'],
  [/^(.+) Variation$/, 'variante $1'], [/^(.+) Attack$/, 'ataque $1'], [/^(.+) Gambit Accepted$/, 'gambito $1 aceptado'], [/^(.+) Gambit Declined$/, 'gambito $1 rehusado'],
  [/^(.+) Gambit$/, 'gambito $1'], [/^(.+) Countergambit$/, 'contragambito $1'], [/^(.+) Defense$/, 'defensa $1'], [/^(.+) System$/, 'sistema $1'],
  [/^(.+) Line$/, 'línea $1'], [/^(.+) Formation$/, 'formación $1'], [/^(.+) Trap$/, 'trampa $1'], [/^(.+) Opening$/, 'apertura $1'], [/^(.+) Game$/, 'partida $1'],
];

const GENERIC: [RegExp, string][] = [
  [/^(.+) Defense$/, 'Defensa $1'], [/^(.+) Opening$/, 'Apertura $1'], [/^(.+) Gambit$/, 'Gambito $1'], [/^(.+) Countergambit$/, 'Contragambito $1'],
  [/^(.+) Attack$/, 'Ataque $1'], [/^(.+) Game$/, 'Partida $1'], [/^(.+) System$/, 'Sistema $1'],
];

const apply = (text: string, rules: [RegExp, string][]) => { for (const [pattern, replacement] of rules) if (pattern.test(text)) return text.replace(pattern, replacement); return text; };

const LEFTOVER = /\b(Variations?|Attack|Gambit|Countergambit|Mate|Line|Defen[cs]e|Opening|System|Game|Trap|Accepted|Declined|Modern|Classical|Main|Exchange|Advance|Polish|Paris|English|French|Fool's|Variation|Formation|Deferred|Old|New|Hungarian|Dutch|Indian|Queen's|King's|Knight|Bishop|Pawn|Countergambit)\b/;
const cache = new Map<string, string>();
export function spanishOpening(name: string): string {
  const hit = cache.get(name);
  if (hit) return hit;
  const [family, rest] = name.split(/:\s*/, 2);
  const head = FAMILIES[family] ?? apply(family, GENERIC);
  const tail = rest ? rest.split(/,\s*/).map(part => apply(part, PHRASES)).join(', ') : '';
  const mixed = tail ? `${head}: ${tail}` : head;
  // Half-translated names read worse than English ones: fall back to the original.
  const result = LEFTOVER.test(mixed) ? name : mixed;
  cache.set(name, result);
  return result;
}
