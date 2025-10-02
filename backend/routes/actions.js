
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.post('/heal', (req, res) => {
  const { healerName, targetName, method } = req.body; // method: pushups|shot|squats
  const healer = db.state.players[healerName];
  const target = db.state.players[targetName];
  if(!healer || !healer.is_healer) return res.json({ error: 'Только целитель может лечить' });
  if(!target) return res.json({ error: 'Цель не найдена' });
  if(target.name === healer.name) return res.json({ error: 'Нельзя лечить себя' });
  let amount = 20;
  if(method === 'pushups') amount = 30;
  if(method === 'squats') amount = 25;
  const healed = db.healPlayer(target, amount);
  res.json({ ok: true, healed, target });
});

module.exports = router;
