/**
 * 剧情关卡定义。
 * 第一至第四章已实现：宿舍 / 食堂 / 教室 / 图书馆。
 */
export const STORY_ASSETS = {
  background: 'assets/story/background1.jpg',
  map: 'assets/story/map.jpg',
  heroes: [
    'assets/story/role1-hp3.png',
    'assets/story/role1-hp2.png',
    'assets/story/role1-hp1.png',
  ],
};

/**
 * 剧情专属题池：从 150 道内置题中按主题挑选，仍然沿用 3/4/3 与 BOSS 规则。
 * 题池不足时 sampler 会自动回退到全题库，保证始终可以开局。
 */
const LEVEL2_QUESTION_POOL = [
  // 易：干饭
  'q_mw_0003',
  'q_mw_0044',
  'q_mw_0084',
  'q_mw_0114',
  // 中：真香、搭子、雪糕刺客
  'q_mw_0015',
  'q_mw_0018',
  'q_mw_0050',
  'q_mw_0062',
  'q_mw_0102',
  'q_mw_0138',
  // 难：电子榨菜、没苦硬吃、BOSS「干就完了」
  'q_mw_0150',
  'q_mw_0026',
  'q_mw_0071',
];

const LEVEL3_QUESTION_POOL = [
  // 易：早八、打工人、摸鱼、内卷、摆烂
  'q_mw_0009',
  'q_mw_0045',
  'q_mw_0085',
  'q_mw_0115',
  'q_mw_0117',
  'q_mw_0118',
  // 中：内卷、复读机、班味、松弛感、格局、急了
  'q_mw_0013',
  'q_mw_0053',
  'q_mw_0056',
  'q_mw_0058',
  'q_mw_0061',
  'q_mw_0092',
  'q_mw_0099',
  // 难：早八、city 不 city，以及 BOSS「吗喽」「脆皮大学生」
  'q_mw_0147',
  'q_mw_0110',
  'q_mw_0104',
  'q_mw_0142',
];

/**
 * 第四章「图书馆」：馆长的闭馆答辩——把前三章的梗总复习一遍。
 * 题目全部来自内置题库，不与第二、三章题池重复。
 */
const LEVEL4_QUESTION_POOL = [
  // 易：好运、情绪稳定、破防、自我认知、表达与社死
  'q_mw_0006',
  'q_mw_0011',
  'q_mw_0033',
  'q_mw_0039',
  'q_mw_0046',
  'q_mw_0086',
  // 中：打脸、旅游特种兵、电子木鱼、小卡拉米、这波操作、情绪价值
  'q_mw_0016',
  'q_mw_0019',
  'q_mw_0020',
  'q_mw_0052',
  'q_mw_0060',
  'q_mw_0100',
  // 难：水灵灵地、配享太庙词源、水豚，以及 BOSS「典中典」「南上加南」
  'q_mw_0029',
  'q_mw_0030',
  'q_mw_0109',
  'q_mw_0149',
  'q_mw_0074',
];

