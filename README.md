# 🐛 Bugbl.io

> **Real-time multiplayer draw & guess game — but make it dev-themed.**

Like skribbl.io but for developers. Draw recursion, guess "null pointer", argue about whether Docker is unkillable. 200+ tech words across 6 categories.

![TypeScript](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socket.io)

---

## 🚀 Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Start both server and client
npm run dev
```

- **Frontend** → http://localhost:5173  
- **Backend**  → http://localhost:3001  
- **Stats API** → http://localhost:3001/api/stats

---

## 📁 Structure

```
bugbl/
├── server/            # Node.js + Express + Socket.io backend
│   ├── game/
│   │   ├── GameManager.js   # Room lifecycle, matchmaking
│   │   ├── Room.js          # State machine (WAITING→DRAWING→GAME_OVER)
│   │   └── Player.js        # Player model
│   ├── words/
│   │   └── wordList.js      # 200+ dev-themed words
│   ├── socket/
│   │   ├── handlers.js      # All socket event handlers
│   │   └── rateLimiter.js   # Per-socket rate limiting
│   └── index.js             # Server entry + cluster mode
└── client/            # React + Vite frontend
    └── src/
        ├── components/  Canvas, Chat, Toolbar, Timer, PlayerList…
        ├── context/     GameContext (central state + socket)
        └── utils/       socket.js singleton
```

---

## ⚙️ Environment Variables

```env
PORT=3001
CLIENT_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379   # Optional — enables horizontal scaling
NODE_ENV=development
ENABLE_CLUSTER=false               # Set true in production
NUM_WORKERS=4                      # Defaults to CPU core count
```

---

## 🏗️ Scalability

| Feature | Detail |
|---------|--------|
| **Redis Adapter** | Socket.io rooms shared across N processes via pub/sub |
| **Cluster Mode** | `ENABLE_CLUSTER=true` forks 1 worker per CPU core |
| **Rate Limiting** | Draw: 60/s · Chat: 1/s · Clear: 2/s per socket |
| **Batched Drawing** | Strokes batched in 16ms windows (~60fps), not pixel streams |
| **Room Cleanup** | Idle rooms auto-destroyed after 5 min, empty rooms immediately |
| **Compression** | `perMessageDeflate` on all WebSocket frames |

---

## 🎮 Word Categories

- **Programming Concepts** — recursion, closure, async/await, prototype…
- **Bugs & Issues** — null pointer, race condition, memory leak, segfault…
- **Tools** — Docker, Git, Kubernetes, VS Code, Postman…
- **Languages** — JavaScript, Rust, Go, TypeScript, Python…
- **Dev Slang** — merge conflict, yak shaving, hotfix, LGTM, WIP…
- **System Design** — load balancer, CDN, circuit breaker, CQRS…

---

## 🛠️ Production Deployment

```bash
# Build the frontend
npm run build

# Start server (serves client static files too)
NODE_ENV=production ENABLE_CLUSTER=true npm start
```

Add your Redis URL and set `ENABLE_CLUSTER=true` to scale horizontally across multiple cores or machines.
