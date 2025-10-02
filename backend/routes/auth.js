
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.post('/login', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Имя не может быть пустым' });
  let player = db.getPlayerByName(name);
  const isAdmin = name.toLowerCase().endsWith('admin') ? 1 : 0;
  if (!player) { player = db.createPlayer(name, isAdmin); }
  else if (isAdmin && !player.is_admin) { player.is_admin = 1; db.updatePlayer(player); }
  res.json({ player: db.getPlayerByName(name) });
});

module.exports = router;
