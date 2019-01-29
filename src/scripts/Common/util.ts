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
