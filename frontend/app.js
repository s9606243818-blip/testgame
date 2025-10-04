var socket = io();
var currentPlayer = null;
var selectedOpponent = null;

var playerNameEl = document.getElementById('player-name');
var playerAvatarEl = document.getElementById('player-avatar');
var avatarInput = document.getElementById('avatar-input');
var playerLevelEl = document.getElementById('player-level');
var playerHealthEl = document.getElementById('player-health');
var playerMaxHealthEl = document.getElementById('player-max-health');
var playerExpEl = document.getElementById('player-exp');
var playerRolesEl = document.getElementById('player-roles');
var myHandCountEl = document.getElementById('my-hand-count');
var cardsContainer = document.getElementById('cards-container');
var onlineList = document.getElementById('online-players-list');
var logsEl = document.getElementById('log-messages');
var requestHealBtn = document.getElementById('request-heal-btn');
var requestCardBtn = document.getElementById('request-card-btn');
var restartBtn = document.getElementById('restart-btn');
var setHealerBtn = document.getElementById('set-healer-btn');
var unsetHealerBtn = document.getElementById('unset-healer-btn');
var setDealerBtn = document.getElementById('set-dealer-btn');
var unsetDealerBtn = document.getElementById('unset-dealer-btn');
var setBartenderBtn = document.getElementById('set-bartender-btn');
var unsetBartenderBtn = document.getElementById('unset-bartender-btn');
var healerPanel = document.getElementById('healer-panel');
var healerTasksEl = document.getElementById('healer-tasks');
var dealerPanel = document.getElementById('dealer-panel');
var dealerRequestsEl = document.getElementById('dealer-requests');
var bartenderPanel = document.getElementById('bartender-panel');
var bartenderTasksEl = document.getElementById('bartender-tasks');

// Duel modal
var duelModal = document.getElementById('duel-modal');
var duelTitle = document.getElementById('duel-title');
var duelText = document.getElementById('duel-text');
var duelAccept = document.getElementById('duel-accept');
var duelDecline = document.getElementById('duel-decline');
var pendingDuel = null;

function openDuelModal(challenger, opponent, duelId) {
  pendingDuel = { challenger, opponent, duelId };
  duelTitle.textContent = 'Вызов на дуэль';
  duelText.textContent = challenger + ' вызвал вас на дуэль';
  duelModal.style.display = 'flex';
}
function closeDuelModal(){ duelModal.style.display = 'none'; pendingDuel = null; }

duelAccept.addEventListener('click', function(){
  if(!pendingDuel || !currentPlayer) return closeDuelModal();
  fetch('/api/duels/respond', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ duelId: pendingDuel.duelId, action:'accept', challengerName: pendingDuel.challenger, opponentName: pendingDuel.opponent })
  }).then(r=>r.json()).then(d=>{
    if(d.error) toast(d.error,'error');
    closeDuelModal();
  }).catch(()=> closeDuelModal());
});

duelDecline.addEventListener('click', function(){
  if(!pendingDuel || !currentPlayer) return closeDuelModal();
  fetch('/api/duels/respond', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ duelId: pendingDuel.duelId, action:'decline', challengerName: pendingDuel.challenger, opponentName: pendingDuel.opponent })
  }).then(r=>r.json()).then(d=>{
    if(d.error) toast(d.error,'error');
    closeDuelModal();
  }).catch(()=> closeDuelModal());
});

function toast(msg, type){
  var c=document.getElementById('toast-container');
  if(!c){ c=document.createElement('div'); c.id='toast-container'; c.style.position='fixed'; c.style.top='10px'; c.style.right='10px'; c.style.zIndex='2000'; document.body.appendChild(c); }
  var t=document.createElement('div');
  t.style.background = type==='error' ? '#e5484d' : '#2b9348';
  t.style.color = '#fff';
  t.style.padding = '10px 12px';
  t.style.marginTop = '6px';
  t.style.borderRadius = '10px';
  t.style.boxShadow = '0 4px 10px rgba(0,0,0,.25)';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(()=>{ if(document.body.contains(t)) t.remove(); }, 3000);
}

