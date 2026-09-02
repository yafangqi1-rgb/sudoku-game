// iq.js — 智商评分系统(纯属娱乐,别当真)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 各难度的基础智商 & 期望用时(秒)
// 调高了基础值、降低了惩罚, 确保好成绩不会被嘲讽
const DIFF_BASE = {
  beginner: { iq: 130, time: 300 },
  easy:     { iq: 140, time: 420 },
  medium:   { iq: 155, time: 600 },
  hard:     { iq: 170, time: 900 },
};

/**
 * 计算智商值(纯属搞笑,不代表真实智力)
 * 高分=夸, 低分=损, 零失误一定给好评
 * @param {object} state
 * @returns {number} 智商值(10 ~ 300)
 */
export function calcIQ(state) {
  let base, expect;
  if (state.level) {
    base = 130 + state.level * 4;          // 第1关134, 第20关210
    expect = 200 + state.level * 15;       // 第1关215s, 第20关500s
  } else {
    const cfg = DIFF_BASE[state.difficulty] || DIFF_BASE.medium;
    base = cfg.iq;
    expect = cfg.time;
  }

  const seconds = state.elapsedMs / 1000;

  // 时间: 比期望快每分钟+2(封顶+40), 慢每分钟-1(温和)
  const diff = expect - seconds;
  let timeAdj;
  if (diff > 0) {
    timeAdj = Math.min(diff / 60 * 2, 40);
  } else {
    timeAdj = diff / 60;  // 每慢1分钟只-1
  }

  // 扣分项(都比之前温和)
  const mistakeAdj = state.mistakes * 10;
  const hintAdj = state.hintsUsed * 5;
  const powerupAdj = state.powerupsUsed * 3;

  let iq = base + timeAdj - mistakeAdj - hintAdj - powerupAdj;

  // 满分通关额外+35
  if (state.mistakes === 0 && state.hintsUsed === 0 && state.powerupsUsed === 0) {
    iq += 35;
  }

  // 零失误但用了提示/道具也+15, 确保"可圈可点"不掉到嘲讽段
  if (state.mistakes === 0 && (state.hintsUsed > 0 || state.powerupsUsed > 0)) {
    iq += 15;
  }

  // 失败局打折
  if (state.status === 'lost') iq *= 0.55;

  return Math.round(Math.max(10, Math.min(300, iq)));
}

// 段位文案: 读作 "你的智商为XX，<label>"
// 高分段真诚夸, 低分段才损
const TIERS = [
  { min: 250, labels: [
    '人类高质量大脑，爱因斯坦直呼内行',
    '脑力天花板，建议直接去中科院上班',
    '怕不是外星人派来的卧底',
    '人形计算机成精了，建议上交国家',
  ]},
  { min: 220, labels: [
    '985苗子，清华北大抢着要',
    '这智商，衡水中学都得叫你一声大哥',
    '别人家的孩子，说的就是你',
    '学霸本霸，学渣的噩梦',
  ]},
  { min: 190, labels: [
    '海豚级智商，哺乳动物的天花板',
    '天选之人，建议去买彩票',
    '脑回路体操冠军都没你会翻',
    '脑子好使得很，建议少熬夜保住它',
  ]},
  { min: 160, labels: [
    '天才水平，别飘，下局可能就翻车',
    '智商在线，可以考虑挑战困难模式',
    '聪明绝顶，发际线注意一下',
    '你的脑细胞在开派对',
  ]},
  { min: 130, labels: [
    '优秀！可以发朋友圈炫耀了',
    '智商在线，没掉地上',
    '稳如老狗，再接再厉',
    '这水平去参加比赛能拿...参与奖',
  ]},
  { min: 110, labels: [
    '聪明人，正常发挥',
    '大众之上，天才之下',
    '还行吧，至少没拖后腿',
    '脑子在转，虽然转得有点慢',
  ]},
  { min: 90, labels: [
    '普通人类，大众水平',
    '也就那样，凑合能玩',
    '智商及格线边缘疯狂试探',
    '脑子：我在努力，真的',
  ]},
  { min: 70, labels: [
    '堪比一颗成年香蕉',
    '智商余额不足，请及时充值',
    '香蕉：谢谢你把我当参照物',
    '脑子好像在罢工',
  ]},
  { min: 50, labels: [
    '堪比一条金鱼，记忆七秒你强一点点',
    '脑子离家出走了，快去找回来',
    '智商连夜扛火车跑了',
    '智商曲线，比股市跌得还惨',
  ]},
  { min: 30, labels: [
    '草履虫表示不服',
    '建议回炉重造，这次记得充点钱',
    '逻辑比毛线团还乱',
    '茶都凉了，智商还没热乎',
  ]},
  { min: 10, labels: [
    '石头级智商，建议改玩消消乐',
    '这智商没谁了',
    'Siri听了都想关机',
    '脑回路，工地都需要你',
  ]},
  { min: 0, labels: [
    '智商已掉线，请检查网络连接',
    '建议卸载重装大脑',
    '智商和WiFi信号一样，时有时无',
    '金鱼都比你多记两秒',
  ]},
];

export function iqLabel(iq) {
  for (const tier of TIERS) {
    if (iq >= tier.min) {
      return { label: pick(tier.labels) };
    }
  }
  const last = TIERS[TIERS.length - 1];
  return { label: pick(last.labels) };
}
