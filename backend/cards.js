// Полная база купонов (карт действий)
const COUPONS = [
  // Оригинальные купоны
  { code: 'kiss_cheek', name: '💋 Поцелуй в щечку', count: 2, hp_penalty: 20, xp_reward: 20, scope: 'two_players', description: 'Выбери двух игроков, которые целуются в щёчку (не себя)' },
  { code: 'no_phone', name: '📵 Запрет на телефон 1ч', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Выбери игрока, он не может использовать телефон' },
  { code: 'my_track', name: '🎵 Поставить свой трек 1 раз', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'self', description: 'Диджей ставит твой трек' },
  { code: 'no_pool', name: '🏊 Вытащить из бассейна', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'На любого игрока, запрет на купание 1 час' },
  { code: 'force_photo', name: '📸 Заставить сделать фото', count: 2, hp_penalty: 20, xp_reward: 20, scope: 'other', description: 'Кого-то заставить сделать фото с тобой в выбранной позе' },
  { code: 'cancel_coupon', name: '❌ Отменить действие любого купона', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Отменить любой купон, любой игрок' },
  { code: 'no_speak', name: '🤐 Запрет говорить', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Можно запретить кому-то говорить 10 минут' },
  { code: 'no_sit', name: '🧍 Запрет сидеть', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Кому-то нельзя садиться в течение 15 минут' },
  { code: 'force_drink', name: '🍻 Обязательная попйка', count: 2, hp_penalty: 20, xp_reward: 20, scope: 'two_players', description: 'Двоих заставить выпить вместе' },
  { code: 'compliment', name: '💐 Обязательный комплимент', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Игрок должен сказать тебе 3 комплимента' },
  { code: 'swap_clothes', name: '👕 Обмен футболками', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'two_players', description: 'Двое игроков меняются верхней одеждой на 15 мин' },
  { code: 'toast', name: '🥂 Тост в твою честь', count: 2, hp_penalty: 20, xp_reward: 20, scope: 'other', description: 'Игрок произносит хвалебный тост в твою честь' },
  { code: 'force_use_coupon', name: '⚡ Заставить игрока сразу использовать свой купон', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Заставить использовать купон немедленно' },
  { code: 'dance_battle', name: '🕺 Танцевальный вызов', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'two_players', description: 'Два игрока должны танцевать друг против друга' },
  { code: 'scream', name: '📢 Фантастический крик', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Заставить крикнуть что-то смешное/громкое' },
  { code: 'hug', name: '🤗 Объятие судьбы', count: 2, hp_penalty: 20, xp_reward: 20, scope: 'other', description: 'Игрок обнимает тебя' },
  { code: 'skip_penalty', name: '🛡️ Пропуск наказания', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'self', description: 'Игнорировать любое наказание' },
  { code: 'chef', name: '🧑‍🍳 Шеф-повар', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Игрок готовит тебе напиток' },
  { code: 'confession', name: '🙇 Заставь признаться', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Заставить признаться в чём-то' },
  { code: 'rename', name: '🏷️ Переименуй', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Новое имя на 1 час, ошибся — пьет' },
  { code: 'bartender', name: '🍸 Личный бармен', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Игрок приносит тебе напиток' },
  { code: 'mass_challenge', name: '🎉 Массовый челлендж', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'all_players', description: 'Все одновременно должны выполнить действие (петь, танцевать и т.д.)' },
  { code: 'dance_object', name: '🧟 Танец с предметом', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Игрок танцует с любым предметом' },
  { code: 'selfie', name: '🤳 Обязательное селфи', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Кто-то делает селфи с тобой и выкладывает' },
  { code: 'alphabet', name: '🔤 Алфавитный разговор', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Разговаривать 15 мин. только словами на одну букву' },
  { code: 'meow', name: '🐱 Кошачий вызов', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Каждый ответ начинать с «МЯУ» 10 мин' },
  { code: 'victim', name: '🎯 Выбери жертву', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Все придумывают задание жертве' },
  { code: 'rearrange', name: '🔄 Перестановка', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'two_players', description: 'Пересадить 2 игроков' },
  { code: 'drink_reaction', name: '😱 Реакция на питьё', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Когда пьешь, все громко стонут' },
  { code: 'celebrity', name: '⭐ Объяви себя звездой', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'self', description: 'Презентовать себя как знаменитость' },
  { code: 'play_role', name: '🎭 Сыграй роль', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: '1 мин говорить как животное/персонаж' },
  { code: 'silence_all', name: '🤫 Заставь всех молчать', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'all_players', description: 'Все молчат 1 мин по твоему сигналу' },
  { code: 'cupid', name: '💘 Купидон', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'two_players', description: 'Два игрока ходят вместе 10 мин' },
  { code: 'toast_soul', name: '🙏 Тост от души', count: 1, hp_penalty: 10, xp_reward: 10, scope: 'other', description: 'Игрок произносит душевный тост' },
  { code: 'victim2', name: '🎯 Выбери жертву (повтор)', count: 2, hp_penalty: 20, xp_reward: 20, scope: 'other', description: 'Все придумывают задание жертве' },

  // НОВЫЕ КУПОНЫ
  { code: 'tattoo_master', name: '🎨 Тату мастер', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Придумай дизайн «тату», выбранный человек рисует его на себе красками' },
  { code: 'ad_agent', name: '📣 Рекламный агент', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Продай случайный предмет как лучший в мире. Нужно 10 баллов, иначе штраф' },
  { code: 'pick_self', name: '🔀 Выбери сам', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'self', description: 'Можешь поменять одно своё задание на любое другое из стопки' },
  { code: 'personal_blogger', name: '📹 Личный блогер', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Попроси кого-то снять видео с тобой' },
  { code: 'personal_assistant', name: '🤝 Личный ассистент', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Выбери игрока, который за тобой бегает за ручку 10 минут' },
  { code: 'matchmaker', name: '💑 Сваха', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'two_players', description: 'Выбери двух игроков, которые уходят за руку вместе на 10 минут' },
  { code: 'phrase_day', name: '💬 Реплика дня', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'all_players', description: 'Все должны повторять за тобой фразу, которую ты выберешь' },
  { code: 'easy_evening', name: '😌 Лёгкий вечер', count: 0, hp_penalty: 0, xp_reward: 10, scope: 'self', description: 'Можешь один раз отказаться от участия в любом мероприятии' },
  { code: 'false_call', name: '🃏 Ложный вызов', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Придумай ложное задание. Через 10 секунд скажи, что пошутил' },
  { code: 'secret_message', name: '✉️ Секретное послание', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Передай секрет игроку так, чтобы остальные не знали от кого' },
  { code: 'chaos_curator', name: '🌪️ Куратор хаоса', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Выбери кого-то, кто должен называть все события «офигенным планом»' },
  { code: 'random_pose', name: '🗿 Рандомная поза', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Человек застывает в случайной позе на 1 минуту' },
  { code: 'puppeteer', name: '🎎 Кукловод', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Человек 3 минуты повторяет твои жесты и движения' },
  { code: 'multilingual', name: '👥 Мультилингвер', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'two_players', description: 'Два человека говорят одинаковыми фразами 5 минут' },
  { code: 'sound_man', name: '🔊 Звукарь', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Озвучивай все свои действия 5 минут' },
  { code: 'you_puppet', name: '🎭 Ты кукла', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Человек управляет твоими движениями 1 минуту' },
  { code: 'provocation', name: '😏 Провокация', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'two_players', description: 'Дай задание одному незнакомцу, потом сделай комплимент второму' },
  { code: 'fake_drama', name: '🎬 Фейковая драма', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Театрально ссорься 30 сек, потом обнимитесь и крикните: «Давайте выпьем!»' },
  { code: 'fortune_teller', name: '🔮 Гадалка', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Предскажи мою жизнь на ближайшие 10 минут' },
  { code: 'animal_world', name: '🦁 Животный мир', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: '5 минут говори только звуками животных' },
  { code: 'provocation2', name: '🥊 Провокация 2', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'two_players', description: 'Уговори двух людей подраться в шутку. Не согласятся - ты пьёшь' },
  { code: 'copy_paste', name: '🔁 Копи-паст', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Повторяй за мной каждое слово 2 минуты' },
  { code: 'slowest', name: '🐌 Самый медленный', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Говори и двигайся очень медленно 2 минуты' },
  { code: 'role_swap', name: '🔄 Смена ролей', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Поменяйся купоном с другой картой любого игрока' },
  { code: 'quarantine', name: '🚫 Карантин', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Не можешь двигаться на расстоянии 2м от всех 3 минуты' },
  { code: 'silent_hero', name: '🤐 Молчаливый герой', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Общайся только жестами 5 минут' },
  { code: 'weather_today', name: '☁️ Погода сегодня', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'self', description: 'Опиши громко и эмоционально, что происходит, будто ты синоптик' },
  { code: 'invisible_friend', name: '👻 Невидимый друг', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: '5 минут разговаривай с воображаемым собеседником' },
  { code: 'cuckold', name: '🧎 Кукольд', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'two_players', description: 'Один встаёт на колени и держит второго за руку. Ты наблюдаешь' },
  { code: 'wet_pussy', name: '💦 Мокрая кисся', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Налей себе стакан воды и три минуты говори о еде' },
  { code: 'new_name', name: '📛 Новое имя', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Назови игрока по-новому до конца вечеринки. Парень - «Масик», девушка - «Пусь»' },
  { code: 'mistress', name: '👑 Госпожа', count: 1, hp_penalty: 30, xp_reward: 10, scope: 'other', description: 'Человек 10 минут выполняет твои приказы (откажется - ты пьёшь)' },
];

function randomCoupons(n) {
  const res = [];
  for (let i = 0; i < n; i++) {
    const coupon = COUPONS[Math.floor(Math.random() * COUPONS.length)];
    res.push({ ...coupon, uid: Date.now() + '_' + Math.random().toString(36).substr(2, 9) });
  }
  return res;
}

module.exports = { COUPONS, randomCoupons };
