const express = require('express');
const router = express.Router();
const db = require('../db/database');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req,file,cb)=>cb(null, path.join(__dirname,'../../static/avatars')),
  filename: (req,file,cb)=>{ const ext = path.extname(file.originalname); cb(null, Date.now() + '_' + Math.random().toString(36).slice(2) + ext); }
});
const upload = multer({ storage });

router.get('/online', (req,res)=>{ res.json(db.getOnlinePlayers()); });
router.get('/hand', (req,res)=>{ const name = req.query.name; const p = db.getPlayerByName(name); if(!p) return res.status(404).json({error:'Игрок не найден'}); const hand=p.hand?JSON.parse(p.hand):[]; res.json(hand); });
router.get('/logs', (req,res)=>{ const limit = parseInt(req.query.limit||'50',10); res.json(db.getLogs(limit)); });
router.get('/:name', (req,res)=>{ const p=db.getPlayerByName(req.params.name); if(!p) return res.status(404).json({error:'Игрок не найден'}); res.json(p); });

router.post('/avatar', upload.single('avatar'), (req,res)=>{
  const playerName = req.body.playerName;
  const io = req.app.get('io');
  if (!playerName || !req.file) return res.status(400).json({ error: 'Неверные данные' });
  const p = db.getPlayerByName(playerName);
  if (!p) return res.status(404).json({ error: 'Игрок не найден' });
  const avatarPath = '/static/avatars/' + req.file.filename;
  db.setAvatar(playerName, avatarPath);
  const updated = db.getPlayerByName(playerName);
  io.emit('player_updated', updated);
  io.emit('players_update', db.getOnlinePlayers());
  db.addLog('🖼️ '+updated.name+' обновил аватар');
  io.emit('logs_update');
  res.json({ message: 'Аватар обновлён', player: updated });
});

router.post('/setHealer', (req,res)=>{
  const adminName = req.body.adminName;
  const targetName = req.body.targetName;
  const isHealer = !!req.body.isHealer;
  const io = req.app.get('io');
  const admin = db.getPlayerByName(adminName);
  const target = db.getPlayerByName(targetName);
  if (!admin || !target) return res.status(400).json({ error: 'Неверные игроки' });
  if (!admin.is_admin) return res.status(403).json({ error: 'Нет прав' });
  db.setHealer(targetName, isHealer);
  const updated = db.getPlayerByName(targetName);
  io.emit('player_updated', updated);
  io.emit('players_update', db.getOnlinePlayers());
  db.addLog('👑 '+admin.name+(isHealer?' назначил 🌿 целителя у ':' снял 🌿 целителя у ')+updated.name);
  io.emit('logs_update');
  res.json({ message: 'Роль обновлена', player: updated });
});

module.exports = router;
