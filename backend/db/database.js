const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'game.db'));

function init() {
  db.exec(`CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    avatar TEXT DEFAULT '/static/avatars/default.png',
    level INTEGER DEFAULT 1,
    health INTEGER DEFAULT 100,
    max_health INTEGER DEFAULT 100,
    experience INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    cards_played INTEGER DEFAULT 0,
    cards_received INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    is_healer INTEGER DEFAULT 0,
    can_give_cards INTEGER DEFAULT 0,
    is_reward_master INTEGER DEFAULT 0,
    duel_quota INTEGER DEFAULT 0,
    hand TEXT DEFAULT '[]',
    silenced_until INTEGER DEFAULT 0,
    online INTEGER DEFAULT 0,
    socket_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    damage INTEGER DEFAULT 0,
    heal INTEGER DEFAULT 0,
    task TEXT,
    description TEXT,
    scope TEXT DEFAULT 'self',
    effect_exp INTEGER DEFAULT 0,
    effect_hp INTEGER DEFAULT 0,
    effect_duel_quota INTEGER DEFAULT 0,
    effect_silence_seconds INTEGER DEFAULT 0,
    hp_penalty INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 0,
    count INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_code TEXT NOT NULL,
    card_name TEXT NOT NULL,
    initiator_name TEXT NOT NULL,
    target_name TEXT NOT NULL,
    description TEXT,
    hp_penalty INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS duels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenger_id INTEGER NOT NULL,
    opponent_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    winner_id INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )`);

  // Insert 36 coupons + action cards
  const cards = [
    // Action cards (from dealer/admin)
    {code:'adrenaline',name:'💉 Адреналин',type:'action',scope:'self',effect_exp:10,description:'Получить +10 опыта'},
    {code:'heal',name:'💊 Лечение',type:'action',scope:'self',effect_hp:15,description:'Восстановить 15 HP'},
    {code:'shield',name:'🛡️ Щит',type:'action',scope:'self',effect_hp:20,description:'Получить +20 HP (может увеличить max)'},
    {code:'energy',name:'⚡ Энергия',type:'action',scope:'self',effect_exp:15,effect_hp:10,description:'+15 XP и +10 HP'},
    {code:'duel_boost',name:'⚔️ Дуэльный буст',type:'action',scope:'self',effect_duel_quota:1,description:'+1 дуэль'},

    // Coupons (36 from your list)
    {code:'kiss_cheek',name:'💋 Поцелуй в щечку',type:'coupon',scope:'two_players',count:2,hp_penalty:20,xp_reward:20,description:'Выбери двух игроков, которые целуются в щёчку'},
    {code:'phone_ban',name:'📵 Запрет на телефон',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Игрок не может использовать телефон 1 час'},
    {code:'set_track',name:'🎵 Поставить трек',type:'coupon',scope:'self',count:1,hp_penalty:10,xp_reward:10,description:'DJ ставит твой трек'},
    {code:'pool_ban',name:'🏊 Вытащить из бассейна',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Запрет на купание 1 час'},
    {code:'make_photo',name:'📸 Сделать фото',type:'coupon',scope:'other',count:2,hp_penalty:20,xp_reward:20,description:'Игрок делает фото с тобой в выбранной позе'},
    {code:'cancel_coupon',name:'🚫 Отменить купон',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Отменить любой купон'},
    {code:'silence',name:'🤐 Молчание',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,effect_silence_seconds:600,description:'Запрет говорить 10 минут'},
    {code:'no_sit',name:'🪑 Запрет сидеть',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Нельзя садиться 15 минут'},
    {code:'drink_together',name:'🍻 Обязательная попойка',type:'coupon',scope:'two_players',count:2,hp_penalty:20,xp_reward:20,description:'Двое выпивают вместе'},
    {code:'compliment',name:'💐 Комплимент',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Игрок говорит тебе 3 комплимента'},
    {code:'swap_clothes',name:'👕 Обмен футболками',type:'coupon',scope:'two_players',count:1,hp_penalty:10,xp_reward:10,description:'Двое меняются одеждой на 15 мин'},
    {code:'toast',name:'🥂 Тост в твою честь',type:'coupon',scope:'other',count:2,hp_penalty:20,xp_reward:20,description:'Игрок произносит хвалебный тост'},
    {code:'force_coupon',name:'🎲 Заставить использовать купон',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Игрок сразу использует свой купон'},
    {code:'dance_battle',name:'💃 Танцевальный вызов',type:'coupon',scope:'two_players',count:1,hp_penalty:10,xp_reward:10,description:'Два игрока танцуют друг против друга'},
    {code:'scream',name:'📢 Фантастический крик',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Игрок кричит что-то смешное/громкое'},
    {code:'hug',name:'🤗 Объятие судьбы',type:'coupon',scope:'other',count:2,hp_penalty:20,xp_reward:20,description:'Игрок обнимает тебя'},
    {code:'skip_penalty',name:'🎫 Пропуск наказания',type:'coupon',scope:'self',count:1,hp_penalty:10,xp_reward:10,description:'Игнорировать любое наказание'},
    {code:'chef',name:'👨‍🍳 Шеф-повар',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Игрок готовит тебе напиток'},
    {code:'confess',name:'🤫 Заставь признаться',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Игрок признаётся в чём-то'},
    {code:'rename',name:'✏️ Переименуй',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Новое имя на 1 час, ошибся — пьет'},
    {code:'bartender',name:'🍹 Личный бармен',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Игрок приносит тебе напиток'},
    {code:'mass_challenge',name:'🎉 Массовый челлендж',type:'coupon',scope:'all',count:1,hp_penalty:10,xp_reward:10,description:'Все выполняют действие (петь, танцевать)'},
    {code:'dance_object',name:'🕺 Танец с предметом',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Игрок танцует с предметом'},
    {code:'selfie',name:'🤳 Обязательное селфи',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Игрок делает селфи с тобой и выкладывает'},
    {code:'alphabet_talk',name:'🔤 Алфавитный разговор',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Разговор 15 мин только на одну букву'},
    {code:'cat_challenge',name:'🐱 Кошачий вызов',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Каждый ответ начинать с МЯУ 10 мин'},
    {code:'pick_victim',name:'🎯 Выбери жертву',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Все придумывают задание жертве'},
    {code:'reseat',name:'🔄 Перестановка',type:'coupon',scope:'two_players',count:1,hp_penalty:10,xp_reward:10,description:'Пересадить 2 игроков'},
    {code:'drink_reaction',name:'😱 Реакция на питьё',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Когда пьешь, все громко стонут'},
    {code:'announce_star',name:'⭐ Объяви себя звездой',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Презентовать себя как знаменитость'},
    {code:'play_role',name:'🎭 Сыграй роль',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'1 мин говорить как животное/персонаж'},
    {code:'silence_all',name:'🔇 Заставь всех молчать',type:'coupon',scope:'all',count:1,hp_penalty:10,xp_reward:10,description:'Все молчат 1 мин по твоему сигналу'},
    {code:'cupid',name:'💘 Купидон',type:'coupon',scope:'two_players',count:1,hp_penalty:10,xp_reward:10,description:'Два игрока ходят вместе 10 мин'},
    {code:'soul_toast',name:'❤️ Тост от души',type:'coupon',scope:'other',count:1,hp_penalty:10,xp_reward:10,description:'Игрок произносит душевный тост'},
    {code:'pick_victim2',name:'🎯 Выбери жертву 2',type:'coupon',scope:'other',count:2,hp_penalty:20,xp_reward:20,description:'Все придумывают задание жертве'}
  ];

  const insertCard = db.prepare(\`INSERT OR IGNORE INTO cards (code, name, type, scope, effect_exp, effect_hp, effect_duel_quota, effect_silence_seconds, hp_penalty, xp_reward, count, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`);

  for (const c of cards) {
    insertCard.run(
      c.code, c.name, c.type, c.scope || 'self',
      c.effect_exp || 0, c.effect_hp || 0, c.effect_duel_quota || 0, c.effect_silence_seconds || 0,
      c.hp_penalty || 0, c.xp_reward || 0, c.count || 1, c.description || ''
    );
  }
}

module.exports = { db, init };
