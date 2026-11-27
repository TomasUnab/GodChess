import { describe, expect, it } from 'vitest';
import { parsePgn, parsePgnGames, toPgn } from './pgn';
import { addMove, createTree, deleteNode, mainline, promoteVariation, toggleNag, figurine } from './tree';

const sample = `[Event "Club"]
[White "Ana"]
[Black "Luis"]
[Result "0-1"]

1. e4 c5 {Siciliana} 2. Nf3 d6 (2... Nc6 3. Bb5 (3. d4 cxd4) 3... g6) 3. d4 $1 cxd4 4. Nxd4 Nf6?? 0-1

[Event "Segunda"]
[Result "1-0"]

1. d4 d5 2. c4 1-0`;

describe('PGN', () => {
  it('parses several games with headers, variations, comments and NAGs', () => {
    const { games, issues } = parsePgnGames(sample);
    expect(issues).toEqual([]);
    expect(games).toHaveLength(2);
    const [first, second] = games;
    expect(first.headers.White).toBe('Ana');
    expect(first.headers.Result).toBe('0-1');
    const line = mainline(first).slice(1).map(id => first.nodes[id].san);
    expect(line).toEqual(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6']);
    const c5 = first.nodes[mainline(first)[2]];
    expect(c5.comment).toBe('Siciliana');
    const nf3 = first.nodes[mainline(first)[3]];
    expect(nf3.children.map(id => first.nodes[id].san)).toEqual(['d6', 'Nc6']);
    const nc6 = first.nodes[nf3.children[1]];
    expect(nc6.children.map(id => first.nodes[id].san)).toEqual(['Bb5', 'd4']);
    expect(first.nodes[mainline(first)[5]].nags).toEqual([1]);
    expect(first.nodes[mainline(first)[8]].nags).toEqual([4]);
    expect(mainline(second)).toHaveLength(4);
  });

  it('round-trips through toPgn', () => {
    const tree = parsePgn(sample);
    const text = toPgn(tree);
    expect(text).toContain('[White "Ana"]');
    expect(text.replace(/\s+/g, ' ')).toContain('2. Nf3 d6 (2... Nc6 3. Bb5 (3. d4 cxd4) 3... g6) 3. d4 $1');
    expect(text).toContain('{Siciliana}');
    const again = parsePgn(text);
    expect(toPgn(again)).toBe(text);
  });

  it('accepts PGN without headers and with castling written with zeros', () => {
    const tree = parsePgn('1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.0-0 Nf6 *');
    expect(mainline(tree).map(id => tree.nodes[id].san).pop()).toBe('Nf6');
  });

  it('reports illegal moves without crashing', () => {
    const { games, issues } = parsePgnGames('1. e4 e5 2. Ke3 Nc6 *');
    expect(games).toHaveLength(1);
    expect(issues[0].message).toContain('Ke3');
  });

  it('keeps custom start positions', () => {
    const tree = parsePgn('[FEN "6k1/5ppp/8/8/8/8/8/R6K w - - 0 40"]\n[SetUp "1"]\n\n40. Ra8# 1-0');
    expect(tree.nodes[mainline(tree)[1]].san).toBe('Ra8#');
    expect(toPgn(tree)).toContain('40. Ra8#');
  });
});

describe('tree editing', () => {
  it('reuses existing moves, promotes and deletes variations', () => {
    let tree = createTree();
    const e4 = addMove(tree, tree.rootId, 'e4')!; tree = e4.tree;
    const e5 = addMove(tree, e4.id, 'e5')!; tree = e5.tree;
    const c5 = addMove(tree, e4.id, { from: 'c7', to: 'c5' })!; tree = c5.tree;
    expect(addMove(tree, e4.id, 'c5')!.id).toBe(c5.id);
    tree = promoteVariation(tree, c5.id);
    expect(tree.nodes[e4.id].children[0]).toBe(c5.id);
    tree = deleteNode(tree, e5.id).tree;
    expect(tree.nodes[e4.id].children).toEqual([c5.id]);
    tree = toggleNag(tree, c5.id, 1);
    tree = toggleNag(tree, c5.id, 2);
    expect(tree.nodes[c5.id].nags).toEqual([2]);
  });

  it('prints figurines per colour', () => {
    expect(figurine('Nxe5+', 'w')).toBe('♘xe5+');
    expect(figurine('exd8=Q', 'b')).toBe('exd8=♛');
  });
});

describe('engine annotations', () => {
  it('round-trips [%eval] and [%best] without polluting comments', () => {
    const tree = parsePgn('1. e4 { [%eval 0.3,14] [%best e7e5] } 1... e5 { Simétrico [%eval #-2] } *');
    const [, e4, e5] = mainline(tree);
    expect(tree.nodes[e4].eval).toEqual({ cp: 30, depth: 14, best: 'e7e5' });
    expect(tree.nodes[e4].comment).toBeUndefined();
    expect(tree.nodes[e5].comment).toBe('Simétrico');
    expect(tree.nodes[e5].eval?.mate).toBe(-2);
    const text = toPgn(tree);
    expect(text).toContain('[%eval 0.30,14] [%best e7e5]');
    expect(toPgn(parsePgn(text))).toBe(text);
  });
});
