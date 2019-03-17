import * as nzh from 'nzh';

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

export const calListTypeFromChangeData = (changeData: string) => {
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
  }
};

const calOl2title = (indent: number, index: number): string => {
  if (indent === 0) {
    return nzh.cn.encodeS(index + 1) + '、';
  }
  switch (indent % 3) {
    case 1:
      return convertTo26(index +1) + ')';
    case 2:
      return convertToRoman(index+1) + '.';
    case 0:
      return (index+1) + '.';
  }
};

const calOl3title = (index: number, parentTitle: string): string => {
  return parentTitle + (index+1) + '.';
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
  }
}
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
  }
}