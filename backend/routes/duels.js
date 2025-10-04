const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Функция расчета боевого раунда
function calculateRound(attacker, defender) {
  // Базовый урон зависит от уровня (5-15 урона)
  const baseDamage = 5 + Math.floor(attacker.level * 0.5);
  
  // Шанс промаха 15%
  const missChance = 0.15;
  if (Math.random() < missChance) {
    return {
      hit: false,
      damage: 0,
      critical: false,
      message: `${attacker.name} промахнулся! 💨`
    };
  }
  
  // Шанс критического удара 20% (двойной урон)
  const critChance = 0.20;
  const isCritical = Math.random() < critChance;
  
  // Шанс блокировки защитника 10% (половина урона)
  const blockChance = 0.10;
  const isBlocked = Math.random() < blockChance;
  
  let damage = baseDamage;
  
  // Применяем модификаторы
  if (isCritical) {
    damage *= 2;
  }
  
  if (isBlocked) {
    damage = Math.floor(damage * 0.5);
  }
  
  // Случайный разброс урона ±20%
  const variance = 0.8 + Math.random() * 0.4; // от 0.8 до 1.2
  damage = Math.floor(damage * variance);
  
  let message = `${attacker.name} атакует ${defender.name}`;
  
  if (isCritical) {
    message += ' 💥 КРИТИЧЕСКИЙ УДАР!';
  }
  if (isBlocked) {
    message += ' 🛡️ Частично заблокирован!';
  }
  message += ` (${damage} урона)`;
  
  return {
    hit: true,
    damage: damage,
    critical: isCritical,
    blocked: isBlocked,
    message: message
  };
}

// Симуляция полной дуэли
function simulateDuel(challenger, opponent) {
  const battleLog = [];
  let chHP = challenger.health;
  let opHP = opponent.health;
  
  battleLog.push(`⚔️ Дуэль началась! ${challenger.name} (${chHP} HP) vs ${opponent.name} (${opHP} HP)`);
  
  let round = 1;
  const maxRounds = 20; // Максимум 20 раундов
  
  // Определяем, кто атакует первым (50/50)
  let attackers = Math.random() > 0.5 
    ? [challenger, opponent] 
    : [opponent, challenger];
  
  while (chHP > 0 && opHP > 0 && round <= maxRounds) {
    battleLog.push(`\n--- Раунд ${round} ---`);
    
    // Первая атака
    const firstAttacker = attackers[0];
    const firstDefender = attackers[1];
    
    const attack1 = calculateRound(firstAttacker, firstDefender);
    battleLog.push(attack1.message);
    
    if (attack1.hit) {
      if (firstDefender.id === challenger.id) {
        chHP -= attack1.damage;
      } else {
        opHP -= attack1.damage;
      }
    }
    
    // Проверка на победу после первой атаки
    if (chHP <= 0 || opHP <= 0) break;
    
    // Вторая атака (контратака)
    const attack2 = calculateRound(firstDefender, firstAttacker);
    battleLog.push(attack2.message);
    
    if (attack2.hit) {
      if (firstAttacker.id === challenger.id) {
        chHP -= attack2.damage;
      } else {
        opHP -= attack2.damage;
      }
    }
    
    battleLog.push(`${challenger.name}: ${Math.max(0, chHP)} HP | ${opponent.name}: ${Math.max(0, opHP)} HP`);
    
    round++;
  }
  
  // Определяем победителя
  let winner, loser;
  if (chHP > opHP) {
    winner = challenger;
    loser = opponent;
  } else if (opHP > chHP) {
    winner = opponent;
    loser = challenger;
  } else {
    // Ничья - победитель по уровню, если уровни равны - случайно
    if (challenger.level > opponent.level) {
      winner = challenger;
      loser = opponent;
    } else if (opponent.level > challenger.level) {
      winner = opponent;
      loser = challenger;
    } else {
      const coin = Math.random() > 0.5;
      winner = coin ? challenger : opponent;
      loser = coin ? opponent : challenger;
    }
    battleLog.push(`⚖️ Ничья по HP! Победитель определен по жребию.`);
  }
  
  battleLog.push(`\n🏆 Победил ${winner.name}!`);
  
  return {
    winner,
    loser,
    battleLog,
    finalHP: {
      challenger: Math.max(0, chHP),
      opponent: Math.max(0, opHP)
    }
  };
}

router.post('/challenge', (req, res) => {
  const io = req.app.get('io');
  const { challengerName, opponentName } = req.body;
  
  const ch = db.getPlayerByName(challengerName);
  const op = db.getPlayerByName(opponentName);
  
  if (!ch || !op) {
    return res.status(400).json({ error: 'Игроки не найдены' });
  }
  
  const now = Date.now();
  if ((ch.silenced_until || 0) > now) {
    return res.status(403).json({ error: 'Вы под эффектом Молчания' });
  }
  
  // Симулируем дуэль
  const result = simulateDuel(ch, op);
  
  // Обновляем статистику
  if (result.winner.id === ch.id) {
    ch.wins++;
    op.losses++;
  } else {
    op.wins++;
    ch.losses++;
  }
  
  // Небольшая награда опыта за участие
  db.addExperience(ch.id, 5);
  db.addExperience(op.id, 5);
  // Победитель получает больше опыта
  db.addExperience(result.winner.id, 10);
  
  // Сохраняем обновленные данные
  db.updatePlayer(ch);
  db.updatePlayer(op);
  
  // Формируем сообщение для лога
  const mainMsg = `⚔️ ${ch.name} вызвал ${op.name} на дуэль • Победил ${result.winner.name} 🏆`;
  const detailedLog = result.battleLog.join('\n');
  
  // Добавляем в лог основное сообщение
  db.addLog(mainMsg);
  
  // Добавляем детальный лог боя (каждую строку отдельно для лучшей читаемости)
  result.battleLog.forEach(line => {
    if (line.trim()) { // Пропускаем пустые строки
      db.addLog(line);
    }
  });
  
  // Отправляем события
  io.emit('game_log', { 
    message: mainMsg, 
    timestamp: Date.now() 
  });
  
  io.emit('logs_update');
  io.emit('players_update');
  
  res.json({ 
    ok: true, 
    winner: result.winner.name, 
    loser: result.loser.name,
    battleLog: result.battleLog,
    finalHP: result.finalHP
  });
});

module.exports = router;
