
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.post('/login', (req, res) => {
  const { name } = req.body;
  if(!name) return res.json({ error: 'Укажите имя' });
  const p = db.ensurePlayer(name.trim());
  db.assignRolesIfNeeded(p);
  return res.json({ player: p });
});

module.exports = router;
