
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db/database');

const authRoutes = require('./routes/auth');
const playersRoutes = require('./routes/players');
const cardsRoutes = require('./routes/cards');
const duelsRoutes = require('./routes/duels');
const actionsRoutes = require('./routes/actions');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*', methods: ['GET','POST'] }});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/static', express.static(path.join(__dirname, '../static')));

db.init();
app.set('io', io);

app.use('/api/auth', authRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/duels', duelsRoutes);
app.use('/api/actions', actionsRoutes);

io.on('connection', (socket) => {
  socket.on('player_online', (playerName) => {
    db.setPlayerOnline(playerName, socket.id);
    io.emit('players_update', db.getOnlinePlayers());
    io.emit('game_log', { message: playerName + ' присоединился к игре', timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    const player = db.getPlayerBySocketId(socket.id);
    if (player) {
      db.setPlayerOffline(player.name);
      io.emit('players_update', db.getOnlinePlayers());
      io.emit('game_log', { message: player.name + ' покинул игру', timestamp: Date.now() });
    }
  });

  // ⚔️ ДУЭЛЬ: обработка вызова
  socket.on('duel:request', ({ challenger, opponent }) => {
    io.emit('game_log', {
      message: `${challenger} вызвал ${opponent} на дуэль! ⚔️`,
      timestamp: Date.now()
    });

    // Через 2 секунды определяем победителя
    setTimeout(() => {
      const winner = Math.random() > 0.5 ? challenger : opponent;
      const loser = winner === challenger ? opponent : challenger;

      io.emit('game_log', {
        message: `🏆 ${winner} победил в дуэли против ${loser}!`,
        timestamp: Date.now()
      });

      // Событие для обновления интерфейса
      io.emit('duel:result', { winner, loser });
    }, 2000);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('v2 running http://localhost:' + PORT));
