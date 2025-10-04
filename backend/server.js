// Duel Game v7.0 Server - Modular Architecture
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const cors = require('cors');
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

// Импортируем модули
const { randomCoupons } = require('./cards');
const { 
  maxHealthForLevel, 
  levelUpIfNeeded, 
  applyDamage, 
  healPlayer,
  calculateShot,
  ensureDuelQuota 
} = require('./game-logic');
const { 
  createTask, 
  getTasksForPlayer, 
  getTasksByInitiator,
  removeTask,
  clearAllTasks 
} = require('./tasks');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Static files
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const FRONT_DIR = path.join(__dirname, '..', 'frontend');
app.use('/avatars', express.static(path.join(PUBLIC_DIR, 'avatars')));
app.use('/', express.static(FRONT_DIR));

// Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(PUBLIC_DIR, 'avatars')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, 'avt_' + Date.now() + ext);
  }
});
const upload = multer({ storage });

// In-memory state
let players = [];
let logs = [];
let healerTasks = [];
let dealerRequests = [];
let bartenderTasks = [];
const activeDuels = new Map();

// Helper functions
function pushLog(text) {
  logs.push({ text, ts: Date.now() });
  if (logs.length > 500) logs = logs.slice(-500);
  io.emit('logs_update');
}

function getOrCreatePlayer(name) {
  let p = players.find(x => x.name === name);
  if (!p) {
    const maxHealth = 100;
    p = {
      name,
      avatar: null,
      level: 1,
      experience: 0,
      health: maxHealth,
      max_health: maxHealth,
      hand: [
        // Стартовые купоны на коктейли
        { 
          uid: nanoid(), 
          code: 'request_cocktail', 
          name: '🍸 Запрос коктейля', 
          type: 'bartender_request', 
          scope: 'self',
          description: 'Запросить коктейль у бармена' 
        },
        { 
          uid: nanoid(), 
          code: 'request_cocktail', 
          name: '🍸 Запрос коктейля', 
          type: 'bartender_request', 
          scope: 'self',
          description: 'Запросить коктейль у бармена' 
        }
      ],
      is_admin: false,
      is_healer: false,
      is_bartender: false,
      can_give_cards: false,
      is_reward_master: false,
      unconscious: false,
      silencedUntil: 0,
      duelQuota: { total: 3, used: 0, ts: Date.now() },
      online: true,
    };
    players.push(p);
  }
  return p;
}

function recalcAdmin(p) {
  p.is_admin = /admin$/i.test(p.name);
}

// Auth
app.post('/api/auth/login', (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string') return res.json({ error: 'Введите имя' });
  const p = getOrCreatePlayer(name.trim());
  recalcAdmin(p);
  p.online = true;
  pushLog(`${p.name} вошёл в игру`);
  io.emit('players_update');
  res.json({ ok: true, player: p });
});

app.get('/api/auth/me/:name', (req, res) => {
  const p = players.find(x => x.name === req.params.name);
  if (!p) return res.json({ error: 'Игрок не найден' });
  res.json(p);
});

// Players
app.get('/api/players/online', (req, res) => {
  res.json(players.filter(p => p.online));
});

app.get('/api/players/logs', (req, res) => {
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
  res.json(logs.slice(-limit));
});

app.post('/api/players/avatar', upload.single('avatar'), (req, res) => {
  const { playerName } = req.body || {};
  const p = players.find(x => x.name === playerName);
  if (!p) return res.json({ error: 'Игрок не найден' });
  if (!req.file) return res.json({ error: 'Файл не получен' });
  p.avatar = '/avatars/' + req.file.filename;
  pushLog(`${p.name} обновил аватар`);
  io.emit('player_updated', { name: p.name });
  res.json({ ok: true, player: p });
});

// Admin role toggles
app.post('/api/players/setHealer', (req, res) => {
  const { adminName, targetName, isHealer } = req.body || {};
  const admin = players.find(p => p.name === adminName && p.is_admin);
  if (!admin) return res.json({ error: 'Нет прав' });
  const target = players.find(p => p.name === targetName);
  if (!target) return res.json({ error: 'Игрок не найден' });
  target.is_healer = !!isHealer;
  pushLog(`${admin.name} ${isHealer ? 'назначил' : 'снял'} целителя: ${target.name}`);
  io.emit('players_update');
  res.json({ ok: true });
});

