
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  // Возвращаем только атакующие и (для целителя) лечебные
  const { name } = req.query;
  const p = name ? db.state.players[name] : null;
  const base = db.state.cards.filter(c => c.type === 'attack');
  if(p && p.is_healer){
    base.push(...db.state.cards.filter(c => c.type === 'heal'));
  }
  res.json(base);
});

router.post('/dealNewAction', (req, res) => {
  const { dealerName, targetName } = req.body;
  const dealer = db.state.players[dealerName];
  const target = db.state.players[targetName];
  if(!dealer || !dealer.can_give_cards) return res.json({ error: 'Нет прав выдавать карты' });
  if(!target) return res.json({ error: 'Цель не найдена' });
  const excludeIds = new Set(target.hand.map(c => c.id));
  const card = db.randomActionCard(excludeIds);
  if(!card) return res.json({ error: 'Новые карты закончились' });
  target.hand.push(card);
  target.cards_received += 1;
  res.json({ ok: true, card });
});

module.exports = router;
