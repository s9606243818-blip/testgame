const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req,res)=>{ res.json(db.getAllCards()); });

router.post('/dealNewAction', (req,res)=>{
  const b=req.body; const io=req.app.get('io');
  const dealer = (b.dealerName && db.getPlayerByName(b.dealerName)) || null;
  const target = db.getPlayerByName(b.targetName);
  if(!target) return res.status(400).json({error:'Цель не найдена'});
  if(dealer && !dealer.can_give_cards && !dealer.is_admin) return res.status(403).json({error:'Нет прав выдавать карты'});

  const all = db.getAllCards().filter(c=>c.type==='action');
  if(!all.length) return res.status(400).json({error:'Нет action-карт'});
  const card = all[Math.floor(Math.random()*all.length)];

  const hand = target.hand ? JSON.parse(target.hand) : [];
  hand.push(card);
  db.updatePlayerHand(target.id, hand);

  const who = dealer? dealer.name : 'Система';
  const msg = '🃏 '+who+' выдал карту '+card.name+' игроку '+target.name;
  db.addLog(msg);
  io.emit('game_log', { message: msg, timestamp: Date.now()});
  io.emit('players_update', db.getOnlinePlayers());
  io.emit('logs_update');

  res.json({ ok:true, card });
});

module.exports = router;
