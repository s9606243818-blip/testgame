const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.post('/login', (req,res)=>{
  let { name } = req.body;
  if(!name) return res.status(400).json({error:'Введите имя'});
  name = String(name).trim().slice(0,24);
  let isAdmin = 0;
  if(/\badmin$/i.test(name)) { isAdmin = 1; name = name.replace(/\badmin$/i,'').trim(); }
  let p = db.getPlayerByName(name);
  if(!p){ p = db.createPlayer(name, isAdmin); }
  res.json({ player: p });
});

module.exports = router;
