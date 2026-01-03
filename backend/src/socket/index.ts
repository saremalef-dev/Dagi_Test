import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { Chess } from 'chess.js';

// In-memory storage for user balances and active game sessions
const userBalances = new Map<string, number>(); // socketId -> balance
const userNames = new Map<string, string>(); // socketId -> username
const gameRooms = new Map<string, GameRoom>(); // gameId -> GameRoom

interface GameRoom {
  gameId: string;
  whitePlayer: { socketId: string; username: string };
  blackPlayer: { socketId: string; username: string } | null;
  wager: number;
  chess: Chess;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
}

export function initializeSocketHandlers(io: Server, prisma: PrismaClient) {
  io.on('connection', (socket: Socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // Set initial balance for new connections
    socket.on('set-username', (username: string) => {
      userNames.set(socket.id, username);
      userBalances.set(socket.id, 1000); // Start with 1000 coins
      socket.emit('balance-updated', { balance: 1000 });
      console.log(`👤 User ${username} initialized with 1000 coins`);
    });

    // Create a new game
    socket.on('create-game', async (data: { wager: number }) => {
      const { wager } = data;
      const username = userNames.get(socket.id);
      const balance = userBalances.get(socket.id) || 0;

      if (!username) {
        socket.emit('error', { message: 'Please set username first' });
        return;
      }

      if (wager < 10) {
        socket.emit('error', { message: 'Minimum wager is 10 coins' });
        return;
      }

      if (balance < wager) {
        socket.emit('error', { message: 'Insufficient balance' });
        return;
      }

      try {
        // Deduct wager from balance
        userBalances.set(socket.id, balance - wager);
        socket.emit('balance-updated', { balance: balance - wager });

        // Create game in database
        const game = await prisma.game.create({
          data: {
            whitePlayerName: username,
            wager,
            status: 'WAITING'
          }
        });

        // Create game room
        const gameRoom: GameRoom = {
          gameId: game.id,
          whitePlayer: { socketId: socket.id, username },
          blackPlayer: null,
          wager,
          chess: new Chess(),
          status: 'WAITING'
        };

        gameRooms.set(game.id, gameRoom);
        socket.join(game.id);

        socket.emit('game-created', { gameId: game.id, game: gameRoom });
        io.emit('games-updated'); // Notify all clients to refresh game list

        console.log(`🎮 Game ${game.id} created by ${username} with wager ${wager}`);
      } catch (error) {
        console.error('Error creating game:', error);
        // Refund wager on error
        userBalances.set(socket.id, balance);
        socket.emit('balance-updated', { balance });
        socket.emit('error', { message: 'Failed to create game' });
      }
    });

    // Join an existing game
    socket.on('join-game', async (data: { gameId: string }) => {
      const { gameId } = data;
      const gameRoom = gameRooms.get(gameId);
      const username = userNames.get(socket.id);
      const balance = userBalances.get(socket.id) || 0;

      if (!username) {
        socket.emit('error', { message: 'Please set username first' });
        return;
      }

      if (!gameRoom || gameRoom.status !== 'WAITING') {
        socket.emit('error', { message: 'Game not available' });
        return;
      }

      if (gameRoom.whitePlayer.socketId === socket.id) {
        socket.emit('error', { message: 'Cannot play against yourself' });
        return;
      }

      if (balance < gameRoom.wager) {
        socket.emit('error', { message: 'Insufficient balance' });
        return;
      }

      try {
        // Deduct wager from balance
        userBalances.set(socket.id, balance - gameRoom.wager);
        socket.emit('balance-updated', { balance: balance - gameRoom.wager });

        // Update game room and database
        gameRoom.blackPlayer = { socketId: socket.id, username };
        gameRoom.status = 'ACTIVE';

        await prisma.game.update({
          where: { id: gameId },
          data: {
            blackPlayerName: username,
            status: 'ACTIVE'
          }
        });

        socket.join(gameId);

        // Notify both players that the game has started
        io.to(gameId).emit('game-started', {
          gameId,
          whitePlayer: gameRoom.whitePlayer.username,
          blackPlayer: gameRoom.blackPlayer.username,
          wager: gameRoom.wager,
          fen: gameRoom.chess.fen()
        });

        io.emit('games-updated'); // Notify all clients to refresh game list

        console.log(`🎮 Game ${gameId} started: ${gameRoom.whitePlayer.username} vs ${username}`);
      } catch (error) {
        console.error('Error joining game:', error);
        // Refund wager on error
        userBalances.set(socket.id, balance);
        socket.emit('balance-updated', { balance });
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // Make a move
    socket.on('make-move', async (data: { gameId: string; move: any }) => {
      const { gameId, move } = data;
      const gameRoom = gameRooms.get(gameId);

      if (!gameRoom || gameRoom.status !== 'ACTIVE') {
        socket.emit('error', { message: 'Game not active' });
        return;
      }

      // Verify it's the player's turn
      const isWhiteTurn = gameRoom.chess.turn() === 'w';
      const isWhitePlayer = socket.id === gameRoom.whitePlayer.socketId;
      const isBlackPlayer = socket.id === gameRoom.blackPlayer?.socketId;

      if ((isWhiteTurn && !isWhitePlayer) || (!isWhiteTurn && !isBlackPlayer)) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      try {
        // Attempt the move
        const result = gameRoom.chess.move(move);

        if (!result) {
          socket.emit('error', { message: 'Invalid move' });
          return;
        }

        // Broadcast move to both players
        io.to(gameId).emit('move-made', {
          move: result,
          fen: gameRoom.chess.fen(),
          turn: gameRoom.chess.turn()
        });

        // Check if game is over
        if (gameRoom.chess.isGameOver()) {
          await handleGameOver(gameRoom, prisma, io);
        } else {
          // Update moves in database
          const moves = gameRoom.chess.history({ verbose: true });
          await prisma.game.update({
            where: { id: gameId },
            data: { moves: JSON.parse(JSON.stringify(moves)) }
          });
        }
      } catch (error) {
        console.error('Error making move:', error);
        socket.emit('error', { message: 'Failed to make move' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);

      // Find and handle any active games
      for (const [gameId, gameRoom] of gameRooms.entries()) {
        if (
          gameRoom.status === 'ACTIVE' &&
          (gameRoom.whitePlayer.socketId === socket.id ||
            gameRoom.blackPlayer?.socketId === socket.id)
        ) {
          // Refund both players
          const whiteBalance = userBalances.get(gameRoom.whitePlayer.socketId) || 0;
          const blackBalance = userBalances.get(gameRoom.blackPlayer!.socketId) || 0;

          userBalances.set(gameRoom.whitePlayer.socketId, whiteBalance + gameRoom.wager);
          userBalances.set(gameRoom.blackPlayer!.socketId, blackBalance + gameRoom.wager);

          // Notify remaining player
          io.to(gameId).emit('player-disconnected', {
            message: 'Opponent disconnected. Wagers refunded.'
          });

          // Update game status
          prisma.game.update({
            where: { id: gameId },
            data: { status: 'ABANDONED' }
          }).catch(console.error);

          gameRooms.delete(gameId);
        } else if (gameRoom.status === 'WAITING' && gameRoom.whitePlayer.socketId === socket.id) {
          // Refund waiting player
          const balance = userBalances.get(socket.id) || 0;
          userBalances.set(socket.id, balance + gameRoom.wager);

          prisma.game.update({
            where: { id: gameId },
            data: { status: 'ABANDONED' }
          }).catch(console.error);

          gameRooms.delete(gameId);
        }
      }

      userBalances.delete(socket.id);
      userNames.delete(socket.id);
    });
  });
}

async function handleGameOver(gameRoom: GameRoom, prisma: PrismaClient, io: Server) {
  gameRoom.status = 'COMPLETED';

  const totalPot = gameRoom.wager * 2;
  const platformFee = Math.floor(totalPot * 0.1); // 10% fee
  const winnerPayout = totalPot - platformFee; // 90% to winner

  let winnerName: string | null = null;
  let winnerSocketId: string | null = null;

  if (gameRoom.chess.isCheckmate()) {
    // Winner is the player who just moved
    const winner = gameRoom.chess.turn() === 'w' ? 'black' : 'white';
    winnerName = winner === 'white' ? gameRoom.whitePlayer.username : gameRoom.blackPlayer!.username;
    winnerSocketId = winner === 'white' ? gameRoom.whitePlayer.socketId : gameRoom.blackPlayer!.socketId;
  }
  // For stalemate or draw, refund both players
  else if (gameRoom.chess.isStalemate() || gameRoom.chess.isDraw()) {
    const whiteBalance = userBalances.get(gameRoom.whitePlayer.socketId) || 0;
    const blackBalance = userBalances.get(gameRoom.blackPlayer!.socketId) || 0;

    userBalances.set(gameRoom.whitePlayer.socketId, whiteBalance + gameRoom.wager);
    userBalances.set(gameRoom.blackPlayer!.socketId, blackBalance + gameRoom.wager);

    io.to(gameRoom.gameId).emit('game-over', {
      result: 'draw',
      reason: gameRoom.chess.isStalemate() ? 'Stalemate' : 'Draw',
      whiteBalance: whiteBalance + gameRoom.wager,
      blackBalance: blackBalance + gameRoom.wager
    });

    await prisma.game.update({
      where: { id: gameRoom.gameId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    gameRooms.delete(gameRoom.gameId);
    return;
  }

  // Pay winner
  if (winnerSocketId && winnerName) {
    const winnerBalance = userBalances.get(winnerSocketId) || 0;
    userBalances.set(winnerSocketId, winnerBalance + winnerPayout);

    const whiteBalance = userBalances.get(gameRoom.whitePlayer.socketId) || 0;
    const blackBalance = userBalances.get(gameRoom.blackPlayer!.socketId) || 0;

    io.to(gameRoom.gameId).emit('game-over', {
      result: 'checkmate',
      winner: winnerName,
      payout: winnerPayout,
      platformFee,
      whiteBalance,
      blackBalance
    });

    // Update database
    await prisma.game.update({
      where: { id: gameRoom.gameId },
      data: {
        status: 'COMPLETED',
        winnerName,
        platformFee,
        completedAt: new Date(),
        moves: JSON.parse(JSON.stringify(gameRoom.chess.history({ verbose: true })))
      }
    });

    console.log(`🏆 Game ${gameRoom.gameId} won by ${winnerName}. Payout: ${winnerPayout} coins`);
  }

  gameRooms.delete(gameRoom.gameId);
  io.emit('games-updated');
}
