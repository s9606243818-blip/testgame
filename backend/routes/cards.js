
const express = require('express');
const router = express.Router();
const db = require('../db/database');
router.get('/', (req,res)=>{ res.json(db.getAllCards()); });
router.post('/', (req,res)=>{ const b=req.body; if(!b.name||!b.type) return res.status(400).json({error:'Название и тип обязательны'}); res.json(db.createCard(b.name,b.type,b.damage,b.heal,b.task,b.description)); });
module.exports = router;
