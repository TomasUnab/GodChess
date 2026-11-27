export type PathUnit = { id:string; phase:number; title:string; description:string; kind:'lesson'|'drill'|'puzzle'|'opening'|'game'; requirement?:string };
export const trainingPath: PathUnit[] = [
  {id:'board',phase:0,title:'Tablero y coordenadas',description:'Nombra filas, columnas y casillas sin mirar la leyenda.',kind:'lesson'},
  {id:'pawn',phase:0,title:'El peón',description:'Avance, captura y promoción.',kind:'lesson'},
  {id:'rook',phase:0,title:'La torre',description:'Líneas abiertas y jaques rectos.',kind:'lesson',requirement:'pawn'},
  {id:'bishop',phase:0,title:'El alfil',description:'Diagonales, color y piezas atrapadas.',kind:'lesson',requirement:'rook'},
  {id:'knight',phase:0,title:'El caballo',description:'Saltos, horquillas y casillas fuertes.',kind:'lesson',requirement:'bishop'},
  {id:'queen',phase:0,title:'La dama',description:'Potencia sin exponerla demasiado pronto.',kind:'lesson',requirement:'knight'},
  {id:'king',phase:0,title:'El rey',description:'Jaque, escape y enroque.',kind:'lesson',requirement:'queen'},
  {id:'mate1',phase:1,title:'Mate en uno',description:'Encuentra la única jugada que termina la partida.',kind:'puzzle',requirement:'king'},
  {id:'cct',phase:1,title:'Escaneo CCT',description:'Jaques, capturas y amenazas antes de mover.',kind:'drill',requirement:'mate1'},
  {id:'hanging',phase:1,title:'Piezas colgadas',description:'Comprueba qué queda atacado después.',kind:'puzzle',requirement:'cct'},
  {id:'tactics',phase:2,title:'Motivos tácticos',description:'Clavadas, ataques dobles y descubiertos.',kind:'puzzle',requirement:'hanging'},
  {id:'slow',phase:2,title:'Primera partida lenta',description:'Aplica el escaneo durante toda una partida.',kind:'game',requirement:'tactics'},
  {id:'openings',phase:3,title:'Principios de apertura',description:'Desarrollo, centro, seguridad y tiempos.',kind:'opening',requirement:'slow'},
  {id:'repertoire',phase:3,title:'Construye repertorio',description:'Explora todas las aperturas y elige tus líneas.',kind:'opening',requirement:'openings'},
  {id:'endgames',phase:4,title:'Finales esenciales',description:'Rey y peón, oposición y finales de torre.',kind:'lesson',requirement:'repertoire'},
];
export const phaseNames=['Fundamentos','Seguridad','Táctica','Aperturas','Finales'];
