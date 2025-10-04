// Игровая логика
const { randomCoupons } = require('./cards');

function maxHealthForLevel(level) {
  return 100 + Math.max(0, level - 1) * 10;
}

function evadeChanceForLevel(level) {
  return Math.min(0.95, 0.30 + (Math.max(1, level) - 1) * 0.05);
}

function levelUpIfNeeded(player) {
  let leveled = false;
  const rewards = [];
  
  while (player.experience >= 100) {
    player.experience -= 100;
    player.level += 1;
    player.max_health = maxHealthForLevel(player.level);
    player.health = Math.min(player.max_health, player.health + 10);
    leveled = true;
    
    // Награда за level up: либо карта, либо +1 дуэль
    const rewardType = Math.random() > 0.5 ? 'card' : 'duel';
    
    if (rewardType === 'card') {
      const newCards = randomCoupons(1);
      player.hand.push(...newCards);
      rewards.push(`🎴 Карта: ${newCards[0].name}`);
    } else {
      // Добавляем +1 дуэль, но максимум 3 total
      if (player.duelQuota.total < 3) {
        player.duelQuota.total++;
        rewards.push(`⚔️ +1 дуэль (теперь ${player.duelQuota.total})`);
      } else {
        // Если уже 3 дуэли - даём карту
        const newCards = randomCoupons(1);
        player.hand.push(...newCards);
        rewards.push(`🎴 Карта: ${newCards[0].name}`);
      }
    }
  }
  
  return { leveled, rewards };
}

function applyDamage(player, dmg) {
  player.health = Math.max(0, player.health - dmg);
  if (player.health === 0) {
    player.unconscious = true;
  }
  return player.health === 0;
}

function healPlayer(player, amount) {
  player.health = Math.min(player.max_health, player.health + amount);
  
  if (player.health > 0) {
    player.unconscious = false;
  }
}

function calculateShot(attacker, defender) {
  const baseDamage = 15 + Math.floor(Math.random() * 11) + Math.floor(attacker.level * 0.5);
  const dodgeChance = evadeChanceForLevel(defender.level);
  
  if (Math.random() < dodgeChance) {
    return {
      hit: false,
      damage: 0,
      message: `${attacker.name} → ${defender.name} ✨ УВЕРНУЛСЯ!`
    };
  }
  
  const isCritical = Math.random() < 0.15;
  let damage = baseDamage;
  if (isCritical) damage = Math.floor(damage * 1.5);
  
  let message = `${attacker.name} → ${defender.name}`;
  if (isCritical) message += ' 💥 КРИТ';
  message += ` ${damage}HP`;
  
  return { hit: true, damage, critical: isCritical, message };
}

function ensureDuelQuota(player) {
  const oneHour = 60 * 60 * 1000;
  if (Date.now() - player.duelQuota.ts > oneHour) {
    player.duelQuota.ts = Date.now();
    player.duelQuota.used = 0;
  }
  return player.duelQuota.total - player.duelQuota.used;
}

module.exports = {
  maxHealthForLevel,
  evadeChanceForLevel,
  levelUpIfNeeded,
  applyDamage,
  healPlayer,
  calculateShot,
  ensureDuelQuota
};