var loginBtn = document.getElementById('login-btn');
loginBtn.addEventListener('click', function(){
  if (currentPlayer) { toast('Вы уже вошли', 'error'); return; }
  var name = (document.getElementById('player-name-input').value||'').trim();
  if(!name) return toast('Введите имя','еrror');
  loginBtn.disabled = true;
  fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) })
    .then(r=>r.json()).then(d=>{
      if(d.error) { loginBtn.disabled=false; return toast(d.error,'error'); }
      currentPlayer = d.player;
      document.getElementById('login-screen').style.display = 'none';
      socket.emit('player_online', currentPlayer.name);
      refreshAll();
    }).catch(()=>{ toast('Ошибка подключения','error'); loginBtn.disabled=false; });
});

function refreshAll(){ 
  updateMe().then(()=>{ 
    loadCards(); 
    loadOnline(); 
    loadHealerTasks(); 
    loadDealerRequests(); 
    loadBartenderTasks();
    loadMyTasks();
    loadInitiatedTasks();
    updateAdminControls(); 
    updateUnconsciousUI(); 
  }); 
}

function updateMe(){
  if(!currentPlayer) return Promise.resolve();
  return fetch('/api/auth/me/'+encodeURIComponent(currentPlayer.name)).then(r=>r.json()).then(p=>{
    if(p.error) return;
    currentPlayer = p;
    playerNameEl.textContent = currentPlayer.name + (currentPlayer.is_admin?' 👑':'') + (currentPlayer.unconscious?' — Без сознания':'' );
    
    const initials = currentPlayer.name.substring(0, 2).toUpperCase();
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const colorIndex = currentPlayer.name.charCodeAt(0) % colors.length;
    const avatarColor = colors[colorIndex];
    
    if (currentPlayer.avatar) {
      playerAvatarEl.src = currentPlayer.avatar;
      playerAvatarEl.style.background = 'transparent';
      playerAvatarEl.style.color = 'transparent';
      playerAvatarEl.textContent = '';
    } else {
      playerAvatarEl.removeAttribute('src');
      playerAvatarEl.style.background = avatarColor;
      playerAvatarEl.style.display = 'flex';
      playerAvatarEl.style.alignItems = 'center';
      playerAvatarEl.style.justifyContent = 'center';
      playerAvatarEl.style.fontWeight = '700';
      playerAvatarEl.style.color = 'white';
      playerAvatarEl.style.fontSize = '24px';
      playerAvatarEl.textContent = initials;
    }
    
    playerLevelEl.textContent = currentPlayer.level;
    playerHealthEl.textContent = currentPlayer.health;
    playerMaxHealthEl.textContent = currentPlayer.max_health;
    playerExpEl.textContent = currentPlayer.experience;
    const roles = [];
    if (currentPlayer.is_healer) roles.push('Целитель');
    if (currentPlayer.is_bartender) roles.push('Бармен');
    if (currentPlayer.can_give_cards) roles.push('Дилер');
    if (currentPlayer.is_reward_master) roles.push('Награды');
    playerRolesEl.textContent = 'Роли: ' + (roles.join(', ') || '—');
    healerPanel.style.display = currentPlayer.is_healer ? 'block' : 'none';
    dealerPanel.style.display = (currentPlayer.can_give_cards || currentPlayer.is_admin) ? 'block' : 'none';
    bartenderPanel.style.display = currentPlayer.is_bartender ? 'block' : 'none';
    myHandCountEl.textContent = '(на руках: '+(currentPlayer.hand?.length||0)+')';
  });
}

