# 🎮 Servidor gRPC de Damas - Node.js

Backend do jogo de damas implementado em Node.js com gRPC.

## 📋 Estrutura

```
server/
├── proto/
│   └── checkers.proto       # Definição do protocolo gRPC
├── src/
│   ├── server.js           # Servidor gRPC principal
│   ├── gameState.js        # Lógica do jogo de damas
│   └── gameRoom.js         # Gerenciamento de salas
├── package.json
└── README.md
```

## 🚀 Instalação

### Pré-requisitos
- Node.js 16+ ([Download](https://nodejs.org/))
- npm (incluído com Node.js)

### Instalar Dependências

```bash
npm install
```

## ▶️ Execução

### Modo Produção
```bash
npm start
```

### Modo Desenvolvimento (com reload automático)
```bash
npm run dev
```

O servidor iniciará na porta **50051**.

```
==============================================
   SERVIDOR GRPC DE DAMAS INICIADO
   Porta: 50051
==============================================
```

## 🔧 Configuração

### Alterar Porta

Edite `src/server.js`:
```javascript
const PORT = '0.0.0.0:50051'; // Altere aqui
```

### Logs

O servidor imprime logs detalhados:
```
[SERVIDOR] Jogador Player_abc123 conectado com ID player_1234...
[GERENCIADOR] Jogador Jogador_abc123 criou a sala 1
[SALA 1] Aguardando segundo jogador...
[SALA 1] Jogo iniciado!
  - Brancas (Jogador 1): Jogador_abc123
  - Pretas (Jogador 2): Jogador_def456
[SALA 1] Movimento recebido de Jogador_abc123: (5,2) -> (4,3)
```

## 📡 API gRPC

### Serviços Disponíveis

#### 1. Connect
```protobuf
rpc Connect(ConnectRequest) returns (ConnectResponse);
```
- **Entrada**: Nome do jogador
- **Saída**: ID da sessão

#### 2. PlayGame (Streaming Bidirecional)
```protobuf
rpc PlayGame(stream GameMessage) returns (stream GameMessage);
```
- **Entrada**: Stream de mensagens do cliente
- **Saída**: Stream de mensagens do servidor

### Mensagens Suportadas

| Tipo | Direção | Descrição |
|------|---------|-----------|
| `WaitingForPlayer` | Server → Client | Aguardando oponente |
| `GameStart` | Server → Client | Jogo iniciado (cor do jogador) |
| `Move` | Client → Server | Movimento do jogador |
| `MoveResult` | Server → Client | Resultado do movimento |
| `OpponentMove` | Server → Client | Movimento do oponente |
| `YourTurn` | Server → Client | Sua vez de jogar |
| `GameOver` | Server → Client | Fim de jogo |
| `ErrorMessage` | Server → Client | Mensagem de erro |

## 🎯 Lógica do Jogo

### GameState (gameState.js)

Implementa todas as regras do jogo de damas:
- ✅ Movimento simples (1 casa diagonal)
- ✅ Movimento de dama (múltiplas casas)
- ✅ Captura obrigatória
- ✅ Capturas múltiplas
- ✅ Promoção a dama
- ✅ Detecção de fim de jogo

### GameRoom (gameRoom.js)

Gerencia uma sala com 2 jogadores:
- Controla turnos
- Valida movimentos
- Sincroniza estado entre jogadores

### GameRoomManager (gameRoom.js)

Gerencia múltiplas salas:
- Sistema de filas (matchmaking)
- Criação automática de salas
- Limpeza de salas vazias

## 🧪 Testando

### Teste com grpcurl

```bash
# Instalar grpcurl
# Windows: scoop install grpcurl
# Mac: brew install grpcurl
# Linux: https://github.com/fullstorydev/grpcurl

# Listar serviços
grpcurl -plaintext localhost:50051 list

# Testar Connect
grpcurl -plaintext -d '{"player_name": "TestPlayer"}' \
  localhost:50051 checkers.CheckersGame/Connect
```

### Teste com BloomRPC

1. Baixar [BloomRPC](https://github.com/bloomrpc/bloomrpc)
2. Importar `proto/checkers.proto`
3. Conectar em `localhost:50051`
4. Testar métodos

## 🔍 Debugging

### Modo Verbose

```bash
NODE_ENV=development npm start
```

### Debugger

```bash
node --inspect src/server.js
```

Abra `chrome://inspect` no Chrome.

## 📊 Arquitetura

```
┌─────────────────┐
│   Cliente 1     │
└────────┬────────┘
         │
         │  gRPC Stream
         │
    ┌────▼────────────┐
    │  server.js      │
    │  (gRPC Server)  │
    └────┬────────────┘
         │
    ┌────▼────────────┐
    │ GameRoomManager │
    │  (Matchmaking)  │
    └────┬────────────┘
         │
    ┌────▼────────────┐
    │   GameRoom 1    │◄──── 2 Players
    │   GameRoom 2    │
    │   GameRoom N    │
    └────┬────────────┘
         │
    ┌────▼────────────┐
    │   GameState     │
    │ (Game Logic)    │
    └─────────────────┘
```

## 🚀 Deploy

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

EXPOSE 50051
CMD ["npm", "start"]
```

```bash
docker build -t checkers-server .
docker run -p 50051:50051 checkers-server
```

### Produção

Recomendações:
- Use **PM2** para gerenciamento de processos
- Configure **load balancer** (Envoy, Nginx)
- Habilite **TLS** para segurança
- Monitore com **Prometheus + Grafana**

```bash
# PM2
npm install -g pm2
pm2 start src/server.js --name checkers-server
pm2 save
pm2 startup
```

## 🔐 Segurança

### Habilitar TLS

```javascript
import fs from 'fs';

const server = new grpc.Server();

const credentials = grpc.ServerCredentials.createSsl(
  fs.readFileSync('certs/ca.crt'),
  [{
    cert_chain: fs.readFileSync('certs/server.crt'),
    private_key: fs.readFileSync('certs/server.key')
  }],
  true
);

server.bindAsync(PORT, credentials, callback);
```

## 📝 Modificando o Protocolo

1. Edite `proto/checkers.proto`
2. **Não precisa recompilar** (proto-loader faz em runtime)
3. Reinicie o servidor

## 🐛 Troubleshooting

### Porta em uso
```bash
# Windows
netstat -ano | findstr :50051
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:50051 | xargs kill
```

### Módulos não encontrados
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📚 Dependências

- **@grpc/grpc-js**: Implementação gRPC para Node.js
- **@grpc/proto-loader**: Carrega arquivos .proto dinamicamente

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch de feature
3. Commit suas mudanças
4. Push e abra um Pull Request

## 📄 Licença

Projeto educacional - Livre para uso

---

**Desenvolvido com ❤️ usando Node.js e gRPC**