app.post('/api/players/setBartender', (req, res) => {
  const { adminName, targetName, isBartender } = req.body || {};
  const admin = players.find(p => p.name === adminName && p.is_admin);
  if (!admin) return res.json({ error: 'Нет прав' });
  const target = players.find(p => p.name === targetName);
  if (!target) return res.json({ error: 'Игрок не найден' });
  target.is_bartender = !!isBartender;
  pushLog(`${admin.name} ${isBartender ? 'назначил' : 'снял'} бармена: ${target.name}`);
  io.emit('players_update');
  res.json({ ok: true });
});

app.post('/api/players/setDealer', (req, res) => {
  const { adminName, targetName, canGive } = req.body || {};
  const admin = players.find(p => p.name === adminName && p.is_admin);
  if (!admin) return res.json({ error: 'Нет прав' });
  const target = players.find(p => p.name === targetName);
  if (!target) return res.json({ error: 'Игрок не найден' });
  target.can_give_cards = !!canGive;
  pushLog(`${admin.name} ${canGive ? 'назначил' : 'снял'} дилера: ${target.name}`);
  io.emit('players_update');
  res.json({ ok: true });
});

app.post('/api/players/setRewardMaster', (req, res) => {
  const { adminName, targetName, isReward } = req.body || {};
  const admin = players.find(p => p.name === adminName && p.is_admin);
  if (!admin) return res.json({ error: 'Нет прав' });
  const target = players.find(p => p.name === targetName);
  if (!target) return res.json({ error: 'Игрок не найден' });
  target.is_reward_master = !!isReward;
  pushLog(`${admin.name} ${isReward ? 'назначил' : 'снял'} мастера наград: ${target.name}`);
  io.emit('players_update');
  res.json({ ok: true });
});

// Soft restart
app.post('/api/players/restart', (req, res) => {
  const { adminName } = req.body || {};
  const admin = players.find(p => p.name === adminName && p.is_admin);
  if (!admin) return res.json({ error: 'Нет прав' });

  players.forEach(p => {
    p.health = p.max_health || 100;
    p.unconscious = false;
    p.hand = [];
    p.silencedUntil = 0;
    if (!p.duelQuota) p.duelQuota = { total: 3, used: 0, ts: Date.now() };
    p.duelQuota.used = 0;
    p.duelQuota.ts = Date.now();
  });
  healerTasks = [];
  dealerRequests = [];
  bartenderTasks = [];
  activeDuels.clear();
  clearAllTasks();
  pushLog('Игра перезапущена админом');
  io.emit('players_update');
  io.emit('healer_tasks_update');
  io.emit('dealer_requests_update');
  io.emit('bartender_tasks_update');
  io.emit('tasks_update');
  res.json({ ok: true });
});

// Bartender tasks
app.get('/api/bartender/tasks', (req, res) => {
  const { name } = req.query;
  const bartender = players.find(p => p.name === name);
  if (!bartender || !bartender.is_bartender) return res.json([]);
  res.json(bartenderTasks);
});

app.post('/api/bartender/complete', (req, res) => {
  const { bartenderName, taskId } = req.body || {};
  const bartender = players.find(p => p.name === bartenderName);
  if (!bartender || !bartender.is_bartender) return res.json({ error: 'Только бармен' });
  
  const idx = bartenderTasks.findIndex(t => t.id === taskId);
  if (idx === -1) return res.json({ error: 'Задача не найдена' });
  
  const task = bartenderTasks[idx];
  bartenderTasks.splice(idx, 1);
  const target = players.find(p => p.name === task.fromName);
  if (!target) return res.json({ error: 'Цель не найдена' });

  const healed = 25;
  healPlayer(target, healed);
  pushLog(`Бармен ${bartender.name} приготовил коктейль для ${target.name} (+${healed} HP)`);
  io.emit('players_update');
  io.emit('bartender_tasks_update');
  res.json({ ok: true, healed, target });
});