export const LEVELS = [
  {
    id: 1,
    chapter: '第一章',
    name: '宿舍',
    title: '第一章 · 宿舍',
    subtitle: '室友嘉豪的十道梗知识考验',
    available: true,
    status: '可挑战',
    mapLabel: '宿舍',
    mapNode: { x: 0.111, y: 0.347 },
    nextId: 2,
    requires: null,
    speaker: '嘉豪',
    background: STORY_ASSETS.background,
    portrait: 'assets/story/role0.png',
    portraitAspect: 337 / 820,
    ask: 'assets/story/role0-1.png',
    askAspect: 639 / 598,
    heroes: STORY_ASSETS.heroes,
    questionPool: null,
    description: '室友嘉豪正在宿舍等你。准备好接受 10 道梗知识考验了吗？',
    unlockHint: '',
  },
  {
    id: 2,
    chapter: '第二章',
    name: '食堂',
    title: '第二章 · 食堂',
    subtitle: '芬姨的干饭暗号考验',
    available: true,
    status: '可挑战',
    mapLabel: '食堂',
    mapNode: { x: 0.365, y: 0.246 },
    nextId: 3,
    requires: 1,
    speaker: '芬姨',
    background: 'assets/story/background2.jpg',
    portrait: 'assets/story/role2.png',
    portraitAspect: 408 / 680,
    ask: 'assets/story/role2-1.png',
    askAspect: 560 / 434,
    heroes: STORY_ASSETS.heroes,
    questionPool: LEVEL2_QUESTION_POOL,
    description: '食堂窗口后，芬姨的勺子停在半空。想打饭，先接住她的干饭暗号。',
    unlockHint: '先完成第一章「宿舍」，才能进入食堂。',
  },
  {
    id: 3,
    chapter: '第三章',
    name: '教室',
    title: '第三章 · 教室',
    subtitle: '李老师的随堂梗测验',
    available: true,
    status: '可挑战',
    mapLabel: '教学楼',
    mapNode: { x: 0.61, y: 0.142 },
    nextId: 4,
    requires: 2,
    speaker: '李老师',
    background: 'assets/story/background3.jpg',
    portrait: 'assets/story/role3.png',
    portraitAspect: 359 / 680,
    ask: 'assets/story/role3-1.png',
    askAspect: 560 / 464,
    heroes: STORY_ASSETS.heroes,
    questionPool: LEVEL3_QUESTION_POOL,
    description: '教学楼的灯还亮着。李老师把粉笔放下，这堂课只考梗知识。',
    unlockHint: '先完成第二章「食堂」，才能进入教学楼。',
  },
  {
    id: 4,
    chapter: '第四章',
    name: '图书馆',
    title: '第四章 · 图书馆',
    subtitle: '馆长的闭馆答辩',
    available: true,
    status: '可挑战',
    mapLabel: '图书馆',
    mapNode: { x: 0.897, y: 0.251 },
    nextId: null,
    requires: 3,
    speaker: '馆长',
    background: 'assets/story/background4.jpg',
    portrait: 'assets/story/role4.png',
    portraitAspect: 440 / 640,
    ask: 'assets/story/role4-1.png',
    askAspect: 460 / 520,
    heroes: STORY_ASSETS.heroes,
    questionPool: LEVEL4_QUESTION_POOL,
    description: '闭馆铃响过三遍，图书馆深处还亮着一盏灯。馆长在等你交出最后十道答案。',
    unlockHint: '先完成第三章「教室」，才能进入图书馆。',
  },
];

export const STORY_PREMISE = [
  '你穿越到了一个靠梗知识生存的世界。',
  '这里的人用梗交流；接不住梗的人，会被世界淘汰。',
  '宿舍的嘉豪、食堂的芬姨、教室的李老师、图书馆的馆长，都在等你接招。',
  '活过四关，才能找到回去的路。',
];

export const LEVEL1_INTRO = [
  {
    speaker: '旁白',
    text: '你睁开眼，发现自己躺在一间陌生的大学宿舍里。窗外是陌生的校园，手机里没有任何熟悉的联系人。',
  },
  {
    speaker: '旁白',
    text: '你正准备推门出去了解这个世界，身后的室友突然叫住了你。',
  },
  {
    speaker: '嘉豪',
    text: '新来的？先别急着走。在这个世界，接不住梗的人会死。',
  },
  {
    speaker: '你',
    text: '等等……这里到底是什么地方？我为什么会在这里？',
  },
  {
    speaker: '嘉豪',
    text: '回答我 10 个问题。答对了，你就能活着走出这间宿舍。',
  },
];

export const LEVEL2_INTRO = [
  {
    speaker: '旁白',
    text: '你走出宿舍，顺着饭香来到大学食堂。窗口前排着长队，却安静得有些反常。',
  },
  {
    speaker: '旁白',
    text: '你端起餐盘，刚要开口点菜，打饭阿姨的勺子停在了半空。',
  },
  {
    speaker: '芬姨',
    text: '新面孔？在这个食堂，光有饭卡不够，还得接得住梗。',
  },
  {
    speaker: '你',
    text: '阿姨，我只是想打份饭……',
  },
  {
    speaker: '芬姨',
    text: '打饭先答话。十道题，三次机会；每答错一题，勺子里就少一块肉。',
  },
  {
    speaker: '你',
    text: '这食堂的规矩，比宿舍还离谱。',
  },
  {
    speaker: '芬姨',
    text: '少废话。答对了，鸡腿管够；接不住，今天就饿着出去。',
  },
];

