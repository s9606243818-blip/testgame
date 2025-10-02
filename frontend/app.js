
var socket = io('http://localhost:3000');
var currentPlayer = null;
var selectedOpponent = null;
var loginScreen = document.getElementById('login-screen');
var gameScreen = document.getElementById('game-screen');
var playerNameInput = document.getElementById('player-name-input');
var loginBtn = document.getElementById('login-btn');
var loginError = document.getElementById('login-error');
var playerAvatar = document.getElementById('player-avatar');
var avatarInput = document.getElementById('avatar-input');
var playerName = document.getElementById('player-name');
var playerLevel = document.getElementById('player-level');
var playerHealth = document.getElementById('player-health');
var playerMaxHealth = document.getElementById('player-max-health');
var playerExp = document.getElementById('player-exp');
var playerWins = document.getElementById('player-wins');
var playerLosses = document.getElementById('player-losses');
var playerRoles = document.getElementById('player-roles');
var playerCardsOnhand = document.getElementById('player-cards-onhand');
var playerCardsUsed = document.getElementById('player-cards-used');
var cardsContainer = document.getElementById('cards-container');
var onlinePlayersList = document.getElementById('online-players-list');
var logMessages = document.getElementById('log-messages');
var requestHealBtn = document.getElementById('request-heal-btn');
var dealActionCardBtn = document.getElementById('deal-action-card-btn');
var restartBtn = document.getElementById('restart-btn');
var guessRoleBtn = document.getElementById('guess-role-btn');

var currentDuel = null;

function showToast(text, type){ if(!type) type='success'; var cont=document.getElementById('toast-container'); var t=document.createElement('div'); t.className='toast '+type; t.textContent=text; cont.appendChild(t); setTimeout(function(){ t.remove(); },3000); }

loginBtn.addEventListener('click', function(){
  var name = (playerNameInput.value||'').trim();
  if(!name){ loginError.textContent='Введите имя'; return; }
  fetch('/api/auth/login',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:name})})
    .then(function(r){return r.json()})
    .then(function(data){ if(data.error){ loginError.textContent=data.error; return; } currentPlayer=data.player; socket.emit('player_online', currentPlayer.name); loginScreen.classList.remove('active'); gameScreen.classList.add('active'); updatePlayerCard(); loadCards(); loadOnlinePlayers(); })
    .catch(function(){ loginError.textContent='Ошибка подключения'; });
});

if(requestHealBtn){ requestHealBtn.addEventListener('click', function(){
  fetch('/api/players/requestHealing',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fromName: currentPlayer.name })})
   .then(r=>r.json()).then(d=>{ if(d.error) showToast(d.error,'error'); else showToast('Запрос отправлен целителю. Он уже натягивает белый халат!'); });
}); }

if(dealActionCardBtn){ dealActionCardBtn.addEventListener('click', function(){
  if(!selectedOpponent) return showToast('Выберите игрока, кому выдать карту','error');
  fetch('/api/cards/dealNewAction',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ dealerName: currentPlayer.name, targetName: selectedOpponent.name })})
    .then(r=>r.json()).then(d=>{ if(d.error) return showToast(d.error,'error'); showToast('Выдана новая карта: '+d.card.name); });
}); }

if(restartBtn){ restartBtn.addEventListener('click', function(){
  fetch('/api/players/restart',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ adminName: currentPlayer.name })})
    .then(r=>r.json()).then(d=>{ if(d.error) showToast(d.error,'error'); else { showToast('Игра перезапущена'); loadOnlinePlayers(); updatePlayerCard(); } });
}); }

avatarInput.addEventListener('change', function(e){ var f=e.target.files[0]; if(!f) return; var fd=new FormData(); fd.append('playerName', currentPlayer.name); fetch('/api/players/avatar',{method:'POST', body: fd}).then(function(r){return r.json()}).then(function(d){ if(d.error){ showToast(d.error,'error'); return; } currentPlayer=d.player; updatePlayerCard(); showToast('Аватар обновлён'); }).catch(function(){ showToast('Ошибка загрузки','error'); }); });

function updatePlayerCard(){
  playerAvatar.src=currentPlayer.avatar;
  playerName.textContent=currentPlayer.name + (currentPlayer.roles.ghost?' 👻':'');
  playerLevel.textContent=currentPlayer.level; playerHealth.textContent=currentPlayer.health; playerMaxHealth.textContent=currentPlayer.max_health;
  playerExp.textContent=currentPlayer.experience; playerWins.textContent=currentPlayer.wins; playerLosses.textContent=currentPlayer.losses;
  playerCardsOnhand.textContent = currentPlayer.hand ? currentPlayer.hand.length : 0;
  playerCardsUsed.textContent = currentPlayer.usedCards || 0;
  var roles=[]; if(currentPlayer.is_admin) roles.push('👑 админ'); if(currentPlayer.is_healer) roles.push('🌿 целитель'); if(currentPlayer.can_give_cards) roles.push('🃏 выдает карты');
  if(currentPlayer.roles.primary) roles.push('🔸 '+currentPlayer.roles.primary.name);
  if(currentPlayer.roles.secondary) roles.push('🔹 '+currentPlayer.roles.secondary.name);
  playerRoles.textContent=roles.length?roles.join(', '):'—';
}

