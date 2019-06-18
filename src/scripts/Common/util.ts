import { EnumListType } from "../DocStructure/EnumListStyle";

export const guid = (() => {
  const pool = new Set();
  const generate = () => {
    return Math.floor((1 + Math.random()) * 0x1000000)
      .toString(16)
      .substring(1);
  };
  return () => {
    let current = generate();
    while (pool.has(current)) {
      current = generate();
    }
    pool.add(current);
    return current;
  };
})();

export const isChinese = (word: string): boolean => {
  const charCode = word.charCodeAt(0);
  return (0x4E00 <= charCode && charCode <= 0x9FA5) ||  // 基本汉字	20902字
    (0x9FA6 <= charCode && charCode <= 0x9FEF) ||       // 基本汉字补充	74字
    (0x3400 <= charCode && charCode <= 0x4DB5) ||       // 扩展A	6582字
    (0x20000 <= charCode && charCode <= 0x2A6D6) ||     // 扩展B	42711字
    (0x2A700 <= charCode && charCode <= 0x2B734) ||     // 扩展C	4149字
    (0x2B740 <= charCode && charCode <= 0x2B81D) ||     // 扩展D	222字
    (0x2B820 <= charCode && charCode <= 0x2CEA1) ||     // 扩展E	5762字
    (0x2CEB0 <= charCode && charCode <= 0x2EBE0) ||     // 扩展F	7473字
    (0x2F00 <= charCode && charCode <= 0x2FD5) ||       // 康熙部首	214字
    (0x2E80 <= charCode && charCode <= 0x2EF3) ||       // 部首扩展	115字
    (0xF900 <= charCode && charCode <= 0xFAD9) ||       // 兼容汉字	477字
    (0x2F800 <= charCode && charCode <= 0x2FA1D) ||     // 兼容扩展	542字
    (0xE815 <= charCode && charCode <= 0xE86F) ||       // PUA(GBK)部件	81字
    (0xE400 <= charCode && charCode <= 0xE5E8) ||       // 部件扩展	452字
    (0xE600 <= charCode && charCode <= 0xE6CF) ||       // PUA增补	207字
    (0x31C0 <= charCode && charCode <= 0x31E3) ||       // 汉字笔画	36字
    (0x2FF0 <= charCode && charCode <= 0x2FFB) ||       // 汉字结构	12字
    (0x3105 <= charCode && charCode <= 0x312F) ||       // 汉语注音	43字
    (0x31A0 <= charCode && charCode <= 0x31BA) ||       // 注音扩展	22字
    (0xFF01 <= charCode && charCode <= 0xFF5E) ||       // 全角符号
    (0x3007 <= charCode && charCode <= 0x3011) ||       // 全角符号
    charCode === 0x2013 ||      // 　–  连接号
    charCode === 0x2014 ||      // 　—  破折号
    // 有些字体引号宽度和文字宽度不一致，所以这里引号不算中文字
    // charCode === 0x2018 ||      // 　‘  引号
    // charCode === 0x2019 ||      // 　’
    // charCode === 0x201C ||      // 　“  引号
    // charCode === 0x201D ||      // 　”
    charCode === 0x2026 ||      // 　…  省略号
    charCode === 0x3000 ||      // 　全角空格
    charCode === 0x3001 ||      // 　、  顿号
    charCode === 0x3002 ||      // 　。  句号
    charCode === 0x3014 ||      // 　〔  括号
    charCode === 0x3015;        // 　〕
};

export const isScriptWord = (word: string): boolean => {
  return !(
    isChinese(word)
  );
};

export const splitIntoBat = (
  array: any[],
  splitter: (currentValue?: any, previousValue?: any, index?: number, array?: any[]) => boolean,
  includeSplitter: boolean = false): any[] => {
  const bat: any[] = [];
  let cache: any[] = [];
  for (let index = 0; index < array.length; index++) {
    const currentValue = array[index];
    cache.push(currentValue);
    const previousValue = index > 0 ? array[index - 1] : undefined;
    if (splitter(currentValue, previousValue, index, array)) {
      if (!includeSplitter) {
        cache.pop();
      }
      bat.push(cache);
      cache = [];
    }
  }
  if (cache.length > 0) {
    bat.push(cache);
  }
  return bat;
};

export const calListTypeFromChangeData = (changeData: string): EnumListType => {
  switch (changeData) {
    case "decimal":
      return EnumListType.ol_1;
      break;
    case "ckj-decimal":
      return EnumListType.ol_2;
      break;
    case "upper-decimal":
      return EnumListType.ol_3;
      break;
    case "circle":
      return EnumListType.ul_1;
      break;
    case "ring":
      return EnumListType.ul_2;
      break;
    case "arrow":
      return EnumListType.ul_3;
      break;
    default:
      throw new Error('unknown list type');
  }
};

export const convertTo26 = (num: number, upperCase = false) => {
  const offset = upperCase ? 64 : 96;
  let str = "";
  while (num > 0) {
    let m = num % 26;
    if (m === 0) {
      m = 26;
    }
    str = String.fromCharCode(m + offset) + str;
    num = (num - m) / 26;
  }
  return str;
};

/**
 * 阿拉伯数字转中文汉字
 */
