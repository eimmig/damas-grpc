# 🎯 Jogo de Damas com gRPC

Jogo de damas multiplayer usando **gRPC** com streaming bidirecional.

## 🏗️ Arquitetura

- **Backend**: Node.js (servidor gRPC)
- **Frontend**: Java + Swing (cliente gRPC)
- **Protocolo**: Protocol Buffers 3

## 📁 Estrutura (Padrão gRPC)

```
Damas-gRPC/
├── proto/                   # Arquivo .proto compartilhado
│   └── checkers.proto       # (padrão dos exemplos oficiais do gRPC)
│
├── client/                  # Cliente Java (Maven)
│   ├── pom.xml
│   └── src/main/java/...
│
└── server/                  # Servidor Node.js
    ├── package.json
    └── src/...
```

> **Nota**: Como nos [exemplos oficiais do gRPC](https://github.com/grpc/grpc-java/tree/master/examples/src/main/proto), usamos **um único `.proto` compartilhado** entre cliente e servidor.

## 🚀 Execução Rápida

### 1. Instalar Dependências

**Servidor (Node.js)**:
```bash
cd server
npm install
```

**Cliente (Java/Maven)**:
```bash
cd client
mvn clean compile
```

### 2. Executar

**Terminal 1 - Servidor**:
```bash
cd server
npm start
# Servidor rodando em localhost:50051
```

**Terminal 2 - Cliente 1**:
```bash
cd client
mvn exec:java
```

**Terminal 3 - Cliente 2**:
```bash
cd client
mvn exec:java
```

## 🎮 Como Jogar

1. Execute o servidor
2. Execute 2 clientes (um para cada jogador)
3. Os jogadores são automaticamente pareados
4. Clique nas peças para movê-las
5. Capturas múltiplas são automáticas

## 🔄 Comparação TCP → gRPC

### Antes (TCP Sockets)
```java
// Cliente Java enviava strings
out.writeUTF("MOVE:0,0,1,1");
String response = in.readUTF();
```

### Agora (gRPC)
```java
// Cliente usa mensagens tipadas
GameMessage move = GameMessage.newBuilder()
    .setMove(Move.newBuilder()
        .setFromRow(0)
        .setFromCol(0)
        .setToRow(1)
        .setToCol(1))
    .build();
requestObserver.onNext(move);
```

### Vantagens do gRPC

✅ **Mensagens Tipadas**: Não há parsing manual de strings  
✅ **Streaming**: Comunicação bidirecional eficiente  
✅ **Geração de Código**: Stubs automáticos em Java e Node.js  
✅ **Protocolo Binário**: Mais eficiente que texto puro  
✅ **Multi-linguagem**: Backend Node.js + Frontend Java

## 📜 Protocolo (checkers.proto)

```protobuf
service CheckersGame {
  rpc Connect(ConnectRequest) returns (ConnectResponse);
  rpc PlayGame(stream GameMessage) returns (stream GameMessage);
}

message GameMessage {
  oneof message {
    WaitingForPlayer waiting = 1;
    GameStart start = 2;
    Move move = 3;
    MoveResult move_result = 4;
    OpponentMove opponent_move = 5;
    YourTurn your_turn = 6;
    GameOver game_over = 7;
    ErrorMessage error = 8;
  }
}
```

## 🛠️ Desenvolvimento

### Atualizar Proto

1. Edite `proto/checkers.proto`
2. Recompile cliente e servidor:

```bash
# Cliente
cd client
mvn clean compile

# Servidor (dinâmico - não precisa recompilar)
cd server
npm start
```

### Estrutura de Arquivos

**Cliente Java**:
- `CheckersClient.java`: Interface Swing + gRPC client
- `pom.xml`: Configuração Maven com plugin protobuf

**Servidor Node.js**:
- `server.js`: Servidor gRPC principal
- `gameRoom.js`: Gerenciamento de salas/matchmaking
- `gameState.js`: Lógica do jogo de damas

## 📋 Requisitos

- **Node.js** 16+
- **JDK** 11+
- **Maven** 3.6+

## 🐛 Troubleshooting

**Erro "Address already in use"**:
```bash
# Windows
netstat -ano | findstr :50051
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:50051 | xargs kill
```

**Erro ao compilar proto**:
```bash
cd client
mvn clean  # Limpa arquivos gerados
mvn compile  # Recompila
```

## 📚 Recursos

- [gRPC Java Examples](https://github.com/grpc/grpc-java/tree/master/examples)
- [gRPC Node Examples](https://github.com/grpc/grpc-node/tree/master/examples)
- [Protocol Buffers Guide](https://protobuf.dev/)

## ⚡ Melhorias em Relação ao TCP Original

| Aspecto | TCP (Antes) | gRPC (Agora) |
|---------|-------------|--------------|
| **Protocolo** | Strings manuais | Protocol Buffers |
| **Parsing** | Manual (split/substring) | Automático |
| **Tipo de dados** | Strings | Mensagens tipadas |
| **Erro de protocolo** | Runtime | Compile-time |
| **Streaming** | Manual (threads) | Nativo (StreamObserver) |
| **Multi-linguagem** | Difícil | Fácil (Java + Node.js) |
| **Performance** | Texto | Binário (mais rápido) |
| **Documentação** | Comentários | Schema .proto |

---

**Licença**: MIT  
**Baseado em**: Implementação original com TCP sockets
