# Chess Wagering App 🏆♟️

A real-time multiplayer chess application where players can wager virtual coins on matches. Winner takes 90% of the pot, with a 10% platform fee.

## Features

- ♟️ **Real-Time Chess**: Live 1v1 matches with instant move synchronization
- 💰 **Wagering System**: Bet virtual coins on your games
- ⚡ **Instant Payouts**: Winners get 90% of the pot immediately
- 🎨 **Premium Dark UI**: Beautiful glassmorphism design with chess theme
- 🚀 **No Authentication**: Just enter a username and play!

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Chess Engine**: chess.js, react-chessboard
- **Backend**: Node.js, Express.js, Socket.io v4
- **Database**: PostgreSQL with Prisma ORM

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Docker Desktop (for PostgreSQL)

### Installation

1. **Clone and navigate to the project**
   ```bash
   cd DagiTest
   ```

2. **Start PostgreSQL**
   ```bash
   docker-compose up -d
   ```

3. **Set up Backend**
   ```bash
   cd backend
   npm install
   npx prisma db push
   npm run dev
   ```
   Backend will run on `http://localhost:3001`

4. **Set up Frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend will run on `http://localhost:3000`

5. **Open your browser**
   - Go to `http://localhost:3000`
   - Enter a username
   - Start playing!

## How to Play

1. **Enter Username**: On the landing page, enter your username to get 1000 coins
2. **Create or Join Game**: 
   - Create a new game by setting your wager (minimum 10 coins)
   - Or join an existing game from the lobby
3. **Play Chess**: Make moves by dragging and dropping pieces
4. **Win Coins**: Checkmate your opponent to win 90% of the pot!

## Deployment

### Deploy to Vercel (Frontend)

```bash
cd frontend
vercel deploy
```

### Deploy Backend (Railway/Render)

1. Create a new Web Service
2. Connect your GitHub repository
3. Set environment variables:
   ```
   DATABASE_URL=your_postgres_url
   FRONTEND_URL=your_vercel_url
   PORT=3001
   ```
4. Deploy!

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_BACKEND_URL="http://localhost:3001"
```

## Game Rules

- Each player starts with 1000 virtual coins
- Minimum wager: 10 coins
- Maximum wager: Your current balance
- Winner receives: 90% of total pot (wager × 2 × 0.9)
- Platform fee: 10% of total pot
- Draws/Stalemates: Both players get their wagers refunded
- Disconnection: Both players get wagers refunded

## Project Structure

```
DagiTest/
├── frontend/                # Next.js frontend
│   ├── app/
│   │   ├── page.tsx        # Landing page with username entry
│   │   ├── lobby/          # Game lobby
│   │   └── game/[id]/      # Active game board
│   └── ...
├── backend/                 # Express backend
│   ├── src/
│   │   ├── server.ts       # Express + Socket.io server
│   │   └── socket/         # Socket event handlers
│   └── prisma/
│       └── schema.prisma   # Database schema
└── docker-compose.yml      # PostgreSQL setup
```

## Testing with a Friend

1. Deploy the app to Vercel + Railway/Render
2. Share the link with your friend
3. Both enter different usernames
4. One creates a game, the other joins
5. Play and have fun!

## License

MIT
