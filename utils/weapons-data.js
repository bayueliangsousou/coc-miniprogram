// 武器数据，按技能分类
const WEAPONS_BY_SKILL = {
  "射击（冲锋枪）": [
    { "name": "MP18I/MP28II", "damage": "1D10", "era": "1920s" },
    { "name": "MP5（现代）", "damage": "1D10", "era": "现代" },
    { "name": "MAC-11（现代）", "damage": "1D10", "era": "现代" },
    { "name": "蝎式冲锋枪（现代）", "damage": "1D8", "era": "现代" },
    { "name": "汤普森冲锋枪", "damage": "1D10+2", "era": "1920s" },
    { "name": "乌兹微型冲锋枪（现代）", "damage": "1D10", "era": "现代" }
  ],
  "格斗（剑）": [
    { "name": "大型剑（马刀）", "damage": "1D8+1+DB", "era": "1920s,现代" },
    { "name": "中型剑（佩剑、重剑）", "damage": "1D6+1+DB", "era": "1920s,现代" },
    { "name": "轻型剑（花剑、剑杖）", "damage": "1D6+DB", "era": "1920s,现代" }
  ],
  "射击（喷射器）": [
    { "name": "火焰喷射器", "damage": "2D6+燃烧", "era": "1920s,现代" }
  ],
  "射击（弓术）": [
    { "name": "弓箭", "damage": "1D6+半DB", "era": "1920s,现代" },
    { "name": "弩", "damage": "1D8+2", "era": "1920s,现代" }
  ],
  "射击（手枪）": [
    { "name": "电击枪(远程)（现代）", "damage": "1D3+眩晕", "era": "现代" },
    { "name": "遂发枪", "damage": "1D6+1", "era": "罕见" },
    { "name": ".22(5.6mm)小型自动手枪", "damage": "1D6", "era": "1920s,现代" },
    { "name": ".25(6.35mm)短口手枪(单管)", "damage": "1D6", "era": "1920s" },
    { "name": ".32(7.65mm)左轮手枪", "damage": "1D8", "era": "1920s,现代" },
    { "name": ".32(7.65mm)自动手枪", "damage": "1D8", "era": "1920s,现代" },
    { "name": ".357 马格南左轮（现代）", "damage": "1D8+1D4", "era": "现代" },
    { "name": ".38(9mm)左轮手枪", "damage": "1D10", "era": "1920s,现代" },
    { "name": ".38(9mm)自动手枪", "damage": "1D10", "era": "1920s,现代" },
    { "name": ".41 柯尔特左轮手枪", "damage": "1D10", "era": "罕见" },
    { "name": ".44 马格南左轮手枪（现代）", "damage": "1D10+1D4", "era": "现代" },
    { "name": ".45 柯尔特自动手枪", "damage": "1D10+2", "era": "1920s,现代" },
    { "name": ".45 左轮手枪", "damage": "1D10+2", "era": "1920s,现代" },
    { "name": "9mm 贝雷塔 M9（现代）", "damage": "1D10", "era": "现代" },
    { "name": "9mm 格洛克 17（现代）", "damage": "1D10", "era": "现代" },
    { "name": "9mm 鲁格 P08", "damage": "1D10", "era": "1920s" },
    { "name": "9mm SIG Sauer P226（现代）", "damage": "1D10", "era": "现代" },
    { "name": "信号枪", "damage": "1D10+燃烧", "era": "1920s,现代" },
    { "name": "电击枪(近战)（现代）", "damage": "1D3+眩晕", "era": "现代" },
    { "name": "信号枪(近战)", "damage": "1D6+燃烧", "era": "1920s,现代" }
  ],
  "射击（机枪）": [
    { "name": "FN 米尼米轻机枪（现代）", "damage": "1D10+2", "era": "现代" },
    { "name": "M1918 勃朗宁自动步枪", "damage": "1D10+2", "era": "1920s" },
    { "name": "M1919 勃朗宁机枪", "damage": "1D10+2", "era": "1920s" },
    { "name": "M2 勃朗宁重机枪", "damage": "2D10+4", "era": "1920s,现代" },
    { "name": "M60 通用机枪（现代）", "damage": "1D10+2", "era": "现代" },
    { "name": "维克斯机枪", "damage": "1D10+2", "era": "1920s" },
    { "name": "刘易斯机枪", "damage": "1D10+2", "era": "1920s" },
    { "name": "加特林机枪", "damage": "1D10+2", "era": "罕见" }
  ],
  "射击（步枪/霰弹枪）": [
    { "name": "双管猎枪(20号)", "damage": "2D6", "era": "1920s,现代" },
    { "name": "双管猎枪(10号)", "damage": "2D6+2", "era": "1920s,现代" },
    { "name": "双管猎枪(12号)", "damage": "2D6", "era": "1920s,现代" },
    { "name": "泵动式霰弹枪(20号)", "damage": "2D6", "era": "1920s,现代" },
    { "name": "泵动式霰弹枪(10号)", "damage": "2D6+2", "era": "1920s,现代" },
    { "name": "泵动式霰弹枪(12号)", "damage": "2D6", "era": "1920s,现代" },
    { "name": "半自动霰弹枪(12号)（现代）", "damage": "2D6", "era": "现代" },
    { "name": ".22 栓动步枪", "damage": "1D6+1", "era": "1920s,现代" },
    { "name": ".30 杠杆步枪", "damage": "2D6", "era": "1920s,现代" },
    { "name": ".45 马提尼-亨利步枪", "damage": "1D10+4", "era": "1920s" },
    { "name": ".444 马林步枪（现代）", "damage": "2D8", "era": "现代" },
    { "name": "5.56mm M16 突击步枪（现代）", "damage": "2D6", "era": "现代" },
    { "name": "5.56mm M4 卡宾枪（现代）", "damage": "2D6", "era": "现代" },
    { "name": "7.62mm AK-47 突击步枪（现代）", "damage": "2D6+1", "era": "现代" },
    { "name": "7.62mm M1 加兰德步枪", "damage": "2D6+1", "era": "1920s" },
    { "name": "7.62mm SKS 半自动步枪（现代）", "damage": "2D6+1", "era": "现代" },
    { "name": ".303 李-恩菲尔德步枪", "damage": "2D6+1", "era": "1920s" },
    { "name": ".30-06 斯普林菲尔德 M1903", "damage": "2D6+1", "era": "1920s" },
    { "name": ".30-06 勃朗宁自动步枪", "damage": "2D6+1", "era": "1920s" },
    { "name": ".30-30 温彻斯特步枪", "damage": "2D6", "era": "1920s,现代" },
    { "name": ".38 步枪", "damage": "2D6", "era": "1920s" },
    { "name": ".45 步枪", "damage": "2D6+1", "era": "1920s" },
    { "name": ".50 BMG 狙击步枪（现代）", "damage": "2D10+4", "era": "现代" },
    { "name": "7.62mm 狙击步枪（现代）", "damage": "2D6+1", "era": "现代" },
    { "name": "鱼叉枪（现代）", "damage": "1D8", "era": "现代" }
  ],
  "射击（炮术）": [
    { "name": "37mm 反坦克炮", "damage": "4D10", "era": "1920s,现代" },
    { "name": "75mm 野战炮", "damage": "4D10", "era": "1920s,现代" },
    { "name": "81mm 迫击炮", "damage": "4D10", "era": "1920s,现代" },
    { "name": "120mm 迫击炮（现代）", "damage": "6D10", "era": "现代" },
    { "name": "坦克炮（现代）", "damage": "10D10", "era": "现代" }
  ],
  "射击（重武器）": [
    { "name": "M72 LAW 火箭筒（现代）", "damage": "3D10", "era": "现代" },
    { "name": "RPG-7 火箭筒（现代）", "damage": "3D10", "era": "现代" },
    { "name": "M79 榴弹发射器（现代）", "damage": "2D10", "era": "现代" },
    { "name": "M203 榴弹发射器（现代）", "damage": "2D10", "era": "现代" },
    { "name": "枪榴弹", "damage": "2D10", "era": "1920s,现代" },
    { "name": "TNT 炸药", "damage": "4D10", "era": "1920s,现代" }
  ],
  "格斗（斗殴）": [
    { "name": "徒手", "damage": "1D3+DB", "era": "1920s,现代" },
    { "name": "指虎", "damage": "1D3+1+DB", "era": "1920s,现代" },
    { "name": "燃烧的火把", "damage": "1D6+燃烧", "era": "1920s,现代" },
    { "name": "包革金属棒（大头棍、护身棒）", "damage": "1D8+DB", "era": "1920s,现代" },
    { "name": "大型棍棒（棒球棒、板球棒、拨火棍）", "damage": "1D8+DB", "era": "1920s,现代" },
    { "name": "小型棍棒（警棍）", "damage": "1D6+DB", "era": "1920s,现代" },
    { "name": "大型刀具（弯刀等）", "damage": "1D8+DB", "era": "1920s,现代" },
    { "name": "中型刀具（切肉刀等）", "damage": "1D4+2+DB", "era": "1920s,现代" },
    { "name": "小型刀具（折叠刀等）", "damage": "1D4+DB", "era": "1920s,现代" },
    { "name": "220V通电导线（现代）", "damage": "2D8+眩晕", "era": "现代" },
    { "name": "催泪喷雾*", "damage": "晕眩", "era": "1920s,现代" },
    { "name": "电击器（现代）", "damage": "1D3+晕眩", "era": "现代" }
  ],
  "格斗（斧）": [
    { "name": "手斧", "damage": "1D6+1", "era": "1920s,现代" },
    { "name": "战斧", "damage": "1D8+2", "era": "1920s,现代" },
    { "name": "消防斧", "damage": "1D8+2", "era": "1920s,现代" },
    { "name": "伐木斧", "damage": "1D8+2", "era": "1920s,现代" }
  ],
  "格斗（电锯）": [
    { "name": "小型电锯（现代）", "damage": "1D6", "era": "现代" },
    { "name": "中型电锯（现代）", "damage": "1D8", "era": "现代" },
    { "name": "大型电锯（现代）", "damage": "2D6", "era": "现代" },
    { "name": "链锯（现代）", "damage": "2D8", "era": "现代" }
  ],
  "格斗（绞索）": [
    { "name": "绞索", "damage": "1D6+定身", "era": "1920s,现代" },
    { "name": "钢丝", "damage": "1D6+定身", "era": "1920s,现代" },
    { "name": "绳索", "damage": "定身", "era": "1920s,现代" }
  ],
  "格斗（链枷）": [
    { "name": "链枷", "damage": "1D8+2", "era": "罕见" },
    { "name": "流星锤", "damage": "1D8+1", "era": "罕见" },
    { "name": "双节棍（现代）", "damage": "1D6+DB", "era": "现代" },
    { "name": "三节棍", "damage": "1D6+1+DB", "era": "罕见" }
  ],
  "格斗（鞭子）": [
    { "name": "皮鞭", "damage": "1D3+定身", "era": "1920s,现代" },
    { "name": "九尾鞭", "damage": "1D4+定身", "era": "罕见" },
    { "name": "长鞭", "damage": "1D3+定身", "era": "1920s,现代" },
    { "name": "链鞭", "damage": "1D6+定身", "era": "罕见" }
  ],
  "投掷": [
    { "name": "飞刀", "damage": "1D4+DB", "era": "1920s,现代" },
    { "name": "飞镖", "damage": "1D4", "era": "1920s,现代" },
    { "name": "手里剑", "damage": "1D4", "era": "罕见" },
    { "name": "石块", "damage": "1D4", "era": "1920s,现代" },
    { "name": "投石索", "damage": "1D4", "era": "罕见" },
    { "name": "回力镖", "damage": "1D6", "era": "罕见" },
    { "name": "标枪", "damage": "1D8", "era": "罕见" },
    { "name": "长矛", "damage": "1D8", "era": "罕见" },
    { "name": "莫洛托夫鸡尾酒", "damage": "2D6+燃烧", "era": "1920s,现代" },
    { "name": "炸药棒*", "damage": "4D10/3码", "era": "1920s,现代" },
    { "name": "管状土制炸弹", "damage": "1D10/3码", "era": "1920s,现代" },
    { "name": "塑胶炸药(C-4)（现代）", "damage": "6D10/3码", "era": "1920s,现代" },
    { "name": "手榴弹*", "damage": "4D10/3码", "era": "1920s,现代" },
    { "name": "闪光弹（现代）", "damage": "眩晕", "era": "现代" },
    { "name": "烟雾弹", "damage": "无", "era": "1920s,现代" },
    { "name": "催泪瓦斯（现代）", "damage": "眩晕", "era": "现代" },
    { "name": "短矛", "damage": "1D6", "era": "罕见" },
    { "name": "三叉戟", "damage": "1D8+1", "era": "罕见" },
    { "name": "鱼叉", "damage": "1D8", "era": "1920s,现代" }
  ],
  "爆破": [
    { "name": "定时炸弹", "damage": "4D10", "era": "1920s,现代" },
    { "name": "遥控炸弹（现代）", "damage": "4D10", "era": "现代" },
    { "name": "诡雷（现代）", "damage": "3D10", "era": "现代" },
    { "name": "地雷", "damage": "3D10", "era": "1920s,现代" },
    { "name": "深水炸弹", "damage": "4D10", "era": "1920s,现代" },
    { "name": "反坦克地雷（现代）", "damage": "4D10", "era": "现代" },
    { "name": "阔剑地雷（现代）", "damage": "3D10", "era": "现代" },
    { "name": "C4 炸药（现代）", "damage": "4D10", "era": "现代" }
  ]
};

module.exports = { WEAPONS_BY_SKILL };