// Healer tasks
app.post('/api/players/requestHealing', (req, res) => {
  const { fromName } = req.body || {};
  const from = players.find(p => p.name === fromName);
  if (!from) return res.json({ error: 'Игрок не найден' });
  healerTasks.push({ id: nanoid(), fromName, ts: Date.now() });
  pushLog(`${fromName} попросил исцеление`);
  io.emit('healer_tasks_update');
  res.json({ ok: true });
});

app.get('/api/healer/tasks', (req, res) => {
  const { name } = req.query;
  const healer = players.find(p => p.name === name);
  if (!healer || !healer.is_healer) return res.json([]);
  res.json(healerTasks);
});

app.post('/api/healer/complete', (req, res) => {
  const { healerName, taskId } = req.body || {};
  const healer = players.find(p => p.name === healerName);
  if (!healer || !healer.is_healer) return res.json({ error: 'Только целитель' });
  const idx = healerTasks.findIndex(t => t.id === taskId);
  if (idx === -1) return res.json({ error: 'Задача не найдена' });
  
  const task = healerTasks[idx];
  healerTasks.splice(idx, 1);
  const target = players.find(p => p.name === task.fromName);
  if (!target) return res.json({ error: 'Цель не найдена' });

  healPlayer(target, 30);
  pushLog(`Целитель ${healer.name} исцелил ${target.name} на +30 HP`);
  io.emit('players_update');
  io.emit('healer_tasks_update');
  res.json({ ok: true, healed: 30, target });
});

// Dealer requests
app.post('/api/players/requestCard', (req, res) => {
  const { fromName } = req.body || {};
  const from = players.find(p => p.name === fromName);
  if (!from) return res.json({ error: 'Игрок не найден' });
  dealerRequests.push({ id: nanoid(), fromName, ts: Date.now() });
  pushLog(`${fromName} запросил карту у дилера`);
  io.emit('dealer_requests_update');
  res.json({ ok: true });
});

app.get('/api/dealer/requests', (req, res) => {
  const { name } = req.query;
  const dealer = players.find(p => p.name === name);
  if (!dealer || !(dealer.can_give_cards || dealer.is_admin)) return res.json([]);
  res.json(dealerRequests);
});

app.post('/api/dealer/fulfill', (req, res) => {
  const { dealerName, requestId } = req.body || {};
  const dealer = players.find(p => p.name === dealerName);
  if (!dealer || !(dealer.can_give_cards || dealer.is_admin)) return res.json({ error: 'Нет прав' });
  
  const idx = dealerRequests.findIndex(t => t.id === requestId);
  if (idx === -1) return res.json({ error: 'Заявка не найдена' });
  
  const reqv = dealerRequests[idx];
  dealerRequests.splice(idx, 1);
  const target = players.find(p => p.name === reqv.fromName);
  if (!target) return res.json({ error: 'Игрок не найден' });
  
  const cards = randomCoupons(1);
  target.hand.push(...cards);
  pushLog(`Дилер ${dealer.name} выдал купон "${cards[0].name}" игроку ${target.name}`);
  io.emit('players_update');
  io.emit('dealer_requests_update');
  res.json({ ok: true, card: cards[0] });
});

// Cards
app.get('/api/cards', (req, res) => {
  const { name } = req.query;
  const p = players.find(x => x.name === name);
  if (!p) return res.json([]);
  
  // Базовая карта: дуэль (у всех)
  const base = [];
  base.push({ 
    id: 'pistol', 
    name: 'Pistol Shot', 
    type: 'attack', 
    description: 'Вызов на дуэль', 
    scope: 'other' 
  });
  
  // Карта лечения только у целителя
  if (p.is_healer) {
    base.push({ 
      id: 'heal30', 
      name: 'Heal +30', 
      type: 'heal', 
      description: 'Исцелить цель на 30 HP', 
      scope: 'other' 
    });
  }
  
  res.json([...base, ...(p.hand || [])]);
});

