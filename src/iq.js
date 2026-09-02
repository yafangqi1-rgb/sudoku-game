// iq.js — 智商评分系统(纯属娱乐,别当真)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 各难度的基础智商 & 期望用时(秒)
const DIFF_BASE = {
  beginner: { iq: 100, time: 300 },   // 入门: 5分钟
  easy:     { iq: 115, time: 420 },   // 简单: 7分钟
  medium:   { iq: 130, time: 600 },   // 中等: 10分钟
  hard:     { iq: 145, time: 900 },   // 困难: 15分钟
};

/**
 * 计算智商值(纯属搞笑,不代表真实智力)
 * @param {object} state - 游戏状态
 * @returns {number} 智商值(5 ~ 280)
 */
export function calcIQ(state) {
  // 闯关模式: 基础随关卡递增
  let base, expect;
  if (state.level) {
    base = 100 + state.level * 3;          // 第1关103, 第20关160
    expect = 200 + state.level * 15;       // 第1关215s, 第20关500s
  } else {
    const cfg = DIFF_BASE[state.difficulty] || DIFF_BASE.medium;
    base = cfg.iq;
    expect = cfg.time;
  }

  const seconds = state.elapsedMs / 1000;

  // 时间影响: 比期望快加分(封顶+30), 比期望慢扣分
  const diff = expect - seconds;
  let timeAdj;
  if (diff > 0) {
    timeAdj = Math.min(diff / 60 * 1.5, 30);   // 每快1分钟+1.5, 最多+30
  } else {
    timeAdj = diff / 30 * 2;                    // 每慢30秒-2
  }

  // 失误扣分
  const mistakeAdj = state.mistakes * 12;
  const hintAdj = state.hintsUsed * 8;
  const powerupAdj = state.powerupsUsed * 6;

  let iq = base + timeAdj - mistakeAdj - hintAdj - powerupAdj;

  // 满分通关额外奖励
  if (state.mistakes === 0 && state.hintsUsed === 0 && state.powerupsUsed === 0) {
    iq += 25;
  }

  // 失败局智商打折(毕竟没通关)
  if (state.status === 'lost') iq *= 0.5;

  return Math.round(Math.max(5, Math.min(280, iq)));
}

// 智商段位对照表: [min, label数组]
const TIERS = [
  { min: 250, emoji: '\uD83E\uDDBE', labels: [
    '人类高质量大脑，爱因斯坦直呼内行',
    '脑力天花板，建议直接去中科院上班',
    '智商250+，怕不是外星人派来的卧底',
    '人形计算机成精了',
  ]},
  { min: 220, emoji: '\uD83C\uDF93', labels: [
    '985苗子，清华北大抢着要',
    '这智商，衡水中学都得叫你一声大哥',
    '别人家的孩子，说的就是你',
    '学霸本霸，学渣的噩梦',
  ]},
  { min: 190, emoji: '\uD83D\uDC2C', labels: [
    '海豚级智商，哺乳动物的天花板',
    '天选之人，建议去买彩票',
    '这脑回路，体操冠军都没你会翻',
    '脑子好使得很，建议少熬夜保住它',
  ]},
  { min: 160, emoji: '\uD83E\uDDE0', labels: [
    '天才水平，别飘，下局可能就翻车',
    '智商在线，可以考虑挑战困难模式',
    '聪明绝顶，发际线注意一下',
    '你的脑细胞在开派对',
  ]},
  { min: 130, emoji: '\uD83D\uDC4F', labels: [
    '优秀！可以发朋友圈炫耀了',
    '智商在线，没掉地上',
    '稳如老狗，再接再厉',
    '这水平，去参加比赛能拿...参与奖',
  ]},
  { min: 110, emoji: '\uD83D\uDE0E', labels: [
    '聪明人，正常发挥',
    '大众之上，天才之下',
    '还行吧，至少没拖后腿',
    '脑子在转，虽然转得有点慢',
  ]},
  { min: 90, emoji: '\uD83D\uDE42', labels: [
    '普通人类，大众水平',
    '也就那样，凑合能玩',
    '智商及格线边缘疯狂试探',
    '你的脑子：我在努力，真的',
  ]},
  { min: 70, emoji: '\uD83C\uDF4C', labels: [
    '堪比一只成年香蕉',
    '智商余额不足，请及时充值',
    '欠智商充值了吧？',
    '香蕉：我谢谢你把我当参照物',
  ]},
  { min: 50, emoji: '\uD83D\uDC1F', labels: [
    '金鱼记忆7秒，你比它强一点点',
    '脑子离家出走了，快去找回来',
    '智商连夜扛火车跑了',
    '你的智商曲线，比股市跌得还惨',
  ]},
  { min: 30, emoji: '\uD83E\uDD13', labels: [
    '草履虫表示不服',
    '建议回炉重造，这次记得充点钱',
    '你这逻辑，比毛线团还乱',
    '茶都凉了，你的智商还没热乎呢',
  ]},
  { min: 10, emoji: '\uD83E\uDDA1', labels: [
    '石头级智商，建议改玩消消乐',
    '这智商没谁了',
    'Siri听了都想关机',
    '你这脑回路，工地都需要你',
  ]},
  { min: 0, emoji: '\uD83E\uDD8A', labels: [
    '智商已掉线，请检查网络连接',
    '建议卸载重装大脑',
    '你的智商和WiFi信号一样，时有时无',
    '金鱼都比你多记两秒',
  ]},
];

/**
 * 根据智商值返回搞笑段位文案
 * @param {number} iq
 * @returns {{emoji:string, label:string}}
 */
export function iqLabel(iq) {
  for (const tier of TIERS) {
    if (iq >= tier.min) {
      return { emoji: tier.emoji, label: pick(tier.labels) };
    }
  }
  const last = TIERS[TIERS.length - 1];
  return { emoji: last.emoji, label: pick(last.labels) };
}