function loadCards(){
  fetch('/api/cards?name='+encodeURIComponent(currentPlayer.name)).then(r=>r.json()).then(function(cards){
    cardsContainer.innerHTML='';
    cards.forEach(function(card){
      var el=document.createElement('div');
      el.className='card '+card.type; el.innerHTML='<h4>'+card.name+'</h4><p>'+(card.description||'')+'</p>';
      if(card.type==='heal' && !currentPlayer.is_healer) el.style.display='none';
      el.addEventListener('click', function(){
        if(currentPlayer.unconscious) return showToast('Вы без сознания. Вас должен исцелить целитель.','error');
        if(card.type==='attack'){
          if(!selectedOpponent) return showToast('Выберите противника','error');
          fetch('/api/duels/challenge',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ challengerName: currentPlayer.name, opponentName: selectedOpponent.name })})
            .then(r=>r.json()).then(d=>{ if(d.error) showToast(d.error,'error'); else showToast('Вызов отправлен'); });
        } else if(card.type==='heal'){
          if(!currentPlayer.is_healer) return showToast('Только целитель может лечить','error');
          if(!selectedOpponent || selectedOpponent.name===currentPlayer.name) return showToast('Выберите другого игрока','error');
          const method = prompt('Выберите метод: pushups | shot | squats','pushups') || 'pushups';
          fetch('/api/actions/heal',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ healerName: currentPlayer.name, targetName: selectedOpponent.name, method })})
            .then(r=>r.json()).then(d=>{ if(d.error) showToast(d.error,'error'); else showToast('Исцелили '+selectedOpponent.name+' на '+d.healed+' HP'); });
        }
      });
      cardsContainer.appendChild(el);
    });
  });
}

function loadOnlinePlayers(){ fetch('/api/players/online').then(r=>r.json()).then(function(players){ onlinePlayersList.innerHTML=''; players.forEach(function(p){ if(p.name===currentPlayer.name) return; var el=document.createElement('div'); el.className='player-item'+(selectedOpponent&&selectedOpponent.name===p.name?' selected':''); el.innerHTML='<img src="'+p.avatar+'" alt="'+p.name+'"><div><strong>'+p.name+' '+(p.is_admin?'👑':'')+' '+(p.is_healer?'🌿':'')+' '+(p.can_give_cards?'🃏':'')+(p.roles.ghost?' 👻':'')+'</strong><div class="meta">Lvl '+p.level+' • HP '+p.health+'/'+p.max_health+'</div></div>'; el.addEventListener('click', function(){ selectedOpponent=p; loadOnlinePlayers(); }); if(currentPlayer.is_admin){ var btn=document.createElement('button'); btn.textContent=p.is_healer?'Снять целителя':'Назначить целителем'; btn.className='btn-success'; btn.style.marginLeft='8px'; btn.addEventListener('click', function(ev){ ev.stopPropagation(); fetch('/api/players/setHealer',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ adminName: currentPlayer.name, targetName: p.name, isHealer: p.is_healer?0:1 })}).then(function(r){return r.json()}).then(function(d){ if(d.error) showToast(d.error,'error'); else showToast('Роль обновлена'); }); }); el.appendChild(btn); }
      onlinePlayersList.appendChild(el); }); }); }

socket.on('players_update', function(){ fetch('/api/players/'+currentPlayer.name).then(function(r){return r.json()}).then(function(p){ currentPlayer=p; updatePlayerCard(); loadOnlinePlayers(); }); });

socket.on('game_log', function(data){ var el=document.createElement('div'); el.className='log-message'; el.textContent=data.message; logMessages.prepend(el); while(logMessages.children.length>100){ logMessages.removeChild(logMessages.lastChild); } });

// Дуэль модалка — здесь показываем фиктивно, т.к. в этом примере ответ формируется через REST
var acceptBtn = document.getElementById('accept-duel-btn');
var declineBtn = document.getElementById('decline-duel-btn');

function closeDuelModal(){
  var modal = document.getElementById('duel-modal');
  if(modal) modal.classList.remove('active');
  currentDuel = null;
}

if(acceptBtn){ acceptBtn.addEventListener('click', function(){
  if(!currentDuel) return;
  fetch('/api/duels/respond',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ duelId: currentDuel.duelId, action: 'accept', challengerName: currentDuel.challenger, opponentName: currentPlayer.name })})
    .then(r=>r.json()).then(d=>{ if(d.error) return showToast(d.error,'error'); (d.logs||[]).forEach(m=>showToast(m)); closeDuelModal(); updateMe(); });
}); }

if(declineBtn){ declineBtn.addEventListener('click', function(){
  if(!currentDuel) return;
  fetch('/api/duels/respond',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ duelId: currentDuel.duelId, action: 'decline', challengerName: currentDuel.challenger, opponentName: currentPlayer.name })})
    .then(r=>r.json()).then(d=>{ if(d.error) return showToast(d.error,'error'); (d.log||[]).concat(d.logs||[]).forEach(m=>showToast(m)); closeDuelModal(); updateMe(); });
}); }

function updateMe(){ fetch('/api/players/'+currentPlayer.name).then(r=>r.json()).then(p=>{ currentPlayer=p; updatePlayerCard(); }); }

// Пример: имитация входящего вызова на дуэль — в реале придёт по socket от сервера
socket.on('duel_challenge', function(data){
  currentDuel = data;
  var msg = data.challenger + ' вызвал вас на дуэль!';
  document.getElementById('duel-message').textContent = msg;
  var modal = document.getElementById('duel-modal');
  if (modal) modal.classList.add('active');
});