// Actions - использование купонов
app.post('/api/actions/useAction', (req, res) => {
  const { fromName, cardId, targetName, secondTargetName } = req.body || {};
  const actor = players.find(p => p.name === fromName);
  
  if (!actor) return res.json({ error: 'Игрок не найден' });
  if (actor.unconscious) return res.json({ error: 'Вы без сознания. Попросите исцеление у целителя.' });
  
  // Проверяем молчание
  if (actor.silencedUntil && actor.silencedUntil > Date.now()) {
    const remaining = Math.ceil((actor.silencedUntil - Date.now()) / 1000);
    return res.json({ error: `Вы под эффектом Молчания (ещё ${remaining} сек)` });
  }
  
  // Находим карту в руке
  const cardIndex = actor.hand.findIndex(c => c.uid === cardId || c.id === cardId);
  if (cardIndex === -1) return res.json({ error: 'Карта не найдена' });
  
  const card = actor.hand[cardIndex];
  
  // Обработка запроса коктейля
  if (card.type === 'bartender_request') {
    bartenderTasks.push({ id: nanoid(), fromName: actor.name, ts: Date.now() });
    pushLog(`${actor.name} запросил коктейль у бармена`);
    actor.hand.splice(cardIndex, 1);
    io.emit('players_update');
    io.emit('bartender_tasks_update');
    return res.json({ ok: true });
  }
  
  // Обработка по scope
  if (card.scope === 'self') {
    // Карта на себя - сразу выполняется
    pushLog(`${actor.name} использовал купон "${card.name}" на себя`);
    actor.hand.splice(cardIndex, 1);
    io.emit('players_update');
    return res.json({ ok: true });
  }
  
  if (card.scope === 'other') {
    // Карта на другого - создаём задание
    if (!targetName || targetName === actor.name) {
      return res.json({ error: 'Выберите другого игрока' });
    }
    
    const target = players.find(p => p.name === targetName);
    if (!target) return res.json({ error: 'Цель не найдена' });
    
    // Создаём задание
    const task = createTask(actor.name, target.name, card);
    pushLog(`${actor.name} использовал купон "${card.name}" на ${target.name} - ждёт подтверждения`);
    
    // Удаляем карту из руки
    actor.hand.splice(cardIndex, 1);
    
    io.emit('players_update');
    io.emit('tasks_update');
    return res.json({ ok: true });
  }
  
  if (card.scope === 'two_players') {
    // Карта на двоих
    if (!targetName || !secondTargetName) {
      return res.json({ error: 'Выберите двух игроков' });
    }
    
    const target1 = players.find(p => p.name === targetName);
    const target2 = players.find(p => p.name === secondTargetName);
    
    if (!target1 || !target2) return res.json({ error: 'Игроки не найдены' });
    
    // Создаём задания для обоих
    createTask(actor.name, target1.name, card);
    createTask(actor.name, target2.name, card);
    
    pushLog(`${actor.name} использовал купон "${card.name}" на ${target1.name} и ${target2.name}`);
    actor.hand.splice(cardIndex, 1);
    
    io.emit('players_update');
    io.emit('tasks_update');
    return res.json({ ok: true });
  }
  
  if (card.scope === 'all_players') {
    // Карта на всех
    players.forEach(p => {
      if (p.name !== actor.name) {
        createTask(actor.name, p.name, card);
      }
    });
    
    pushLog(`${actor.name} использовал купон "${card.name}" на ВСЕХ игроков`);
    actor.hand.splice(cardIndex, 1);
    
    io.emit('players_update');
    io.emit('tasks_update');
    return res.json({ ok: true });
  }
  
  res.json({ error: 'Неизвестный тип карты' });
});

// Heal action (целитель)
app.post('/api/actions/heal', (req, res) => {
  const { healerName, targetName } = req.body || {};
  const healer = players.find(p => p.name === healerName);
  if (!healer || !healer.is_healer) return res.json({ error: 'Только целитель' });
  
  const target = players.find(p => p.name === targetName);
  if (!target) return res.json({ error: 'Цель не найдена' });
  
  healPlayer(target, 30);
  pushLog(`Целитель ${healer.name} исцелил ${target.name} на +30 HP (картой)`);
  io.emit('players_update');
  res.json({ ok: true, healed: 30 });
});

