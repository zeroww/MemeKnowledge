import { hashString, mulberry32 } from './random.js';

const BOT_NAMES = [
  '抽象选手',
  '接梗大师',
  '显眼包本包',
  '柠檬精本精',
  '快乐小狗',
  '水豚同学',
  '老六本人',
  '吗喽打工人',
  '典中典选手',
  '破防小队长',
  '真香警告',
  '赛博许愿池',
  '电子木鱼',
  '雪糕刺客',
  '窝囊废文学',
  '鼠鼠文学',
  '小狗文学',
  '松弛感大师',
  '班味清除器',
  '早八战神',
  '牛马一号',
  '梗王候选',
  '评论区课代表',
  '显眼包家属',
];

const BOT_EMOJIS = ['🎭', '🐟', '🍋', '🐶', '🦫', '🖤', '👑', '📚', '🌀', '💬', '🍦', '📺'];

/**
 * 生成确定性的本地演示榜单。
 * 玩家成绩来自 profile.leaderboard；机器人成绩按周期种子生成。
 */
export function buildLeaderboard({ period = 'week', player, seedKey = '', limit = 20 } = {}) {
  const rng = mulberry32(hashString(`leaderboard:${period}:${seedKey}`));
  const entries = BOT_NAMES.map((nickname, index) => ({
    id: `bot_${index}`,
    nickname,
    emoji: BOT_EMOJIS[index % BOT_EMOJIS.length],
    score: 130 + Math.floor(rng() * 151),
    durationMs: 40000 + Math.floor(rng() * 160000),
    isPlayer: false,
  }));

  const playerScore = player && player.score ? Math.max(0, Math.round(player.score)) : 0;
  if (playerScore > 0) {
    entries.push({
      id: 'player',
      nickname: (player && player.nickname) || '我',
      emoji: '🎯',
      score: playerScore,
      durationMs: Math.max(0, Math.round((player && player.durationMs) || 0)),
      isPlayer: true,
    });
  }

  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
    return a.nickname.localeCompare(b.nickname);
  });

  const playerIndex = entries.findIndex((entry) => entry.isPlayer);
  return {
    entries: entries.slice(0, limit),
    total: entries.length,
    playerRank: playerIndex >= 0 ? playerIndex + 1 : 0,
    playerScore,
  };
}
