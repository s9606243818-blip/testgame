const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Heal (healer only)
router.post('/heal', (req,res)=>{
  const b=req.body; const io=req.app.get('io');
  const healer=db.getPlayerByName(b.healerName);
  const target=db.getPlayerByName(b.targetName);
  if(!healer||!target) return res.status(400).json({error:'Неверные данные'});
  if(!healer.is_healer) return res.status(403).json({error:'Только целитель может лечить'});
  if(healer.name===target.name) return res.status(400).json({error:'Нельзя лечить себя'});

  const method = b.method || 'pushups';
  let healAmount = 30; let taskText='Выпей шот';
  if(method==='pushups'){ healAmount=20; taskText='Отожмись 20 раз'; }
  else if(method==='squats'){ healAmount=25; taskText='Присядь 20 раз'; }

  const newHP = Math.min(target.health + healAmount, target.max_health);
  db.updatePlayerHealth(target.id, newHP);
  db.addLog('🌿 '+healer.name+' исцелил '+target.name+' ('+taskText+') на '+healAmount+' HP');
  io.emit('game_log',{ message: '🌿 '+healer.name+' исцелил '+target.name+' ('+taskText+') на '+healAmount+' HP', timestamp: Date.now() });
  io.emit('players_update', db.getOnlinePlayers());
  io.emit('logs_update');
  res.json({ ok:true, healed: healAmount, newHP });
});

// Use action card
router.post('/useAction', (req,res)=>{
  const b=req.body; const io=req.app.get('io');
  const from = db.getPlayerByName(b.fromName);
  const card = db.getCardById(b.cardId);
  if(!from||!card) return res.status(400).json({error:'Неверные данные'});
  if(card.type!=='action') return res.status(400).json({error:'Это не action-карта'});

  // Check silence
  const now = Date.now();
  if((from.silenced_until||0) > now){
    return res.status(403).json({error:'Вы под эффектом Молчания и не можете использовать карты сейчас'});
  }

  // Remove from hand (one-time)
  const hand = from.hand ? JSON.parse(from.hand) : [];
  const idx = hand.findIndex(c => String(c.id) === String(card.id));
  if(idx === -1) return res.status(400).json({error:'Карты нет в руке'});
  hand.splice(idx,1);
  db.updatePlayerHand(from.id, hand);

  // Target select
  let target = from;
  if(card.scope==='other'){
    if(!b.targetName) return res.status(400).json({error:'Нужна цель'});
    target = db.getPlayerByName(b.targetName);
    if(!target) return res.status(404).json({error:'Цель не найдена'});
    if(target.name===from.name) return res.status(400).json({error:'Выберите другого игрока'});
  }

  let logParts = [from.name+' использовал карту \"'+card.name+'\"']
  if(card.scope==='other') logParts.push('на '+target.name);

  // Effects
  if(card.effect_exp){ const r = db.addExperience(target.id, card.effect_exp); logParts.push('+'+card.effect_exp+' опыта'); if(r.leveledUp){ logParts.push('🎉 '+target.name+' уровень '+r.newLevel); } }
  if(card.effect_hp){ const newHP=Math.min(target.health+card.effect_hp, target.max_health); db.updatePlayerHealth(target.id, newHP); logParts.push('+'+card.effect_hp+' HP'); }
  if(card.effect_duel_quota){ db.addDuelQuota(target.id, card.effect_duel_quota); logParts.push('+'+card.effect_duel_quota+' дуэлей'); }
  if(card.effect_silence_seconds){ const until = Date.now()+card.effect_silence_seconds*1000; db.setSilencedUntil(target.id, until); logParts.push('🔇 молчание '+card.effect_silence_seconds+'с'); }

  const logMsg = logParts.join(' ');
  db.addLog(logMsg);
  io.emit('game_log', { message: logMsg, timestamp: Date.now() });
  io.emit('players_update', db.getOnlinePlayers());
  io.emit('logs_update');

  res.json({ ok:true });
});

module.exports = router;
