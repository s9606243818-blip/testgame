// Система заданий для игроков
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

// Активные задания: { id, fromName, toName, cardName, cardCode, xpReward, hpPenalty, ts }
let activeTasks = [];

function createTask(fromName, toName, card) {
  const task = {
    id: nanoid(),
    fromName,
    toName,
    cardName: card.name,
    cardCode: card.code,
    xpReward: card.xp_reward || 10,
    hpPenalty: card.hp_penalty || 10,
    ts: Date.now()
  };
  activeTasks.push(task);
  return task;
}

function getTasksForPlayer(playerName) {
  return activeTasks.filter(t => t.toName === playerName);
}

function getTasksByInitiator(playerName) {
  return activeTasks.filter(t => t.fromName === playerName);
}

function removeTask(taskId) {
  const index = activeTasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    const task = activeTasks[index];
    activeTasks.splice(index, 1);
    return task;
  }
  return null;
}

function clearAllTasks() {
  activeTasks = [];
}

module.exports = {
  createTask,
  getTasksForPlayer,
  getTasksByInitiator,
  removeTask,
  clearAllTasks
};
