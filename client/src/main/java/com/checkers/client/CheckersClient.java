package com.checkers.client;

import checkers.CheckersOuterClass.*;
import checkers.CheckersGameGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.StreamObserver;

import javax.swing.*;
import java.awt.*;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Cliente gRPC de Damas com interface Swing
 */
public class CheckersClient extends JFrame {
    
    private static final long serialVersionUID = 1L;
    private static final String AGUARDANDO_OPONENTE = "Aguardando oponente...";
    
    private JPanel mainPanel;
    private JPanel tabuleiroPanel;
    
    // Componentes de rede
    private JTextField ipTextField;
    private JTextField portTextField;
    private JTextField nomeTextField;
    private JButton conectarButton;
    private JLabel statusLabel;
    private JLabel turnoLabel;

    private final JButton[][] casas = new JButton[8][8];
    private final String[][] pecas = new String[8][8];

    private int selecR = -1;
    private int selecC = -1;
    
    // Estado da rede gRPC
    private boolean conectado = false;
    private boolean ehJogadorBranco;
    private boolean minhaVez = false;
    
    private ManagedChannel channel;
    private CheckersGameGrpc.CheckersGameStub asyncStub;
    private StreamObserver<GameMessage> requestObserver;

    public CheckersClient() {
        super("Damas Online - Cliente gRPC");
        setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        
        mainPanel = new JPanel(new BorderLayout(10, 10));
        tabuleiroPanel = new JPanel(new GridLayout(8, 8));

        // Painel de rede no topo
        JPanel painelRede = criarPainelRede();
        mainPanel.add(painelRede, BorderLayout.NORTH);

        mainPanel.add(tabuleiroPanel, BorderLayout.CENTER);
        
        // Painel de status na parte inferior
        JPanel painelStatus = new JPanel(new FlowLayout(FlowLayout.CENTER));
        painelStatus.setBackground(new Color(40, 40, 40));
        turnoLabel = new JLabel("Aguardando conexão...");
        turnoLabel.setForeground(Color.WHITE);
        turnoLabel.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 16));
        painelStatus.add(turnoLabel);
        mainPanel.add(painelStatus, BorderLayout.SOUTH);
        
        setContentPane(mainPanel);
        inicializarTabuleiro();
        desenharTabuleiro();
        
        setSize(700, 800);
        setLocationRelativeTo(null);
        
        // Listener para fechar conexão ao sair
        addWindowListener(new java.awt.event.WindowAdapter() {
            @Override
            public void windowClosing(java.awt.event.WindowEvent e) {
                desconectar();
            }
        });
    }

    private JPanel criarPainelRede() {
        JPanel painel = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 10));
        painel.setBackground(new Color(60, 0, 90));

        JLabel ipLabel = new JLabel("Servidor:");
        ipLabel.setForeground(Color.WHITE);
        ipLabel.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 12));

        ipTextField = new JTextField("localhost", 10);
        ipTextField.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 12));

        JLabel portLabel = new JLabel("Porta:");
        portLabel.setForeground(Color.WHITE);
        portLabel.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 12));

        portTextField = new JTextField("50051", 5);
        portTextField.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 12));

        JLabel nomeLabel = new JLabel("Nome:");
        nomeLabel.setForeground(Color.WHITE);
        nomeLabel.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 12));

        nomeTextField = new JTextField("Jogador", 10);
        nomeTextField.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 12));

        conectarButton = new JButton("Conectar");
        conectarButton.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 12));
        conectarButton.addActionListener(e -> conectarAoServidor());

        statusLabel = new JLabel("Status: Desconectado");
        statusLabel.setForeground(Color.RED);
        statusLabel.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 12));

        painel.add(ipLabel);
        painel.add(ipTextField);
        painel.add(portLabel);
        painel.add(portTextField);
        painel.add(nomeLabel);
        painel.add(nomeTextField);
        painel.add(conectarButton);
        painel.add(statusLabel);

        return painel;
    }

    private void inicializarTabuleiro() {
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                pecas[r][c] = "";
                if ((r + c) % 2 == 1) {
                    if (r < 3) pecas[r][c] = "⚫";
                    if (r > 4) pecas[r][c] = "⚪";
                }
            }
        }
    }

    private String getIconePeca(String peca) {
        if (peca.equals("⚪D")) return "♕";
        if (peca.equals("⚫D")) return "♛";
        if (peca.equals("⚪")) return "\u25CB";
        if (peca.equals("⚫")) return "\u25CF";
        return "";
    }

    private Color getCorForeground(String peca) {
        if (peca.contains("⚪")) return Color.WHITE;
        if (peca.contains("⚫")) return Color.BLACK;
        return Color.BLACK;
    }

    private void desenharTabuleiro() {
        final Color corClara = Color.WHITE;
        final Color corEscura = new Color(139, 69, 19);

        tabuleiroPanel.removeAll();
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                String peca = pecas[r][c];
                String icone = getIconePeca(peca);

                JButton casa = new JButton(icone);
                casa.setForeground(getCorForeground(peca));

                int fontSize = peca.contains("D") ? 30 : 24;
                casa.setFont(new Font("Segoe UI Emoji", Font.BOLD, fontSize));

                Color corFundo = (r + c) % 2 == 0 ? corClara : corEscura;
                if (r == selecR && c == selecC) {
                    corFundo = Color.YELLOW;
                }

                casa.setBackground(corFundo);
                casa.setBorderPainted(false);
                casa.setFocusPainted(false);

                int finalR = r;
                int finalC = c;
                casa.addActionListener(e -> cliqueCasa(finalR, finalC));
                casas[r][c] = casa;
                tabuleiroPanel.add(casa);
            }
        }
        tabuleiroPanel.revalidate();
        tabuleiroPanel.repaint();
    }

    private void cliqueCasa(int r, int c) {
        System.out.println("[CLIENTE] Clique em (" + r + "," + c + ") - conectado=" + conectado + " minhaVez=" + minhaVez);
        
        if (!conectado || !minhaVez) {
            if (conectado) {
                JOptionPane.showMessageDialog(this, "Não é sua vez!");
            }
            return;
        }
        
        // Desmarca visualmente a peça anterior
        if (selecR != -1) {
            Color corFundo = (selecR + selecC) % 2 == 0 ? Color.WHITE : new Color(139, 69, 19);
            casas[selecR][selecC].setBackground(corFundo);
        }

        if (selecR == -1 && !pecas[r][c].isEmpty()) {
            boolean ehBranca = pecas[r][c].contains("⚪");
            if (ehBranca == ehJogadorBranco) {
                List<int[]> todasCapturas = encontrarTodasCapturas(ehJogadorBranco);
                boolean deveCapturar = !todasCapturas.isEmpty();

                List<int[]> capturasDaPeca = movimentosDeCaptura(pecas[r][c], r, c);
                boolean estaPecaPodeCapturar = !capturasDaPeca.isEmpty();

                if (!deveCapturar || estaPecaPodeCapturar) {
                    selecR = r;
                    selecC = c;
                    casas[r][c].setBackground(Color.YELLOW);
                } else {
                    JOptionPane.showMessageDialog(this, "Você deve mover a peça que pode capturar!");
                }
            } else {
                JOptionPane.showMessageDialog(this, "Esta peça não é sua!");
            }
            return;
        }

        if (selecR != -1) {
            enviarMovimento(selecR, selecC, r, c);
            selecR = -1;
            selecC = -1;
        }
    }

    private List<int[]> encontrarTodasCapturas(boolean ehBranca) {
        List<int[]> todasCapturas = new ArrayList<>();
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                String peca = pecas[r][c];
                if (!peca.isEmpty() && peca.contains("⚪") == ehBranca) {
                    todasCapturas.addAll(movimentosDeCaptura(peca, r, c));
                }
            }
        }
        return todasCapturas;
    }

    private List<int[]> movimentosDeCaptura(String peca, int r, int c) {
        List<int[]> moves = new ArrayList<>();
        if (peca.isEmpty()) return moves;

        boolean ehDama = peca.contains("D");
        boolean ehBranca = peca.contains("⚪");
        int[] dirs = {-1, 1};

        for (int dr : dirs) {
            for (int dc : dirs) {
                if (ehDama) {
                    int rr = r + dr;
                    int cc = c + dc;
                    boolean inimigoEncontrado = false;

                    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
                        if (!pecas[rr][cc].isEmpty()) {
                            boolean mesmaColor = pecas[rr][cc].contains("⚪") == ehBranca;
                            if (mesmaColor || inimigoEncontrado) break;
                            inimigoEncontrado = true;
                        } else if (inimigoEncontrado) {
                            moves.add(new int[]{rr, cc});
                        }
                        rr += dr;
                        cc += dc;
                    }
                } else {
                    int rm = r + dr;
                    int cm = c + dc;
                    int r2 = r + 2 * dr;
                    int c2 = c + 2 * dc;

                    if (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8) {
                        boolean temInimigo = !pecas[rm][cm].isEmpty() &&
                                pecas[rm][cm].contains("⚪") != ehBranca;
                        boolean casaVazia = pecas[r2][c2].isEmpty();
                        
                        if (temInimigo && casaVazia) {
                            moves.add(new int[]{r2, c2});
                        }
                    }
                }
            }
        }
        return moves;
    }
    
    // ==================== MÉTODOS gRPC ====================
    
    private void conectarAoServidor() {
        if (conectado) {
            JOptionPane.showMessageDialog(this, "Você já está conectado!");
            return;
        }
        
        String serverHost = ipTextField.getText().trim();
        String serverPort = portTextField.getText().trim();
        String nomeJogador = nomeTextField.getText().trim();
        
        if (serverHost.isEmpty() || serverPort.isEmpty()) {
            JOptionPane.showMessageDialog(this, "Digite o endereço do servidor!");
            return;
        }
        
        if (nomeJogador.isEmpty()) {
            JOptionPane.showMessageDialog(this, "Digite seu nome!");
            return;
        }
        
        conectarButton.setEnabled(false);
        statusLabel.setText("Conectando...");
        statusLabel.setForeground(Color.YELLOW);
        
        new Thread(() -> {
            try {
                // Cria o canal gRPC
                channel = ManagedChannelBuilder.forAddress(serverHost, Integer.parseInt(serverPort))
                        .usePlaintext()
                        .build();
                
                asyncStub = CheckersGameGrpc.newStub(channel);
                
                // Cria o observer para receber mensagens do servidor
                StreamObserver<GameMessage> responseObserver = new StreamObserver<GameMessage>() {
                    @Override
                    public void onNext(GameMessage message) {
                        processarMensagem(message);
                    }

                    @Override
                    public void onError(Throwable t) {
                        System.err.println("[CLIENTE] Erro: " + t.getMessage());
                        SwingUtilities.invokeLater(() -> {
                            statusLabel.setText("Erro na conexão!");
                            statusLabel.setForeground(Color.RED);
                            JOptionPane.showMessageDialog(CheckersClient.this, 
                                "Erro na conexão: " + t.getMessage());
                            desconectar();
                        });
                    }

                    @Override
                    public void onCompleted() {
                        System.out.println("[CLIENTE] Conexão encerrada pelo servidor");
                        SwingUtilities.invokeLater(() -> desconectar());
                    }
                };
                
                // Inicia o stream bidirecional
                requestObserver = asyncStub.playGame(responseObserver);
                
                conectado = true;
                
                SwingUtilities.invokeLater(() -> {
                    statusLabel.setText("Conectado!");
                    statusLabel.setForeground(Color.GREEN);
                    turnoLabel.setText(AGUARDANDO_OPONENTE);
                    ipTextField.setEnabled(false);
                    portTextField.setEnabled(false);
                    nomeTextField.setEnabled(false);
                });
                
                // Envia primeira mensagem (inicializa jogador no servidor)
                requestObserver.onNext(GameMessage.newBuilder()
                    .setWaiting(WaitingForPlayer.newBuilder()
                        .setMessage("Conectando...")
                        .build())
                    .build());
                
            } catch (Exception e) {
                e.printStackTrace();
                SwingUtilities.invokeLater(() -> {
                    statusLabel.setText("Erro na conexão!");
                    statusLabel.setForeground(Color.RED);
                    conectarButton.setEnabled(true);
                    JOptionPane.showMessageDialog(CheckersClient.this, 
                        "Não foi possível conectar ao servidor!\n" + e.getMessage());
                });
            }
        }).start();
    }
    
    private void processarMensagem(GameMessage message) {
        System.out.println("[CLIENTE] Mensagem recebida: " + message.getMessageCase());
        
        switch (message.getMessageCase()) {
            case WAITING:
                SwingUtilities.invokeLater(() -> 
                    turnoLabel.setText(AGUARDANDO_OPONENTE));
                break;
                
            case START:
                GameStart start = message.getStart();
                ehJogadorBranco = (start.getYourColor() == GameStart.Color.WHITE);
                minhaVez = ehJogadorBranco; // Brancas começam
                
                SwingUtilities.invokeLater(() -> {
                    String cor = ehJogadorBranco ? "BRANCAS (⚪)" : "PRETAS (⚫)";
                    turnoLabel.setText("Você joga com: " + cor + " | Oponente: " + start.getOpponentName());
                    System.out.println("[CLIENTE] Sou jogador: " + (ehJogadorBranco ? "BRANCO" : "PRETO"));
                });
                break;
                
            case YOUR_TURN:
                System.out.println("[CLIENTE] *** RECEBEU YOUR_TURN ***");
                minhaVez = true;
                SwingUtilities.invokeLater(() -> {
                    turnoLabel.setText("SUA VEZ!");
                    turnoLabel.setForeground(Color.GREEN);
                });
                break;
                
            case MOVE_RESULT:
                MoveResult result = message.getMoveResult();
                if (!result.getValid()) {
                    minhaVez = true;
                    SwingUtilities.invokeLater(() -> {
                        JOptionPane.showMessageDialog(CheckersClient.this, 
                            "Movimento inválido: " + result.getMessage());
                        desenharTabuleiro();
                    });
                }
                break;
                
            case OPPONENT_MOVE:
                OpponentMove opMove = message.getOpponentMove();
                System.out.println("[CLIENTE] *** RECEBEU OPPONENT_MOVE ***");
                minhaVez = false;
                
                SwingUtilities.invokeLater(() -> {
                    aplicarMovimento(opMove.getFromRow(), opMove.getFromCol(),
                                   opMove.getToRow(), opMove.getToCol());
                    turnoLabel.setText(AGUARDANDO_OPONENTE);
                    turnoLabel.setForeground(Color.WHITE);
                });
                break;
                
            case GAME_OVER:
                GameOver gameOver = message.getGameOver();
                SwingUtilities.invokeLater(() -> {
                    turnoLabel.setText("Jogo Finalizado!");
                    JOptionPane.showMessageDialog(CheckersClient.this, 
                        "Fim de Jogo!\n" + gameOver.getReason());
                    desconectar();
                });
                break;
                
            case ERROR:
                ErrorMessage error = message.getError();
                SwingUtilities.invokeLater(() -> 
                    JOptionPane.showMessageDialog(CheckersClient.this, 
                        "Erro: " + error.getError()));
                break;
                
            default:
                System.out.println("[CLIENTE] Mensagem não reconhecida");
                break;
        }
    }
    
    private void enviarMovimento(int r1, int c1, int r2, int c2) {
        if (requestObserver != null) {
            System.out.println("[CLIENTE] Enviando movimento: (" + r1 + "," + c1 + ") -> (" + r2 + "," + c2 + ")");
            
            Move move = Move.newBuilder()
                .setFromRow(r1)
                .setFromCol(c1)
                .setToRow(r2)
                .setToCol(c2)
                .build();
            
            GameMessage message = GameMessage.newBuilder()
                .setMove(move)
                .build();
            
            requestObserver.onNext(message);
        }
    }
    
    private void aplicarMovimento(int r1, int c1, int r2, int c2) {
        int dr = r2 - r1;
        int dc = c2 - c1;
        
        // Captura peça(s) no caminho
        if (Math.abs(dr) >= 2) {
            int stepR = Integer.signum(dr);
            int stepC = Integer.signum(dc);
            
            for (int i = 1; i < Math.abs(dr); i++) {
                int rr = r1 + i * stepR;
                int cc = c1 + i * stepC;
                if (!pecas[rr][cc].isEmpty()) {
                    pecas[rr][cc] = "";
                }
            }
        }
        
        // Move a peça
        pecas[r2][c2] = pecas[r1][c1];
        pecas[r1][c1] = "";
        
        // Promove a dama
        if (pecas[r2][c2].equals("⚪") && r2 == 0) pecas[r2][c2] = "⚪D";
        if (pecas[r2][c2].equals("⚫") && r2 == 7) pecas[r2][c2] = "⚫D";
        
        desenharTabuleiro();
    }
    
    private void desconectar() {
        conectado = false;
        minhaVez = false;
        
        try {
            if (requestObserver != null) {
                requestObserver.onCompleted();
            }
            if (channel != null && !channel.isShutdown()) {
                channel.shutdown();
                channel.awaitTermination(5, TimeUnit.SECONDS);
            }
        } catch (Exception e) {
            System.err.println("[CLIENTE] Erro ao desconectar: " + e.getMessage());
        }
        
        statusLabel.setText("Desconectado");
        statusLabel.setForeground(Color.RED);
        turnoLabel.setText("Desconectado");
        conectarButton.setEnabled(true);
        ipTextField.setEnabled(true);
        portTextField.setEnabled(true);
        nomeTextField.setEnabled(true);
    }
    
    public static void main(String[] args) {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception e) {
            e.printStackTrace();
        }

        SwingUtilities.invokeLater(() -> {
            CheckersClient client = new CheckersClient();
            client.setVisible(true);
        });
    }
}
