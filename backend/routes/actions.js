
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.post('/heal', (req,res)=>{
  const b=req.body; const io=req.app.get('io');
  const healer=db.getPlayerByName(b.healerName); const target=db.getPlayerByName(b.targetName); const card=db.getCardById(b.cardId);
  if(!healer||!target||!card) return res.status(400).json({error:'Неверные данные'});
  if(card.type!=='heal') return res.status(400).json({error:'Не лечебная карта'});
  if(!healer.is_healer) return res.status(403).json({error:'Только целитель может лечить'});
  if(healer.name===target.name) return res.status(400).json({error:'Нельзя лечить себя'});
  const newHP = Math.min(target.health + card.heal, target.max_health);
  db.updatePlayerHealth(target.id, newHP); db.incPlayed(healer.id,1); db.incReceived(target.id,1);
  io.emit('game_log',{message: '🌿 ' + healer.name + ' исцелил ' + target.name + ' картой "' + card.name + '" (' + (card.task || '') + ') на ' + card.heal + ' HP (HP: ' + newHP + '/' + target.max_health + ')', timestamp: Date.now()});
  io.emit('players_update', db.getOnlinePlayers());
  res.json({ ok:true, newHP:newHP });
});

module.exports = router;
