const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./db/database');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Раздаём статические файлы фронтенда
app.use(express.static(path.join(__dirname, '../frontend')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('player_online', (name) => {
    const p = db.ensurePlayer(name);
    db.state.online.add(name);
    io.emit('players_update');
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/players', require('./routes/players'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/actions', require('./routes/actions'));
app.use('/api/duels', require('./routes/duels'));

// Отдаём index.html если открыли корень
app.get('/', (_, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server on', PORT));