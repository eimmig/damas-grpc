/**
 * Classe que representa o estado do jogo de damas
 */
export class GameState {
  constructor() {
    this.board = Array(8).fill(null).map(() => Array(8).fill(''));
    this.whiteTurn = true;
    this.initializeBoard();
  }

  /**
   * Inicializa o tabuleiro com as peças nas posições iniciais
   */
  initializeBoard() {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        this.board[r][c] = '';
        // Casas escuras são onde (r + c) é ímpar
        if ((r + c) % 2 === 1) {
          if (r < 3) {
            this.board[r][c] = '⚫'; // Pretas no topo
          } else if (r > 4) {
            this.board[r][c] = '⚪'; // Brancas no fundo
          }
        }
      }
    }
  }

  /**
   * Valida e executa um movimento
   */
  executeMove(r1, c1, r2, c2) {
    const piece = this.board[r1][c1];
    if (!piece) {
      console.log('[GAMESTATE] Movimento inválido: origem vazia');
      return false;
    }

    const isWhite = piece.includes('⚪');
    if (isWhite !== this.whiteTurn) {
      console.log(`[GAMESTATE] Movimento inválido: não é a vez de ${isWhite ? 'BRANCO' : 'PRETO'}`);
      return false;
    }

    const dr = r2 - r1;
    const dc = c2 - c1;
    if (Math.abs(dr) !== Math.abs(dc)) {
      console.log('[GAMESTATE] Movimento inválido: não é diagonal');
      return false;
    }

    const isKing = piece.includes('D');
    console.log(`[GAMESTATE] Validando movimento: peça=${piece} de (${r1},${c1}) para (${r2},${c2})`);

    // Verifica se há capturas obrigatórias
    const allCaptures = this.findAllCaptures(this.whiteTurn);
    const mustCapture = allCaptures.length > 0;

    // Movimento de captura
    if (Math.abs(dr) >= 2) {
      const capturesFromPiece = this.getCaptureMovements(piece, r1, c1);
      const validCapture = capturesFromPiece.some(move => move[0] === r2 && move[1] === c2);

      if (validCapture) {
        if (this.performCapture(r1, c1, r2, c2)) {
          // Verifica capturas sequenciais
          const sequentialCaptures = this.getCaptureMovements(this.board[r2][c2], r2, c2);
          if (sequentialCaptures.length === 0) {
            this.whiteTurn = !this.whiteTurn;
          }
          return true;
        }
      }
      return false;
    }

    // Movimento simples (não-captura)
    if (mustCapture) {
      console.log('[GAMESTATE] Movimento inválido: captura obrigatória disponível');
      return false;
    }

    if (this.board[r2][c2]) {
      console.log('[GAMESTATE] Movimento inválido: destino ocupado');
      return false;
    }

    if (!isKing) {
      // Peça normal: move 1 casa diagonalmente
      if (Math.abs(dr) === 1 && Math.abs(dc) === 1 && ((isWhite && dr < 0) || (!isWhite && dr > 0))) {
        console.log('[GAMESTATE] Movimento simples VÁLIDO!');
        this.performSimpleMove(r1, c1, r2, c2);
        this.whiteTurn = !this.whiteTurn;
        return true;
      }
    } else {
      // Dama: move qualquer distância na diagonal se caminho livre
      if (this.isPathClear(r1, c1, r2, c2)) {
        console.log('[GAMESTATE] Movimento de dama VÁLIDO!');
        this.performSimpleMove(r1, c1, r2, c2);
        this.whiteTurn = !this.whiteTurn;
        return true;
      }
    }

    console.log('[GAMESTATE] Movimento inválido: nenhuma condição satisfeita');
    return false;
  }

  performCapture(r1, c1, r2, c2) {
    const piece = this.board[r1][c1];
    const isKing = piece.includes('D');
    const isWhite = piece.includes('⚪');
    const dr = r2 - r1;
    const dc = c2 - c1;
    const stepR = Math.sign(dr);
    const stepC = Math.sign(dc);

    let enemyR = -1;
    let enemyC = -1;
    let captured = false;

    if (isKing) {
      for (let i = 1; i < Math.abs(dr); i++) {
        const rr = r1 + i * stepR;
        const cc = c1 + i * stepC;
        if (this.board[rr][cc]) {
          const isSameColor = this.board[rr][cc].includes('⚪') === isWhite;
          if (!isSameColor) {
            if (!captured) {
              captured = true;
              enemyR = rr;
              enemyC = cc;
            } else {
              return false;
            }
          } else {
            return false;
          }
        }
      }
    } else {
      const rm = Math.floor((r1 + r2) / 2);
      const cm = Math.floor((c1 + c2) / 2);
      if (Math.abs(dr) === 2 && this.board[rm][cm]) {
        const isDifferentColor = this.board[rm][cm].includes('⚪') !== isWhite;
        if (isDifferentColor) {
          captured = true;
          enemyR = rm;
          enemyC = cm;
        }
      }
    }

    if (captured) {
      this.board[enemyR][enemyC] = '';
      this.performSimpleMove(r1, c1, r2, c2);
      return true;
    }
    return false;
  }

  performSimpleMove(r1, c1, r2, c2) {
    this.board[r2][c2] = this.board[r1][c1];
    this.board[r1][c1] = '';

    // Promove a dama quando atinge a última linha
    if (this.board[r2][c2] === '⚪' && r2 === 0) {
      this.board[r2][c2] = '⚪D';
    } else if (this.board[r2][c2] === '⚫' && r2 === 7) {
      this.board[r2][c2] = '⚫D';
    }
  }

  isPathClear(r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    for (let i = 1; i < Math.abs(r2 - r1); i++) {
      if (this.board[r1 + i * dr][c1 + i * dc]) return false;
    }
    return true;
  }

  findAllCaptures(isWhite) {
    const allCaptures = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.includes('⚪') === isWhite) {
          allCaptures.push(...this.getCaptureMovements(piece, r, c));
        }
      }
    }
    return allCaptures;
  }

  getCaptureMovements(piece, r, c) {
    const moves = [];
    if (!piece) return moves;

    const isKing = piece.includes('D');
    const isWhite = piece.includes('⚪');
    const dirs = [-1, 1];

    for (const dr of dirs) {
      for (const dc of dirs) {
        if (isKing) {
          let rr = r + dr;
          let cc = c + dc;
          let enemyFound = false;

          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            if (this.board[rr][cc]) {
              const isSameColor = this.board[rr][cc].includes('⚪') === isWhite;
              if (isSameColor || enemyFound) break;
              enemyFound = true;
            } else if (enemyFound) {
              moves.push([rr, cc]);
            }
            rr += dr;
            cc += dc;
          }
        } else {
          const rm = r + dr;
          const cm = c + dc;
          const r2 = r + 2 * dr;
          const c2 = c + 2 * dc;

          if (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8) {
            const hasEnemy = this.board[rm][cm] && this.board[rm][cm].includes('⚪') !== isWhite;
            const targetEmpty = !this.board[r2][c2];

            if (hasEnemy && targetEmpty) {
              moves.push([r2, c2]);
            }
          }
        }
      }
    }
    return moves;
  }

  /**
   * Verifica se o jogo terminou
   */
  checkGameOver() {
    let hasWhite = false;
    let hasBlack = false;
    let hasWhiteMove = false;
    let hasBlackMove = false;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p) {
          const isWhite = p.includes('⚪');
          if (isWhite) {
            hasWhite = true;
            if (this.getCaptureMovements(p, r, c).length > 0 || this.hasSimpleMove(p, r, c)) {
              hasWhiteMove = true;
            }
          } else {
            hasBlack = true;
            if (this.getCaptureMovements(p, r, c).length > 0 || this.hasSimpleMove(p, r, c)) {
              hasBlackMove = true;
            }
          }
        }
      }
    }

    if (!hasWhite) return 'Pretas venceram!';
    if (!hasBlack) return 'Brancas venceram!';
    if (this.whiteTurn && !hasWhiteMove) return 'Pretas venceram! (Brancas sem movimentos)';
    if (!this.whiteTurn && !hasBlackMove) return 'Brancas venceram! (Pretas sem movimentos)';

    return null;
  }

  hasSimpleMove(piece, r, c) {
    const isKing = piece.includes('D');
    const isWhite = piece.includes('⚪');
    const dirs = [-1, 1];

    if (!isKing) {
      const dr = isWhite ? -1 : 1;
      for (const dc of dirs) {
        const r2 = r + dr;
        const c2 = c + dc;
        if (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8 && !this.board[r2][c2]) {
          return true;
        }
      }
    } else {
      for (const dr of dirs) {
        for (const dc of dirs) {
          let r2 = r + dr;
          let c2 = c + dc;
          while (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8) {
            if (!this.board[r2][c2]) {
              return true;
            }
            break;
          }
        }
      }
    }
    return false;
  }

  getBoard() {
    return this.board;
  }

  isWhiteTurn() {
    return this.whiteTurn;
  }
}
