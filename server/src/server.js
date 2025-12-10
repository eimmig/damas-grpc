import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GameRoomManager } from './gameRoom.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROTO_PATH = join(__dirname, '../../proto/checkers.proto');

// Carrega o arquivo proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const checkersProto = grpc.loadPackageDefinition(packageDefinition).checkers;

// Gerenciador de salas
const roomManager = new GameRoomManager();

// Armazena os streams dos jogadores
const playerStreams = new Map();

/**
 * Implementação do método Connect
 */
function connect(call, callback) {
  const playerName = call.request.player_name;
  const playerId = generatePlayerId();

  console.log(`[SERVIDOR] Jogador ${playerName} conectado com ID ${playerId}`);

  callback(null, {
    session_id: playerId,
    message: `Bem-vindo, ${playerName}!`
  });
}

/**
 * Implementação do método PlayGame (stream bidirecional)
 */
function playGame(call) {
  let playerId = null;
  let playerName = null;
  let room = null;
  let isPlayer1 = false;

  console.log('[SERVIDOR] Nova conexão de stream bidirecional');

  // Recebe mensagens do cliente
  call.on('data', (gameMessage) => {
    try {
      // Primeira mensagem deve conter o nome do jogador (simulando conexão)
      if (!playerId) {
        // A primeira mensagem pode ser qualquer coisa, vamos extrair o playerId do metadata
        // ou criar um novo jogador
        playerId = generatePlayerId();
        playerName = `Jogador_${playerId.substring(0, 6)}`;
        
        // Adiciona o jogador à fila
        const result = roomManager.addPlayer({ id: playerId, name: playerName, stream: call });
        room = result.room;
        isPlayer1 = result.isPlayer1;
        
        playerStreams.set(playerId, call);

        if (!room.isFull()) {
          // Aguardando segundo jogador
          call.write({
            waiting: {
              message: 'Aguardando oponente...'
            }
          });
        } else {
          // Jogo pode começar
          const opponent = room.getOpponent(playerId);
          
          // Envia mensagem de início para ambos os jogadores
          call.write({
            start: {
              your_color: isPlayer1 ? 0 : 1, // 0 = WHITE, 1 = BLACK
              opponent_name: opponent.name
            }
          });

          const opponentStream = playerStreams.get(opponent.id);
          if (opponentStream) {
            opponentStream.write({
              start: {
                your_color: isPlayer1 ? 1 : 0,
                opponent_name: playerName
              }
            });

            // Envia YOUR_TURN para o jogador 1 (brancas)
            if (isPlayer1) {
              call.write({
                your_turn: {
                  message: 'Sua vez!'
                }
              });
            } else {
              opponentStream.write({
                your_turn: {
                  message: 'Sua vez!'
                }
              });
            }
          }
        }
        return;
      }

      // Processa movimentos
      if (gameMessage.move) {
        const move = gameMessage.move;
        console.log(`[SERVIDOR] Movimento recebido de ${playerName}: (${move.from_row},${move.from_col}) -> (${move.to_row},${move.to_col})`);

        const result = room.handleMove(playerId, move);

        if (result.valid) {
          // Envia o movimento para ambos os jogadores
          const opponent = room.getOpponent(playerId);
          const opponentStream = playerStreams.get(opponent.id);

          const opponentMoveMsg = {
            opponent_move: {
              from_row: move.from_row,
              from_col: move.from_col,
              to_row: move.to_row,
              to_col: move.to_col
            }
          };

          // Envia para ambos
          call.write(opponentMoveMsg);
          if (opponentStream) {
            opponentStream.write(opponentMoveMsg);
          }

          // Verifica fim de jogo
          if (result.gameOver) {
            const gameOverMsg = {
              game_over: {
                winner: result.gameOver.includes('Brancas') ? 'WHITE' : 'BLACK',
                reason: result.gameOver
              }
            };

            call.write(gameOverMsg);
            if (opponentStream) {
              opponentStream.write(gameOverMsg);
            }

            console.log(`[SALA ${room.roomId}] Jogo finalizado: ${result.gameOver}`);
            
            // Encerra as conexões
            setTimeout(() => {
              call.end();
              if (opponentStream) {
                opponentStream.end();
              }
            }, 1000);
          } else {
            // Envia YOUR_TURN para o próximo jogador
            const nextPlayer = room.getCurrentPlayer();
            const nextStream = playerStreams.get(nextPlayer.id);

            if (nextStream) {
              nextStream.write({
                your_turn: {
                  message: 'Sua vez!'
                }
              });
              console.log(`[SALA ${room.roomId}] Enviando YOUR_TURN para ${nextPlayer.name}`);
            }
          }
        } else {
          // Movimento inválido
          call.write({
            move_result: {
              valid: false,
              message: result.message
            }
          });
        }
      }
    } catch (error) {
      console.error('[SERVIDOR] Erro ao processar mensagem:', error);
      call.write({
        error: {
          error: 'Erro ao processar mensagem: ' + error.message
        }
      });
    }
  });

  // Cliente desconectou
  call.on('end', () => {
    console.log(`[SERVIDOR] Jogador ${playerName} desconectou`);
    
    if (playerId && room) {
      const opponent = roomManager.removePlayer(playerId);
      playerStreams.delete(playerId);

      // Notifica o oponente
      if (opponent) {
        const opponentStream = playerStreams.get(opponent.id);
        if (opponentStream) {
          opponentStream.write({
            game_over: {
              winner: 'DISCONNECT',
              reason: 'Oponente desconectou'
            }
          });
        }
      }
    }

    call.end();
  });

  // Erro na conexão
  call.on('error', (error) => {
    console.error(`[SERVIDOR] Erro na conexão de ${playerName}:`, error.message);
  });
}

/**
 * Gera um ID único para o jogador
 */
function generatePlayerId() {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Inicia o servidor gRPC
 */
function startServer() {
  const server = new grpc.Server();

  server.addService(checkersProto.CheckersGame.service, {
    Connect: connect,
    PlayGame: playGame
  });

  const PORT = '0.0.0.0:50051';
  server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('[ERRO] Falha ao iniciar servidor:', err);
      return;
    }
    console.log('==============================================');
    console.log('   SERVIDOR GRPC DE DAMAS INICIADO');
    console.log(`   Porta: ${port}`);
    console.log('==============================================');
  });
}

// Inicia o servidor
startServer();