export const numberToChinese = (() => {
  const chnNumChar = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const chnUnitSection = ["", "万", "亿", "万亿", "亿亿"];
  const chnUnitChar = ["", "十", "百", "千"];

  const sectionToChinese = (section: number) => {
    let strIns = '';
    let chnStr = '';
    let unitPos = 0;
    let zero = true;
    while (section > 0) {
      const v = section % 10;
      if (v === 0) {
        if (!zero) {
          zero = true;
          chnStr = chnNumChar[v] + chnStr;
        }
      } else {
        zero = false;
        strIns = chnNumChar[v];
        strIns = strIns + chnUnitChar[unitPos];
        chnStr = strIns + chnStr;
      }
      unitPos++;
      section = Math.floor(section / 10);
    }
    return chnStr;
  };

  return (num: number) => {
    let unitPos = 0;
    let strIns = '';
    let chnStr = '';
    let needZero = false;

    if (num === 0) {
      return chnNumChar[0];
    }

    while (num > 0) {
      const section = num % 10000;
      if (needZero) {
        chnStr = chnNumChar[0] + chnStr;
      }
      strIns = sectionToChinese(section);
      strIns += (section !== 0) ? chnUnitSection[unitPos] : chnUnitSection[0];
      chnStr = strIns + chnStr;
      needZero = (section < 1000) && (section > 0);
      num = Math.floor(num / 10000);
      unitPos++;
    }

    return chnStr;
  };
})();

export const convertToRoman = (() => {
  const aArray = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const upperArray = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  const lowerArray = ["m", "cm", "d", "cd", "c", "xc", "l", "xl", "x", "ix", "v", "iv", "i"];
  return (num: number, upperCase = false) => {
    const strArray = upperCase ? upperArray : lowerArray;
    let str = "";
    for (let i = 0; i < aArray.length; i++) {
      while (num >= aArray[i]) {
        str += strArray[i];
        num -= aArray[i];
      }
    }
    return str;
  };
})();

export const calListItemTitle = (type: EnumListType, indent: number, index: number, parentTitle: string): string => {
  switch (type) {
    case EnumListType.ol_1:
      return calOl1title(indent, index);
    case EnumListType.ol_2:
      return calOl2title(indent, index);
    case EnumListType.ol_3:
      return calOl3title(index, parentTitle);
    case EnumListType.ul_1:
      return calUl1title(indent);
    case EnumListType.ul_2:
      return '⦿';
    case EnumListType.ul_3:
      return calUl3title(indent, index);
  }
};

const calOl1title = (indent: number, index: number): string => {
  index++;
  switch (indent % 3) {
    case 0:
      return index + '.';
    case 1:
      return convertTo26(index) + '.';
    case 2:
      return convertToRoman(index) + '.';
    default:
      return '';
  }
};

const calOl2title = (indent: number, index: number): string => {
  if (indent === 0) {
    return numberToChinese(index + 1) + '、';
  }
  switch (indent % 3) {
    case 1:
      return convertTo26(index + 1) + ')';
    case 2:
      return convertToRoman(index + 1) + '.';
    case 0:
      return (index + 1) + '.';
    default:
      return '';
  }
};

const calOl3title = (index: number, parentTitle: string): string => {
  return parentTitle + (index + 1) + '.';
};

const calUl1title = (indent: number): string => {
  if (indent === 0) {
    return '•';
  }
  switch (indent % 3) {
    case 1:
      return '◦';
    case 2:
      return '▪';
    case 0:
      return '▫';
    default:
      return '';
  }
};

const calUl3title = (indent: number, index: number): string => {
  if (indent === 0) {
    return '→';
  }
  switch (indent % 3) {
    case 1:
      return '▴';
    case 2:
      return '▪';
    case 0:
      return '•';
    default:
      return '';
  }
};

export enum EnumIntersectionType {
  // left = 0b001,         // 只取左边
  // right = 0b010,        // 只取右边
  both = 0b011,         // 两边都取
  leftFirst = 0b101,    // 优先取左边，没取到才取右边
  rightFirst = 0b110,   // 优先取右边，没取到才取左边
}
/**
 * 判断两个范围是否存在交集
 * @param start1 范围 1 的开始位置
 * @param end1 范围 1 的结束位置
 * @param start2 范围 2 的开始位置
 * @param end2 范围 2 的结束位置
 */
export const hasIntersection = (start1: number, end1: number, start2: number, end2: number): boolean => {
  return (start1 <= start2 && start2 <= end1) ||
    (start1 <= end2 && end2 <= end1) ||
    (start2 < start1 && end1 <= end2);
};

/**
 * 用于将各种属性合并到一个 {[key:string]:Set<any>} 对象中，
 * 主要是用于在当文档内容或选区变化时， 通知编辑器外部当前选区的格式变化情况
 * @param attrs 需要合并的属性对象
 * @param target 合并目标对象
 */
export const collectAttributes = (attrs: {[key: string]: any}, target: { [key: string]: Set<any> }) => {
  const keys = Object.keys(attrs);
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    const key = keys[keyIndex];
    if (target[key] === undefined) {
      target[key] = new Set();
    }
    if (attrs[key] instanceof Set) {
      const attrSet = attrs[key] as Set<any>;
      attrSet.forEach((attrValue) => {
        target[key].add(attrValue);
      });
    } else {
      target[key].add(attrs[key]);
    }
  }
};

/**
 * 在一个 Map 中通过 value 查找对应的 value
 * @param map 需要查找的 Map 对象
 * @param value 查找的值
 * @param onlyFirst 是否只查找符合条件的第一个 key
 */
export const findKeyByValueInMap = (map: Map<any, any>, value: any, onlyFirst = true): {find: boolean, key: any[]} => {
  const res: {find: boolean, key: any[]} = {find: false, key: []};
  const iterator = map.entries();
  let hasBreak = false;
  let currentValue = iterator.next();
  while (!currentValue.done && (!hasBreak || !onlyFirst)) {
    if (currentValue.value[1] === value) {
      hasBreak = true;
      res.find = true;
      res.key.push(currentValue.value[0]);
    } else {
      currentValue = iterator.next();
    }
  }
  return res;
};