export const LEVEL3_INTRO = [
  {
    speaker: '旁白',
    text: '你捧着餐盘冲出食堂，教学楼里空无一人，只有走廊尽头那间教室还亮着灯。',
  },
  {
    speaker: '旁白',
    text: '黑板前站着一位老师，粉笔停在半空，像是在等你很久了。',
  },
  {
    speaker: '李老师',
    text: '迟到十分钟。看来食堂的考验没难住你。',
  },
  {
    speaker: '你',
    text: '你知道我为什么会来到这里？',
  },
  {
    speaker: '李老师',
    text: '我知道怎么让你回去。但先通过这堂随堂测验。',
  },
  {
    speaker: '李老师',
    text: '十道题，三次机会。答错三次，这节课就永远下课。',
  },
  {
    speaker: '你',
    text: '……这学校的老师，怎么比室友还不讲道理。',
  },
  {
    speaker: '李老师',
    text: '开始吧，同学。记住，梗是这个世界唯一的通行证。',
  },
];

export const LEVEL4_INTRO = [
  {
    speaker: '旁白',
    text: '你跟着李老师穿过熄灯后的走廊。尽头那扇旧木门，是入学那天就锁着的图书馆。',
  },
  {
    speaker: '旁白',
    text: '李老师在门口停下脚步，没有再往里走。门自己开了。',
  },
  {
    speaker: '旁白',
    text: '月光落在书架之间，一本厚重的书浮在半空，缓缓翻过一页。',
  },
  {
    speaker: '馆长',
    text: '等你很久了。每个想离开梗世界的人，都要先过我这一关。',
  },
  {
    speaker: '你',
    text: '你是……一本书？',
  },
  {
    speaker: '馆长',
    text: '我是这座图书馆的馆长。这里收着所有没能接住的梗，也收着回去的路。',
  },
  {
    speaker: '馆长',
    text: '十道题，三次机会。答完，门就开；答不完，你就留下来，当下一本书。',
  },
  {
    speaker: '你',
    text: '……这学校的图书馆，比食堂还离谱。',
  },
  {
    speaker: '馆长',
    text: '翻开第一页吧。这是你在这个世界的最后一次答辩。',
  },
];

export function getLevelById(id) {
  return LEVELS.find((level) => level.id === Number(id)) || null;
}

export function getNextLevel(levelId) {
  const level = getLevelById(levelId);
  return level && level.nextId ? getLevelById(level.nextId) : null;
}

export function getLevelIntro(levelId) {
  const id = Number(levelId);
  if (id === 1) return LEVEL1_INTRO;
  if (id === 2) return LEVEL2_INTRO;
  if (id === 3) return LEVEL3_INTRO;
  if (id === 4) return LEVEL4_INTRO;
  return [
    {
      speaker: '旁白',
      text: '这一章的剧情正在开发中，敬请期待。',
    },
  ];
}

/**
 * 关卡是否解锁：关卡必须已开放，且前置章节已完成。
 */
export function isLevelUnlocked(levelId, story) {
  const level = getLevelById(levelId);
  if (!level || !level.available) return false;
  if (!level.requires) return true;
  return !!(story && story.completedLevels && story.completedLevels[Number(level.requires)]);
}

/**
 * 地图上展示的关卡状态。
 */
export function getLevelStatus(levelId, story) {
  const level = getLevelById(levelId);
  if (!level) return '未开放';
  const completed = !!(story && story.completedLevels && story.completedLevels[level.id]);
  if (completed) return '已通关';
  if (!level.available) return level.status || '未开放';
  if (!isLevelUnlocked(level.id, story)) return '未解锁';
  return '可挑战';
}