function updateAdminControls(){
  const show = !!(currentPlayer && currentPlayer.is_admin);
  [setHealerBtn, unsetHealerBtn, setDealerBtn, unsetDealerBtn, setBartenderBtn, unsetBartenderBtn, restartBtn, document.getElementById('deal-cards-to-all-btn')]
    .forEach(b=>{ if(!b) return; b.style.display = show ? 'inline-block' : 'none'; });
}

function renderAttackCard(el){
  if(!selectedOpponent){ el.classList.add('disabled'); el.title='Выберите соперника'; el.querySelector('.note').textContent='Выберите соперника'; return; }
  if(selectedOpponent.name === currentPlayer.name){ el.classList.add('disabled'); el.title='Нельзя вызывать себя'; el.querySelector('.note').textContent='Нельзя вызывать себя'; return; }
  fetch('/api/duels/quota?name='+encodeURIComponent(currentPlayer.name))
    .then(r=>r.json()).then(q=>{
      if(q.remaining<=0){ el.classList.add('disabled'); el.title='Лимит дуэлей'; el.querySelector('.note').textContent='Нет дуэлей'; }
      else { el.classList.remove('disabled'); el.title='Доступно: '+q.remaining+'/'+q.total; el.querySelector('.note').textContent='Дуэлей: '+q.remaining+'/'+q.total; }
    });
}

function loadCards(){
  if(!currentPlayer) return;
  fetch('/api/cards?name='+encodeURIComponent(currentPlayer.name)).then(r=>r.json()).then(cards=>{
    cardsContainer.innerHTML = '';
    cards.forEach(card=>{
      var el = document.createElement('div');
      el.className = 'card ' + (card.type || 'action');
      const scopeText = card.scope ? (' • ' + getScopeText(card.scope)) : '';
      const origin = card.uid ? ' 🎫' : '';
      el.innerHTML = '<h4>'+card.name+origin+'</h4><div class="note">'+(card.description||'')+scopeText+'</div><div class="note" style="margin-top:6px"></div>';
      el.addEventListener('click', function(){ if(el.classList.contains('disabled')) return; onUseCard(card); });
      cardsContainer.appendChild(el);
      if(card.type==='attack') renderAttackCard(el);
      if(card.uid){
        const needsTarget = card.scope === 'other' || card.scope === 'two_players';
        if(needsTarget && (!selectedOpponent || selectedOpponent.name === currentPlayer.name)){
          el.classList.add('disabled'); el.title = 'Выберите цель'; el.querySelector('.note:last-child').textContent = 'Нужна цель';
        }
      }
    });
    updateUnconsciousUI();
  });
}

function getScopeText(scope) {
  if (scope === 'self') return 'на себя';
  if (scope === 'other') return 'на другого';
  if (scope === 'two_players') return 'на двоих';
  if (scope === 'all_players') return 'на всех';
  return '';
}

function roleText(p){
  const roles = [];
  if (p.is_healer) roles.push('Целитель');
  if (p.is_bartender) roles.push('Бармен');
  if (p.can_give_cards) roles.push('Дилер');
  if (p.is_reward_master) roles.push('Награды');
  return roles.join(', ') || '—';
}

function playerRow(p){
  const flags = (p.is_admin?' 👑':'')+(p.is_healer?' 🌿':'')+(p.is_bartender?' 🍹':'')+(p.can_give_cards?' 🃏':'')+(p.is_reward_master?' 🎁':'');
  const handCount = (p.hand?.length||0);
  
  const initials = p.name.substring(0, 2).toUpperCase();
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  const colorIndex = p.name.charCodeAt(0) % colors.length;
  const avatarColor = colors[colorIndex];
  
  let avatarHtml = '';
  if (p.avatar) {
    avatarHtml = `<img src="${p.avatar}" onerror="this.style.display='none';this.parentElement.querySelector('.avatar-placeholder').style.display='flex';" alt="" style="width:40px;height:40px;border-radius:50%;border:1px solid var(--border);object-fit:cover;" /><div class="avatar-placeholder" style="display:none;background:${avatarColor};width:40px;height:40px;border-radius:50%;align-items:center;justify-content:center;font-weight:700;color:white;font-size:14px;border:1px solid var(--border);">${initials}</div>`;
  } else {
    avatarHtml = `<div class="avatar-placeholder" style="background:${avatarColor};width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:14px;border:1px solid var(--border);">${initials}</div>`;
  }
  
  return avatarHtml+'<div><strong>'+p.name+flags+'</strong>'+'<div class="player-meta">Lvl '+p.level+' • HP '+p.health+'/'+p.max_health+' • Карт: '+handCount+(p.unconscious?' • Без сознания':'')+'</div>'+'<div class="role-text">Роли: '+roleText(p)+'</div>'+'</div>';
}

