
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'game.db'));

function init() {
  db.exec("CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, avatar TEXT DEFAULT '/static/avatars/default.png', level INTEGER DEFAULT 1, health INTEGER DEFAULT 100, max_health INTEGER DEFAULT 100, experience INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, cards_played INTEGER DEFAULT 0, cards_received INTEGER DEFAULT 0, is_admin INTEGER DEFAULT 0, is_healer INTEGER DEFAULT 0, online INTEGER DEFAULT 0, socket_id TEXT, created_at INTEGER DEFAULT (strftime('%s','now'))) ");
  db.exec("CREATE TABLE IF NOT EXISTS cards (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, damage INTEGER DEFAULT 0, heal INTEGER DEFAULT 0, task TEXT, description TEXT, created_at INTEGER DEFAULT (strftime('%s','now'))) ");
  db.exec("CREATE TABLE IF NOT EXISTS duels (id INTEGER PRIMARY KEY AUTOINCREMENT, challenger_id INTEGER NOT NULL, opponent_id INTEGER NOT NULL, card_id INTEGER NOT NULL, status TEXT DEFAULT 'pending', winner_id INTEGER, created_at INTEGER DEFAULT (strftime('%s','now')), FOREIGN KEY (challenger_id) REFERENCES players(id), FOREIGN KEY (opponent_id) REFERENCES players(id), FOREIGN KEY (card_id) REFERENCES cards(id)) ");
  const ensureCols = [
    { table: 'players', col: 'cards_played', def: 'INTEGER DEFAULT 0' },
    { table: 'players', col: 'cards_received', def: 'INTEGER DEFAULT 0' },
    { table: 'players', col: 'is_admin', def: 'INTEGER DEFAULT 0' },
    { table: 'players', col: 'is_healer', def: 'INTEGER DEFAULT 0' }
  ];
  ensureCols.forEach(c => { try { db.exec('ALTER TABLE ' + c.table + ' ADD COLUMN ' + c.col + ' ' + c.def); } catch(e) {} });
  const cnt = db.prepare('SELECT COUNT(*) as c FROM cards').get().c;
  if (cnt === 0) {
    const ins = db.prepare('INSERT INTO cards (name, type, damage, heal, task, description) VALUES (?,?,?,?,?,?)');
    ins.run('Огненный шар','attack',20,0,null,'Наносит 20 урона');
    ins.run('Ледяная стрела','attack',15,0,null,'Наносит 15 урона');
    ins.run('Лечебное зелье','heal',0,30,'Выпей шот','Восстанавливает 30 HP');
    ins.run('Отжимания','heal',0,20,'Отожмись 20 раз','Восстанавливает 20 HP');
    ins.run('Приседания','heal',0,25,'Присядь 20 раз','Восстанавливает 25 HP');
  }
}

function createPlayer(name, isAdmin=0) { const r = db.prepare('INSERT INTO players (name, is_admin) VALUES (?,?)').run(name, isAdmin); return getPlayerById(r.lastInsertRowid); }
function getPlayerByName(name) { return db.prepare('SELECT * FROM players WHERE name = ?').get(name); }
function getPlayerById(id) { return db.prepare('SELECT * FROM players WHERE id = ?').get(id); }
function getPlayerBySocketId(sid) { return db.prepare('SELECT * FROM players WHERE socket_id = ?').get(sid); }
function getOnlinePlayers() { return db.prepare('SELECT * FROM players WHERE online = 1').all(); }
function setPlayerOnline(name, sid) { db.prepare('UPDATE players SET online = 1, socket_id = ? WHERE name = ?').run(sid, name); }
function setPlayerOffline(name) { db.prepare('UPDATE players SET online = 0, socket_id = NULL WHERE name = ?').run(name); }
function updatePlayer(player) { db.prepare('UPDATE players SET avatar=?, level=?, health=?, max_health=?, experience=?, wins=?, losses=?, cards_played=?, cards_received=?, is_admin=?, is_healer=?, online=?, socket_id=? WHERE id = ?').run(player.avatar, player.level, player.health, player.max_health, player.experience, player.wins, player.losses, player.cards_played, player.cards_received, player.is_admin, player.is_healer, player.online, player.socket_id, player.id); }
function setAvatar(name, avatarPath) { db.prepare('UPDATE players SET avatar=? WHERE name=?').run(avatarPath, name); }
function updatePlayerHealth(id, health) { const p = getPlayerById(id); const nh = Math.min(Math.max(0, health), p.max_health); db.prepare('UPDATE players SET health=? WHERE id=?').run(nh, id); }
function addExperience(id, exp) { const p = getPlayerById(id); let newExp=p.experience+exp; let lvl=p.level; let maxHP=p.max_health; let leveledUp=false; while(newExp>=100){newExp-=100;lvl++;maxHP+=10;leveledUp=true;} db.prepare('UPDATE players SET experience=?, level=?, max_health=?, health=? WHERE id=?').run(newExp,lvl,maxHP,maxHP,id); return { leveledUp: leveledUp, newLevel: lvl }; }
function incPlayed(id, d=1){ db.prepare('UPDATE players SET cards_played = cards_played + ? WHERE id = ?').run(d,id); }
function incReceived(id, d=1){ db.prepare('UPDATE players SET cards_received = cards_received + ? WHERE id = ?').run(d,id); }
function updatePlayerStats(id, won){ db.prepare('UPDATE players SET ' + (won?'wins':'losses') + ' = ' + (won?'wins':'losses') + ' + 1 WHERE id = ?').run(id); }
function getAllCards(){ return db.prepare('SELECT * FROM cards').all(); }
function getCardById(id){ return db.prepare('SELECT * FROM cards WHERE id = ?').get(id); }
function createCard(name,type,damage,heal,task,description){ const r=db.prepare('INSERT INTO cards (name,type,damage,heal,task,description) VALUES (?,?,?,?,?,?)').run(name,type,damage||0,heal||0,task||null,description||''); return getCardById(r.lastInsertRowid); }
function createDuel(chId,opId,cardId){ const r=db.prepare('INSERT INTO duels (challenger_id, opponent_id, card_id) VALUES (?,?,?)').run(chId,opId,cardId); return r.lastInsertRowid; }
function getDuelById(id){ return db.prepare('SELECT * FROM duels WHERE id = ?').get(id); }
function updateDuelStatus(id,status,winnerId){ db.prepare('UPDATE duels SET status=?, winner_id=? WHERE id=?').run(status,winnerId||null,id); }
function setHealer(targetName,val){ db.prepare('UPDATE players SET is_healer = ? WHERE name = ?').run(val?1:0, targetName); }

module.exports = { init, createPlayer, getPlayerByName, getPlayerById, getPlayerBySocketId, getOnlinePlayers, setPlayerOnline, setPlayerOffline, updatePlayer, setAvatar, updatePlayerHealth, addExperience, updatePlayerStats, getAllCards, getCardById, createCard, createDuel, getDuelById, updateDuelStatus, incPlayed, incReceived, setHealer };
