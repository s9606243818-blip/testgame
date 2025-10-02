
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
var playerCardsPlayed = document.getElementById('player-cards-played');
var playerCardsReceived = document.getElementById('player-cards-received');
var playerRoles = document.getElementById('player-roles');
var cardsContainer = document.getElementById('cards-container');
var onlinePlayersList = document.getElementById('online-players-list');
var logMessages = document.getElementById('log-messages');

function showToast(text, type){ if(!type) type='success'; var cont=document.getElementById('toast-container'); var t=document.createElement('div'); t.className='toast '+type; t.textContent=text; cont.appendChild(t); setTimeout(function(){ t.remove(); },3000); }

loginBtn.addEventListener('click', function(){
  var name = (playerNameInput.value||'').trim();
  if(!name){ loginError.textContent='Введите имя'; return; }
  fetch('/api/auth/login',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:name})})
    .then(function(r){return r.json()})
    .then(function(data){ if(data.error){ loginError.textContent=data.error; return; } currentPlayer=data.player; socket.emit('player_online', currentPlayer.name); loginScreen.classList.remove('active'); gameScreen.classList.add('active'); updatePlayerCard(); loadCards(); loadOnlinePlayers(); })
    .catch(function(){ loginError.textContent='Ошибка подключения'; });
});

avatarInput.addEventListener('change', function(e){ var f=e.target.files[0]; if(!f) return; var fd=new FormData(); fd.append('avatar', f); fd.append('playerName', currentPlayer.name); fetch('/api/players/avatar',{method:'POST', body: fd}).then(function(r){return r.json()}).then(function(d){ if(d.error){ showToast(d.error,'error'); return; } currentPlayer=d.player; updatePlayerCard(); showToast('Аватар обновлён'); }).catch(function(){ showToast('Ошибка загрузки','error'); }); });

function updatePlayerCard(){ playerAvatar.src=currentPlayer.avatar; playerName.textContent=currentPlayer.name; playerLevel.textContent=currentPlayer.level; playerHealth.textContent=currentPlayer.health; playerMaxHealth.textContent=currentPlayer.max_health; playerExp.textContent=currentPlayer.experience; playerWins.textContent=currentPlayer.wins; playerLosses.textContent=currentPlayer.losses; playerCardsPlayed.textContent=currentPlayer.cards_played||0; playerCardsReceived.textContent=currentPlayer.cards_received||0; var roles=[]; if(currentPlayer.is_admin) roles.push('👑 админ'); if(currentPlayer.is_healer) roles.push('🌿 целитель'); playerRoles.textContent=roles.length?roles.join(', '):'—'; }

function loadCards(){ fetch('/api/cards').then(function(r){return r.json()}).then(function(cards){ cardsContainer.innerHTML=''; cards.forEach(function(card){ var el=document.createElement('div'); el.className='card '+card.type; el.innerHTML='<h4>'+card.name+'</h4><p>'+(card.description||'')+'</p>'+ (card.damage?('<p>💥 '+card.damage+'</p>'):'') + (card.heal?('<p>💚 '+card.heal+'</p>'):''); if(card.type==='heal' && !currentPlayer.is_healer) el.classList.add('disabled'); el.addEventListener('click', function(){ if(card.type==='attack'){ if(!selectedOpponent) return showToast('Выберите противника','error'); fetch('/api/duels/challenge',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ challengerName: currentPlayer.name, opponentName: selectedOpponent.name, cardId: card.id })}).then(function(r){return r.json()}).then(function(d){ if(d.error) showToast(d.error,'error'); else showToast('Вызов отправлен'); }); } else { if(!currentPlayer.is_healer) return showToast('Только целитель может лечить','error'); if(!selectedOpponent) return showToast('Выберите игрока для лечения','error'); if(selectedOpponent.name===currentPlayer.name) return showToast('Нельзя лечить себя','error'); fetch('/api/actions/heal',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ healerName: currentPlayer.name, targetName: selectedOpponent.name, cardId: card.id })}).then(function(r){return r.json()}).then(function(d){ if(d.error) showToast(d.error,'error'); else showToast('Вы исцелили '+selectedOpponent.name); }); } }); cardsContainer.appendChild(el); }); }); }

function loadOnlinePlayers(){ fetch('/api/players/online').then(function(r){return r.json()}).then(function(players){ onlinePlayersList.innerHTML=''; players.forEach(function(p){ if(p.name===currentPlayer.name) return; var el=document.createElement('div'); el.className='player-item'+(selectedOpponent&&selectedOpponent.name===p.name?' selected':''); el.innerHTML='<img src="'+p.avatar+'" alt="'+p.name+'"><div><strong>'+p.name+' '+(p.is_admin?'👑':'')+' '+(p.is_healer?'🌿':'')+'</strong><div class="meta">Lvl '+p.level+' • HP '+p.health+'/'+p.max_health+' • карты '+(p.cards_played||0)+'/'+(p.cards_received||0)+'</div></div>'; el.addEventListener('click', function(){ selectedOpponent=p; loadOnlinePlayers(); }); if(currentPlayer.is_admin){ var btn=document.createElement('button'); btn.textContent=p.is_healer?'Снять целителя':'Назначить целителем'; btn.className='btn-success'; btn.style.marginLeft='8px'; btn.addEventListener('click', function(ev){ ev.stopPropagation(); fetch('/api/players/setHealer',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ adminName: currentPlayer.name, targetName: p.name, isHealer: p.is_healer?0:1 })}).then(function(r){return r.json()}).then(function(d){ if(d.error) showToast(d.error,'error'); else showToast('Роль обновлена'); }); }); el.appendChild(btn); }
    onlinePlayersList.appendChild(el); }); }); }

socket.on('players_update', function(){ fetch('/api/players/'+currentPlayer.name).then(function(r){return r.json()}).then(function(p){ currentPlayer=p; updatePlayerCard(); loadOnlinePlayers(); }); });

socket.on('player_updated', function(player){ if(player.name===currentPlayer.name){ currentPlayer=player; updatePlayerCard(); } loadOnlinePlayers(); });

socket.on('game_log', function(data){ var el=document.createElement('div'); el.className='log-message'; el.textContent=data.message; logMessages.prepend(el); while(logMessages.children.length>100){ logMessages.removeChild(logMessages.lastChild); } });
