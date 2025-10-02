
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// Хелперы вероятностей
function dodgeChance(level){
  return Math.min(0.95, 0.50 + (level - 1) * 0.05);
}

function hitLocation(){
  const roll = Math.random();
  if(roll < 0.15) return { part: 'голова', dmg: 50 };
  if(roll < 0.55) return { part: 'туловище', dmg: 30 };
  if(roll < 0.75) return { part: 'правая рука', dmg: 20 };
  if(roll < 0.95) return { part: 'левая рука', dmg: 20 };
  return { part: 'нога', dmg: 20 };
}

router.post('/challenge', (req, res) => {
  const { challengerName, opponentName } = req.body;
  const A = db.state.players[challengerName];
  const B = db.state.players[opponentName];
  if(!A || !B) return res.json({ error: 'Игроки не найдены' });
  if(A.unconscious) return res.json({ error: 'Вы без сознания' });
  if(B.unconscious) return res.json({ error: 'Противник без сознания' });
  if(!db.canSendDuel(A, B.name)) return res.json({ error: 'Лимит дуэлей с этим игроком исчерпан' });
  const duelId = uuidv4();
  // В реальном сервере сигнал через socket.io отправляется здесь
  // Здесь просто возвращаем данные
  db.recordDuelSent(A, B.name);
  res.json({ ok: true, duelId, challenger: A.name, opponent: B.name });
});

router.post('/respond', (req, res) => {
  const { duelId, action, challengerName, opponentName } = req.body;
  const A = db.state.players[challengerName];
  const B = db.state.players[opponentName];
  if(!A || !B) return res.json({ error: 'Игроки не найдены' });

  if(action === 'decline'){
    // Автопоражение отказавшегося
    B.losses += 1;
    A.wins += 1;
    db.grantExp(A, 50);
    db.grantExp(B, 25);
    return res.json({ ok: true, result: 'declined', winner: A.name, loser: B.name, log: [`${B.name} отказался от дуэли — автоматическое поражение`, `${A.name} получает 50 опыта, ${B.name} получает 25 опыта`] });
  }

  // action === 'accept' — моделируем обмен выстрелами
  const aDodge = Math.random() < dodgeChance(A.level);
  const bDodge = Math.random() < dodgeChance(B.level);

  let logs = [];
  let aHit = !bDodge && Math.random() < 0.5; // шанс попасть (кроме уклонения)
  let bHit = !aDodge && Math.random() < 0.5;

  let aResult = null, bResult = null;

  if(aHit){
    aResult = hitLocation();
    db.damagePlayer(B, aResult.dmg);
    logs.push(`${A.name} попал в ${B.name}: ${aResult.part} (-${aResult.dmg} HP)`);
  } else {
    logs.push(`${A.name} стрелял, но промахнулся`);
  }

  if(bHit){
    bResult = hitLocation();
    db.damagePlayer(A, bResult.dmg);
    logs.push(`${B.name} попал в ${A.name}: ${bResult.part} (-${bResult.dmg} HP)`);
  } else {
    logs.push(`${B.name} стрелял, но промахнулся`);
  }

  // Опыт: участвовали оба. За попадание +50, за промах +25
  if(aHit) db.grantExp(A, 50); else db.grantExp(A, 25);
  if(bHit) db.grantExp(B, 50); else db.grantExp(B, 25);

  // Победа/поражение: у кого есть попадание и у другого нет — тот победил.
  let winner = null, loser = null;
  if(aHit && !bHit){ winner = A; loser = B; }
  else if(bHit && !aHit){ winner = B; loser = A; }
  else if(aHit && bHit){ // оба попали — победитель тот, кто больше урона нанёс
    const aD = aResult ? aResult.dmg : 0;
    const bD = bResult ? bResult.dmg : 0;
    if(aD > bD){ winner = A; loser = B; }
    else if(bD > aD){ winner = B; loser = A; }
  }

  if(winner && loser){
    winner.wins += 1; loser.losses += 1;
    logs.push(`Победитель дуэли: ${winner.name}`);
  } else {
    logs.push('Дуэль завершилась без явного победителя');
  }

  return res.json({ ok: true, logs, A: db.state.players[A.name], B: db.state.players[B.name] });
});

module.exports = router;
