
const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/online', (req, res) => {
  res.json(db.onlineList());
});

router.get('/:name', (req, res) => {
  const p = db.state.players[req.params.name];
  if(!p) return res.json({ error: 'Игрок не найден' });
  res.json(p);
});

router.post('/setHealer', (req, res) => {
  const { adminName, targetName, isHealer } = req.body;
  const admin = db.state.players[adminName];
  const target = db.state.players[targetName];
  if(!admin || !admin.is_admin) return res.json({ error: 'Только админ' });
  if(!target) return res.json({ error: 'Игрок не найден' });
  target.is_healer = !!isHealer;
  res.json({ ok: true, player: target });
});

router.post('/avatar', (req, res) => {
  // Для демо: просто ставим заглушку
  const { playerName } = req.body || {};
  const p = db.state.players[playerName];
  if(!p) return res.json({ error: 'Игрок не найден' });
  p.avatar = '/avatars/default.png';
  res.json({ player: p });
});

router.post('/requestHealing', (req, res) => {
  const { fromName } = req.body;
  const p = db.state.players[fromName];
  if(!p) return res.json({ error: 'Игрок не найден' });
  // уведомление всем целителям
  Object.values(db.state.players).forEach(pl => {
    if(pl.is_healer){
      pl.notifications.push({ type: 'heal_request', from: fromName, text: 'Нужна помощь! Срочно требуется исцеление.' });
    }
  });
  res.json({ ok: true, message: 'Запрос на лечение отправлен целителю. Держись крепче, врач уже бежит!' });
});

router.post('/restart', (req, res) => {
  const { adminName } = req.body;
  const admin = db.state.players[adminName];
  if(!admin || !admin.is_admin) return res.json({ error: 'Только админ' });
  Object.values(db.state.players).forEach(p => {
    p.level = 1; p.experience = 0; p.health = 100; p.max_health = 100;
    p.wins = 0; p.losses = 0; p.cards_played = 0; p.cards_received = 0;
    p.unconscious = false; p.roles.revealed = false; p.roles.ghost = false;
    p.duelSent = {}; p.lastLevelForDuelQuota = 1; p.hand = []; p.usedCards = 0; p.notifications = [];
  });
  res.json({ ok: true });
});

module.exports = router;
