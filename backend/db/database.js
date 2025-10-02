
// Simple in-memory DB substitute for demo. Replace with real DB as needed.
const crypto = require('crypto');

const state = {
  players: {}, // name -> player
  online: new Set(),
  cards: [
    { id: 'atk_pistol', name: 'Пистолетный выстрел', type: 'attack', damage: 0, description: 'Начать дуэль пистолетом' },
    // Лечебные карты будут выдаваться только целителю и через роль/кнопку выдачи
    { id: 'heal_pushups', name: 'Лечение: Отжимания', type: 'heal', heal: 30, healerOnly: true, target: 'other' },
    { id: 'heal_shot', name: 'Лечение: Шот', type: 'heal', heal: 20, healerOnly: true, target: 'other' },
    { id: 'heal_squats', name: 'Лечение: Приседания', type: 'heal', heal: 25, healerOnly: true, target: 'other' },
  ],
  // Карты-действия/задания. Помечаем область применения: self|other|both
  actionDeck: [
    { id: 'act_extra_duel', name: 'Доп. дуэль', type: 'action', scope: 'other', description: 'Назначь кому-то дополнительную дуэль' },
    { id: 'act_pool', name: 'В бассейн!', type: 'action', scope: 'other', description: 'Отправь кого-то в бассейн' },
    { id: 'act_mute', name: 'Тишина!', type: 'action', scope: 'other', description: 'Заставь кого-то помолчать 3 мин' },
    { id: 'act_self_buff', name: 'Бодряк', type: 'action', scope: 'self', description: 'Используй на себя — +10 HP' },
    { id: 'act_heal_any', name: 'Выбор лечения', type: 'action', scope: 'other', description: 'Попроси целителя выбрать лечение' },
  ],
  rolesPrimary: [
    { id: 'spy', name: 'Шпион', description: 'Делай непристойные фото весь вечер' },
    { id: 'dj', name: 'DJ', description: 'Иногда меняй музыку' },
    { id: 'moderator', name: 'Модератор', description: 'Следи за порядком' },
  ],
  rolesSecondary: [
    { id: 'ask_song', name: 'Заводила', description: 'Периодически проси включить повеселее' },
    { id: 'ask_drink_full', name: 'Провокатор', description: 'Проси налить даже с полным стаканом' },
    { id: 'complimenter', name: 'Комплиментор', description: 'Делай комплименты' },
  ],
};

function ensurePlayer(name){
  if(!state.players[name]){
    state.players[name] = {
      id: crypto.randomUUID(),
      name,
      avatar: '/avatars/default.png',
      level: 1,
      experience: 0,
      health: 100,
      max_health: 100,
      wins: 0,
      losses: 0,
      cards_played: 0,
      cards_received: 0,
      is_admin: false,
      is_healer: false,
      can_give_cards: false,
      unconscious: false,
      roles: {
        primary: null,
        secondary: null,
        revealed: false,
        ghost: false,
      },
      duelSent: {}, // opponentName -> count
      lastLevelForDuelQuota: 1,
      hand: [],
      usedCards: 0,
      notifications: [],
    };
  }
  return state.players[name];
}

function onlineList(){
  return Array.from(state.online).map(n => state.players[n]).filter(Boolean);
}

function levelUpIfNeeded(p){
  const thresholds = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800, 4700];
  let newLevel = p.level;
  for(let i=thresholds.length-1;i>=0;i--){
    if(p.experience >= thresholds[i]){ newLevel = i+1; break; }
  }
  if(newLevel !== p.level){
    p.level = newLevel;
    // При повышении уровня добавляем +1 к лимиту дуэлей (реализуем через пересчет квоты ниже)
  }
  return p;
}

function duelQuotaForLevel(level){
  const q = 2 + (level - 1); // базово 2, +1 за каждый уровень
  return Math.min(q, 20);
}

function canSendDuel(p, opponentName){
  const quota = duelQuotaForLevel(p.level);
  const count = (p.duelSent[opponentName]||0);
  return count < quota;
}

function recordDuelSent(p, opponentName){
  p.duelSent[opponentName] = (p.duelSent[opponentName]||0) + 1;
}

function grantExp(p, amount){
  p.experience += amount;
  levelUpIfNeeded(p);
}

function damagePlayer(p, dmg){
  if(p.unconscious) return;
  p.health = Math.max(0, p.health - dmg);
  if(p.health === 0){
    p.unconscious = true;
    p.roles.ghost = true; // показываем иконку призрака
  }
}

function healPlayer(p, amount){
  const before = p.health;
  p.health = Math.min(p.max_health, p.health + amount);
  if(p.health > 0){ p.unconscious = false; }
  return p.health - before;
}

function assignRolesIfNeeded(p){
  if(!p.roles.primary){
    p.roles.primary = state.rolesPrimary[Math.floor(Math.random()*state.rolesPrimary.length)];
  }
  if(!p.roles.secondary){
    p.roles.secondary = state.rolesSecondary[Math.floor(Math.random()*state.rolesSecondary.length)];
  }
}

function randomActionCard(excludeIds){
  const pool = state.actionDeck.filter(c => !excludeIds.has(c.id));
  if(pool.length === 0){
    return null;
  }
  return pool[Math.floor(Math.random()*pool.length)];
}

module.exports = {
  state, ensurePlayer, onlineList,
  levelUpIfNeeded, duelQuotaForLevel, canSendDuel, recordDuelSent,
  grantExp, damagePlayer, healPlayer, assignRolesIfNeeded, randomActionCard
};