function loadOnline(){
  fetch('/api/players/online').then(r=>r.json()).then(players=>{
    onlineList.innerHTML='';
    players.forEach(p=>{
      if(!p) return;
      var el = document.createElement('div');
      el.className = 'player-item' + (selectedOpponent && selectedOpponent.name===p.name ? ' selected':'');
      el.innerHTML = playerRow(p);
      el.addEventListener('click', function(){ selectedOpponent = p; loadOnline(); loadCards(); });
      onlineList.appendChild(el);
    });
  });
}

function onUseCard(card){
  if(!currentPlayer) return;
  if(currentPlayer.unconscious) return toast('Вы без сознания','error');

  if(card.type==='attack'){
    if(!selectedOpponent) return toast('Выберите игрока','error');
    if(selectedOpponent.name === currentPlayer.name) return toast('Нельзя вызывать себя','error');
    fetch('/api/duels/challenge', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ challengerName: currentPlayer.name, opponentName: selectedOpponent.name }) })
      .then(r=>r.json()).then(d=>{
        if(d.error) return toast(d.error,'error');
        toast('Вызов отправлен');
        loadCards();
      });
    return;
  }

  if(card.type==='heal'){
    if(!currentPlayer.is_healer) return toast('Только целитель','error');
    if(!selectedOpponent || selectedOpponent.name===currentPlayer.name) return toast('Выберите другого','error');
    fetch('/api/actions/heal', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ healerName: currentPlayer.name, targetName: selectedOpponent.name }) })
      .then(r=>r.json()).then(d=>{
        if(d.error) return toast(d.error,'error');
        toast('Исцелено +'+d.healed+' HP');
        refreshAll();
      });
    return;
  }

  if(card.type==='bartender_request'){
    fetch('/api/actions/useAction', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ fromName: currentPlayer.name, cardId: card.uid })
    }).then(r=>r.json()).then(d=>{
      if(d.error) return toast(d.error,'error');
      toast('Запрос отправлен бармену');
      refreshAll();
    });
    return;
  }

  if(card.uid){
    const scope = card.scope;
    let targetName = null;
    let secondTargetName = null;
    
    if (scope === 'other' || scope === 'two_players') {
      if (!selectedOpponent || selectedOpponent.name === currentPlayer.name) {
        return toast('Выберите другого', 'error');
      }
      targetName = selectedOpponent.name;
    }
    
    if (scope === 'two_players') {
      const secondName = prompt('Второй игрок:');
      if (!secondName) return;
      secondTargetName = secondName.trim();
    }
    
    fetch('/api/actions/useAction', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ fromName: currentPlayer.name, cardId: card.uid, targetName, secondTargetName })
    }).then(r=>r.json()).then(d=>{
      if(d.error) return toast(d.error,'error');
      toast('Купон использован');
      refreshAll();
    });
  }
}

avatarInput.addEventListener('change', function(e){
  if(!currentPlayer) return;
  var f = e.target.files[0]; if(!f) return;
  var fd = new FormData(); fd.append('avatar', f); fd.append('playerName', currentPlayer.name);
  fetch('/api/players/avatar', { method:'POST', body: fd })
    .then(r=>r.json()).then(d=>{ if(d.error) return toast(d.error,'error'); refreshAll(); });
});

