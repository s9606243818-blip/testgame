
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.post('/challenge', (req,res)=>{
  const b=req.body; const io=req.app.get('io');
  const ch=db.getPlayerByName(b.challengerName); const op=db.getPlayerByName(b.opponentName); const card=db.getCardById(b.cardId);
  if(!ch||!op||!card) return res.status(400).json({error:'Неверные данные'});
  if(!op.online) return res.status(400).json({error:'Игрок не в сети'});
  if(card.type!=='attack') return res.status(400).json({error:'Только атакующие карты'});
  const duelId = db.createDuel(ch.id, op.id, card.id);
  if (op.socket_id) io.to(op.socket_id).emit('duel_challenge', { duelId: duelId, challenger: ch.name, card: card, message: ch.name + ' использовал карту "' + card.name + '" на вас!' });
  io.emit('game_log', { message: '⚔️ ' + ch.name + ' вызвал ' + op.name + ' на дуэль с картой "' + card.name + '"', timestamp: Date.now() });
  res.json({ duelId: duelId });
});

router.post('/respond', (req,res)=>{
  const duelId=req.body.duelId; const action=req.body.action; const io=req.app.get('io');
  const duel=db.getDuelById(duelId); if(!duel) return res.status(404).json({error:'Дуэль не найдена'});
  const ch=db.getPlayerById(duel.challenger_id); const op=db.getPlayerById(duel.opponent_id); const card=db.getCardById(duel.card_id);
  if(action==='decline'){ db.updateDuelStatus(duelId,'declined'); io.emit('game_log',{message: op.name + ' отклонил вызов от ' + ch.name, timestamp: Date.now()}); return res.json({ok:true}); }
  const newHP = Math.max(0, op.health - card.damage);
  db.updatePlayerHealth(op.id, newHP); db.incPlayed(ch.id,1); db.incReceived(op.id,1);
  io.emit('game_log',{message: '💥 ' + ch.name + ' нанёс ' + card.damage + ' урона игроку ' + op.name + ' (HP: ' + newHP + '/' + op.max_health + ')', timestamp: Date.now()});
  if(newHP===0){ db.updateDuelStatus(duelId,'completed',ch.id); db.updatePlayerStats(ch.id,true); db.updatePlayerStats(op.id,false); const exp=db.addExperience(ch.id,50); var lvlMsg = exp.leveledUp ? (' Новый уровень: ' + exp.newLevel + '!') : ''; io.emit('game_log',{message:'🏆 ' + ch.name + ' победил в дуэли!' + lvlMsg, timestamp: Date.now()}); db.updatePlayerHealth(op.id, op.max_health); }
  else { db.updateDuelStatus(duelId,'completed'); db.addExperience(ch.id,10); }
  io.emit('players_update', db.getOnlinePlayers());
  res.json({ ok:true });
});

module.exports = router;