// Tasks API
app.get('/api/tasks/my', (req, res) => {
  const { name } = req.query;
  if (!name) return res.json([]);
  res.json(getTasksForPlayer(name));
});

app.get('/api/tasks/initiated', (req, res) => {
  const { name } = req.query;
  if (!name) return res.json([]);
  res.json(getTasksByInitiator(name));
});

app.post('/api/tasks/complete', (req, res) => {
  const { initiatorName, taskId, completed } = req.body || {};
  
  const task = removeTask(taskId);
  if (!task) return res.json({ error: 'Задание не найдено' });
  
  const target = players.find(p => p.name === task.toName);
  if (!target) return res.json({ error: 'Цель не найдена' });
  
  if (completed) {
    // Выполнено - дать награду
    target.experience += task.xpReward;
    const lvlResult = levelUpIfNeeded(target);
    
    if (lvlResult.leveled && lvlResult.rewards.length > 0) {
      pushLog(`🎉 ${target.name} повысил уровень! Награда: ${lvlResult.rewards.join(', ')}`);
    }
    
    pushLog(`✅ ${target.name} выполнил задание "${task.cardName}" от ${task.fromName} (+${task.xpReward} опыта)`);
  } else {
    // Не выполнено - штраф
    applyDamage(target, task.hpPenalty);
    pushLog(`❌ ${target.name} не выполнил задание "${task.cardName}" от ${task.fromName} (-${task.hpPenalty} HP)`);
  }
  
  io.emit('players_update');
  io.emit('tasks_update');
  res.json({ ok: true });
});

// Duels
app.get('/api/duels/quota', (req, res) => {
  const { name } = req.query;
  const p = players.find(pp => pp.name === name);
  if (!p) return res.json({ error: 'Игрок не найден' });
  const remaining = ensureDuelQuota(p);
  res.json({ total: p.duelQuota.total, used: p.duelQuota.used, remaining });
});

app.post('/api/duels/challenge', (req, res) => {
  const { challengerName, opponentName } = req.body || {};
  const challenger = players.find(p => p.name === challengerName);
  const opponent = players.find(p => p.name === opponentName);
  
  if (!challenger || !opponent) return res.json({ error: 'Игрок не найден' });
  if (challenger.unconscious) return res.json({ error: 'Вы без сознания.' });
  if (challenger.name === opponent.name) return res.json({ error: 'Нельзя вызвать себя' });
  
  // Проверяем молчание
  if (challenger.silencedUntil && challenger.silencedUntil > Date.now()) {
    return res.json({ error: 'Вы под эффектом Молчания' });
  }
  
  const remaining = ensureDuelQuota(challenger);
  if (remaining <= 0) return res.json({ error: 'Лимит дуэлей исчерпан' });

  for (const d of activeDuels.values()) {
    if ((d.challenger === challenger.name && d.opponent === opponent.name) || 
        (d.challenger === opponent.name && d.opponent === challenger.name)) {
      return res.json({ error: 'Дуэль уже на рассмотрении' });
    }
  }
  
  const id = nanoid();
  const duel = { id, challenger: challenger.name, opponent: opponent.name, ts: Date.now() };
  activeDuels.set(id, duel);
  challenger.duelQuota.used += 1;
  
  pushLog(`${challenger.name} вызвал на дуэль ${opponent.name}`);
  io.emit('duel_challenge', { duelId: id, challenger: challenger.name, opponent: opponent.name });
  res.json({ ok: true, duelId: id });
});