requestHealBtn.addEventListener('click', function(){
  if(!currentPlayer) return;
  fetch('/api/players/requestHealing', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fromName: currentPlayer.name }) })
    .then(r=>r.json()).then(d=>{ if(d.error) toast(d.error,'error'); else toast('Запрос отправлен'); });
});

requestCardBtn.addEventListener('click', function(){
  if(!currentPlayer) return;
  fetch('/api/players/requestCard', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fromName: currentPlayer.name }) })
    .then(r=>r.json()).then(d=>{ if(d.error) toast(d.error,'error'); else toast('Запрос отправлен'); });
});

function roleAction(url, payload){
  return fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    .then(r=>r.json()).then(d=>{ if(d.error) toast(d.error,'error'); else { toast('ОК'); refreshAll(); } });
}

setHealerBtn.addEventListener('click', function(){ if(!currentPlayer?.is_admin) return; if(!selectedOpponent) return toast('Выберите игрока','error'); roleAction('/api/players/setHealer', { adminName: currentPlayer.name, targetName: selectedOpponent.name, isHealer: true }); });
unsetHealerBtn.addEventListener('click', function(){ if(!currentPlayer?.is_admin) return; if(!selectedOpponent) return toast('Выберите игрока','error'); roleAction('/api/players/setHealer', { adminName: currentPlayer.name, targetName: selectedOpponent.name, isHealer: false }); });
setDealerBtn.addEventListener('click', function(){ if(!currentPlayer?.is_admin) return; if(!selectedOpponent) return toast('Выберите игрока','error'); roleAction('/api/players/setDealer', { adminName: currentPlayer.name, targetName: selectedOpponent.name, canGive: true }); });
unsetDealerBtn.addEventListener('click', function(){ if(!currentPlayer?.is_admin) return; if(!selectedOpponent) return toast('Выберите игрока','error'); roleAction('/api/players/setDealer', { adminName: currentPlayer.name, targetName: selectedOpponent.name, canGive: false }); });
setBartenderBtn.addEventListener('click', function(){ if(!currentPlayer?.is_admin) return; if(!selectedOpponent) return toast('Выберите игрока','error'); roleAction('/api/players/setBartender', { adminName: currentPlayer.name, targetName: selectedOpponent.name, isBartender: true }); });
unsetBartenderBtn.addEventListener('click', function(){ if(!currentPlayer?.is_admin) return; if(!selectedOpponent) return toast('Выберите игрока','error'); roleAction('/api/players/setBartender', { adminName: currentPlayer.name, targetName: selectedOpponent.name, isBartender: false }); });
restartBtn.addEventListener('click', function(){ if(!currentPlayer?.is_admin) return; if(!confirm('Перезапустить?')) return; roleAction('/api/players/restart', { adminName: currentPlayer.name }); });

