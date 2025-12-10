import { GameState } from './gameState.js';

/**
 * Classe que gerencia uma sala de jogo com dois jogadores
 */
export class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.player1 = null;
    this.player2 = null;
    this.gameState = new GameState();
    this.player1Turn = true;
  }

  setPlayer1(playerInfo) {
    this.player1 = playerInfo;
  }

  setPlayer2(playerInfo) {
    this.player2 = playerInfo;
  }

  isFull() {
    return this.player1 !== null && this.player2 !== null;
  }

  isEmpty() {
    return this.player1 === null && this.player2 === null;
  }

  handleMove(playerId, move) {
    const isPlayer1 = playerId === this.player1.id;
    const isPlayer2 = playerId === this.player2.id;

    // Verifica se é o turno do jogador
    if ((this.player1Turn && !isPlayer1) || (!this.player1Turn && !isPlayer2)) {
      console.log(`[SALA ${this.roomId}] Não é o turno do jogador ${playerId}`);
      return {
        valid: false,
        message: 'Não é sua vez!',
        gameOver: null
      };
    }

    const valid = this.gameState.executeMove(
      move.from_row,
      move.from_col,
      move.to_row,
      move.to_col
    );

    if (valid) {
      console.log(`[SALA ${this.roomId}] Movimento válido: (${move.from_row},${move.from_col}) -> (${move.to_row},${move.to_col})`);
      
      // Verifica fim de jogo
      const gameOverMsg = this.gameState.checkGameOver();
      
      // Troca o turno apenas se não houver fim de jogo
      if (!gameOverMsg) {
        this.player1Turn = !this.player1Turn;
      }

      return {
        valid: true,
        message: 'Movimento executado',
        gameOver: gameOverMsg,
        move: move
      };
    } else {
      console.log(`[SALA ${this.roomId}] Movimento inválido`);
      return {
        valid: false,
        message: 'Movimento inválido!',
        gameOver: null
      };
    }
  }

  getCurrentPlayer() {
    return this.player1Turn ? this.player1 : this.player2;
  }

  getOpponent(playerId) {
    return playerId === this.player1.id ? this.player2 : this.player1;
  }

  removePlayer(playerId) {
    if (this.player1 && this.player1.id === playerId) {
      this.player1 = null;
    }
    if (this.player2 && this.player2.id === playerId) {
      this.player2 = null;
    }
  }
}

/**
 * Gerenciador de salas de jogo
 */
export class GameRoomManager {
  constructor() {
    this.rooms = new Map();
    this.waitingRoom = null;
    this.roomCounter = 0;
    this.playerRooms = new Map(); // Mapeia playerId -> roomId
  }

  /**
   * Adiciona um jogador à fila e retorna a sala
   */
  addPlayer(playerInfo) {
    // Se há uma sala esperando, adiciona o segundo jogador
    if (this.waitingRoom) {
      const room = this.waitingRoom;
      room.setPlayer2(playerInfo);
      this.playerRooms.set(playerInfo.id, room.roomId);
      
      console.log(`[GERENCIADOR] Jogador ${playerInfo.name} entrou na sala ${room.roomId}`);
      console.log(`[SALA ${room.roomId}] Jogo iniciado!`);
      console.log(`  - Brancas (Jogador 1): ${room.player1.name}`);
      console.log(`  - Pretas (Jogador 2): ${room.player2.name}`);
      
      this.waitingRoom = null;
      return { room, isPlayer1: false };
    } else {
      // Cria uma nova sala e aguarda o segundo jogador
      const room = new GameRoom(++this.roomCounter);
      room.setPlayer1(playerInfo);
      this.rooms.set(room.roomId, room);
      this.playerRooms.set(playerInfo.id, room.roomId);
      this.waitingRoom = room;
      
      console.log(`[GERENCIADOR] Jogador ${playerInfo.name} criou a sala ${room.roomId}`);
      console.log(`[SALA ${room.roomId}] Aguardando segundo jogador...`);
      
      return { room, isPlayer1: true };
    }
  }

  /**
   * Remove um jogador e limpa a sala se necessário
   */
  removePlayer(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const opponent = room.getOpponent(playerId);
    room.removePlayer(playerId);
    this.playerRooms.delete(playerId);

    // Se a sala ficou vazia, remove ela
    if (room.isEmpty()) {
      this.rooms.delete(roomId);
      if (this.waitingRoom === room) {
        this.waitingRoom = null;
      }
      console.log(`[GERENCIADOR] Sala ${roomId} removida (vazia)`);
    } else {
      console.log(`[GERENCIADOR] Jogador ${playerId} saiu da sala ${roomId}`);
    }

    return opponent;
  }

  /**
   * Obtém a sala de um jogador
   */
  getPlayerRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    return roomId ? this.rooms.get(roomId) : null;
  }
}