app.post('/api/duels/respond', (req, res) => {
  const { duelId, action, challengerName, opponentName } = req.body || {};
  const duel = activeDuels.get(duelId);
  
  if (!duel) return res.json({ error: 'Дуэль не найдена' });
  if (duel.challenger !== challengerName || duel.opponent !== opponentName) {
    return res.json({ error: 'Несовпадение' });
  }
  
  const challenger = players.find(p => p.name === duel.challenger);
  const opponent = players.find(p => p.name === duel.opponent);
  if (!challenger || !opponent) return res.json({ error: 'Игрок не найден' });

  if (action === 'decline') {
    activeDuels.delete(duelId);
    pushLog(`${opponent.name} отклонил дуэль с ${challenger.name}`);
    return res.json({ ok: true });
  }

  if (action !== 'accept') return res.json({ error: 'Неизвестное действие' });

  // Бой
  const battleEvents = [];
  const firstShooter = Math.random() > 0.5 ? challenger : opponent;
  const secondShooter = firstShooter.name === challenger.name ? opponent : challenger;
  
  const shot1 = calculateShot(firstShooter, secondShooter);
  battleEvents.push(shot1.message);
  
  let chHP = challenger.health;
  let opHP = opponent.health;
  
  if (shot1.hit) {
    if (secondShooter.name === challenger.name) {
      chHP -= shot1.damage;
    } else {
      opHP -= shot1.damage;
    }
  }
  
  if (chHP > 0 && opHP > 0) {
    const shot2 = calculateShot(secondShooter, firstShooter);
    battleEvents.push(shot2.message);
    
    if (shot2.hit) {
      if (firstShooter.name === challenger.name) {
        chHP -= shot2.damage;
      } else {
        opHP -= shot2.damage;
      }
    }
  }
  
  let winner = 'Ничья';
  if (chHP > opHP) {
    winner = challenger.name;
  } else if (opHP > chHP) {
    winner = opponent.name;
  } else {
    if (challenger.level > opponent.level) {
      winner = challenger.name;
    } else if (opponent.level > challenger.level) {
      winner = opponent.name;
    } else {
      winner = Math.random() > 0.5 ? challenger.name : opponent.name;
    }
  }
  
  challenger.health = Math.max(0, chHP);
  opponent.health = Math.max(0, opHP);
  
  if (challenger.health === 0) challenger.unconscious = true;
  if (opponent.health === 0) opponent.unconscious = true;
  
  // Награды
  if (winner === challenger.name) {
    challenger.experience += 15;
    const lvlResult = levelUpIfNeeded(challenger);
    if (lvlResult.leveled && lvlResult.rewards.length > 0) {
      pushLog(`🎉 ${challenger.name} повысил уровень! Награда: ${lvlResult.rewards.join(', ')}`);
    }
  } else if (winner === opponent.name) {
    opponent.experience += 15;
    const lvlResult = levelUpIfNeeded(opponent);
    if (lvlResult.leveled && lvlResult.rewards.length > 0) {
      pushLog(`🎉 ${opponent.name} повысил уровень! Награда: ${lvlResult.rewards.join(', ')}`);
    }
  }
  
  const loser = winner === challenger.name ? opponent : challenger;
  loser.experience += 5;
  const loserLvl = levelUpIfNeeded(loser);
  if (loserLvl.leveled && loserLvl.rewards.length > 0) {
    pushLog(`🎉 ${loser.name} повысил уровень! Награда: ${loserLvl.rewards.join(', ')}`);
  }
  
  const summary = `⚔️ Дуэль ${challenger.name} vs ${opponent.name}: ${battleEvents.join(' • ')} • 🏆 Победил ${winner}! (Итог: ${challenger.name} ${challenger.health}/${challenger.max_health} HP, ${opponent.name} ${opponent.health}/${opponent.max_health} HP)`;
  pushLog(summary);
  
  activeDuels.delete(duelId);
  io.emit('players_update');
  io.emit('duel_result', { duelId, challenger: challenger.name, opponent: opponent.name, winner });
  res.json({ ok: true, winner });
});

// Socket
io.on('connection', (socket) => {
  socket.on('player_online', (name) => {
    const p = getOrCreatePlayer(name);
    p.online = true;
    socket.playerName = name;
    io.emit('players_update');
  });
  
  // Admin: выдать всем по 2 карты
  socket.on('admin_deal_cards_to_all', () => {
    const admin = players.find(p => p.name === socket.playerName && p.is_admin);
    if (!admin) return;

    players.forEach(p => {
      const newCards = randomCoupons(2);
      p.hand.push(...newCards);
    });

    pushLog('🎴 Admin ' + admin.name + ' выдал всем по 2 купона');
    io.emit('players_update');
  });

  socket.on('disconnect', () => {});
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONT_DIR, 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('🎮 Duel Game v7.0 запущен на http://localhost:' + PORT);
});