function loadHealerTasks(){
  if(!currentPlayer?.is_healer) { healerTasksEl.innerHTML=''; return; }
  fetch('/api/healer/tasks?name='+encodeURIComponent(currentPlayer.name))
    .then(r=>r.json()).then(list=>{
      healerTasksEl.innerHTML = '';
      if(!list?.length) { healerTasksEl.innerHTML = '<div class="note">Нет задач</div>'; return; }
      list.forEach(task=>{
        const row = document.createElement('div');
        row.className = 'task';
        row.innerHTML = '<div>Исцелить <strong>'+task.fromName+'</strong></div><button class="btn secondary">Исцелить</button>';
        row.querySelector('button').addEventListener('click', ()=>{
          fetch('/api/healer/complete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ healerName: currentPlayer.name, taskId: task.id }) })
            .then(r=>r.json()).then(d=>{ if(d.error) toast(d.error,'error'); else { toast('Исцелено'); loadHealerTasks(); refreshAll(); } });
        });
        healerTasksEl.appendChild(row);
      });
    });
}

function loadDealerRequests(){
  if(!(currentPlayer?.can_give_cards || currentPlayer?.is_admin)) { dealerRequestsEl.innerHTML=''; return; }
  fetch('/api/dealer/requests?name='+encodeURIComponent(currentPlayer.name))
    .then(r=>r.json()).then(list=>{
      dealerRequestsEl.innerHTML = '';
      if(!list?.length) { dealerRequestsEl.innerHTML = '<div class="note">Нет запросов</div>'; return; }
      list.forEach(req=>{
        const row = document.createElement('div');
        row.className = 'task';
        row.innerHTML = '<div>Купон для <strong>'+req.fromName+'</strong></div><button class="btn secondary">Выдать</button>';
        row.querySelector('button').addEventListener('click', ()=>{
          fetch('/api/dealer/fulfill', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ dealerName: currentPlayer.name, requestId: req.id }) })
            .then(r=>r.json()).then(d=>{ if(d.error) return toast(d.error,'error'); toast('Выдано'); refreshAll(); loadDealerRequests(); });
        });
        dealerRequestsEl.appendChild(row);
      });
    });
}

function loadBartenderTasks(){
  if(!currentPlayer?.is_bartender) { bartenderTasksEl.innerHTML=''; return; }
  fetch('/api/bartender/tasks?name='+encodeURIComponent(currentPlayer.name))
    .then(r=>r.json()).then(list=>{
      bartenderTasksEl.innerHTML = '';
      if(!list?.length) { bartenderTasksEl.innerHTML = '<div class="note">Нет задач</div>'; return; }
      list.forEach(task=>{
        const row = document.createElement('div');
        row.className = 'task';
        row.innerHTML = '<div>Коктейль для <strong>'+task.fromName+'</strong> (+25 HP)</div><button class="btn secondary">🍸 Приготовить</button>';
        row.querySelector('button').addEventListener('click', ()=>{
          fetch('/api/bartender/complete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ bartenderName: currentPlayer.name, taskId: task.id }) })
            .then(r=>r.json()).then(d=>{ if(d.error) toast(d.error,'error'); else { toast('Коктейль приготовлен'); loadBartenderTasks(); refreshAll(); } });
        });
        bartenderTasksEl.appendChild(row);
      });
    });
}

function loadMyTasks() {
  const container = document.getElementById('my-tasks');
  if (!currentPlayer || !container) return;
  fetch('/api/tasks/my?name=' + encodeURIComponent(currentPlayer.name)).then(r => r.json()).then(tasks => {
    container.innerHTML = '';
    if (!tasks || tasks.length === 0) { container.innerHTML = '<div class="note">Нет заданий</div>'; return; }
    tasks.forEach(task => {
      const div = document.createElement('div');
      div.className = 'task';
      div.innerHTML = `<div><strong>${task.cardName}</strong> от ${task.fromName}</div><div class="note">+${task.xpReward} опыта | -${task.hpPenalty} HP</div>`;
      container.appendChild(div);
    });
  });
}

function loadInitiatedTasks() {
  const container = document.getElementById('initiated-tasks');
  if (!currentPlayer || !container) return;
  fetch('/api/tasks/initiated?name=' + encodeURIComponent(currentPlayer.name)).then(r => r.json()).then(tasks => {
    container.innerHTML = '';
    if (!tasks || tasks.length === 0) { container.innerHTML = '<div class="note">Нет заданий</div>'; return; }
    tasks.forEach(task => {
      const div = document.createElement('div');
      div.className = 'task';
      div.innerHTML = `<div><strong>${task.cardName}</strong> → ${task.toName}</div><div style="margin-top:8px;"><button class="btn secondary" style="margin-right:8px;" data-task-id="${task.id}" data-completed="true">✅ Да</button><button class="btn secondary" data-task-id="${task.id}" data-completed="false">❌ Нет</button></div>`;
      div.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function() {
          const taskId = this.getAttribute('data-task-id');
          const completed = this.getAttribute('data-completed') === 'true';
          fetch('/api/tasks/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initiatorName: currentPlayer.name, taskId, completed }) })
            .then(r => r.json()).then(d => { if (d.error) return toast(d.error, 'error'); toast(completed ? 'Выполнено!' : 'Провалено!'); refreshAll(); });
        });
      });
      container.appendChild(div);
    });
  });
}

var dealCardsToAllBtn = document.getElementById('deal-cards-to-all-btn');
if (dealCardsToAllBtn) { dealCardsToAllBtn.onclick = function() { socket.emit('admin_deal_cards_to_all'); }; }

socket.on('dealer_requests_update', ()=>{ loadDealerRequests(); });
socket.on('healer_tasks_update', ()=>{ loadHealerTasks(); });
socket.on('bartender_tasks_update', ()=>{ loadBartenderTasks(); });
socket.on('tasks_update', ()=>{ loadMyTasks(); loadInitiatedTasks(); });

function renderChatLogs(logs) {
  const box = logsEl;
  if (!box) return;
  if (!logs || logs.length === 0) { box.innerHTML = '<div class="log-line note">Нет логов</div>'; return; }
  box.innerHTML = logs.map(line => '<div class="log-line">'+escapeHtml(line.text)+' <span class="note">'+new Date(line.ts).toLocaleTimeString()+'</span></div>').join('');
  box.scrollTop = box.scrollHeight;
}
function escapeHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
async function fetchLogsToChat(limit = 50) { try { const res = await fetch('/api/players/logs?limit='+limit); const logs = await res.json(); renderChatLogs(logs); } catch(e){} }
socket.on('connect', () => { fetchLogsToChat(50); });
socket.on('logs_update', () => { fetchLogsToChat(50); });

socket.on('players_update', function(){ refreshAll(); });
socket.on('player_updated', function(){ refreshAll(); });

socket.on('duel_challenge', function(payload){
  if(!currentPlayer) return;
  if(payload.opponent === currentPlayer.name){ openDuelModal(payload.challenger, payload.opponent, payload.duelId); }
});

socket.on('duel_result', function(res){
  if(!currentPlayer) return;
  toast('Победил '+res.winner);
  refreshAll();
});

function updateUnconsciousUI(){
  if (!currentPlayer) return;
  const unconscious = !!currentPlayer.unconscious;
  document.querySelectorAll('#cards-container .card').forEach(c=>{ if (unconscious) c.classList.add('disabled'); });
  requestHealBtn.disabled = false;
  requestCardBtn.disabled = unconscious;
}

(function(){
  const tabs = document.querySelectorAll('.mobile-nav .tab');
  function activate(tab){
    tabs.forEach(t=>t.classList.toggle('active', t===tab));
    const sections = document.querySelectorAll('.container > .panel');
    sections.forEach((sec, idx)=>{ sec.style.display = 'block'; });
    const target = tab.getAttribute('data-tab');
    if (window.innerWidth <= 900) {
      const [profile, cards, logs] = document.querySelectorAll('.container > .panel');
      profile.style.display = (target==='profile') ? 'block' : 'none';
      cards.style.display = (target==='cards') ? 'block' : 'none';
      logs.style.display = (target==='logs') ? 'block' : 'none';
    }
  }
  tabs.forEach(t=>t.addEventListener('click', ()=>activate(t)));
  window.addEventListener('resize', ()=>{
    if (window.innerWidth > 900) {
      document.querySelectorAll('.container > .panel').forEach(sec=>sec.style.display='block');
    } else {
      const active = document.querySelector('.mobile-nav .tab.active') || tabs[0];
      activate(active);
    }
  });
  if (window.innerWidth <= 900) activate(tabs[0]);
})();
