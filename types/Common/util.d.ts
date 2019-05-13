import { EnumListType } from "../DocStructure/EnumListStyle";
export declare const guid: () => string;
export declare const isChinese: (word: string) => boolean;
export declare const isScriptWord: (word: string) => boolean;
export declare const splitIntoBat: (array: any[], splitter: (currentValue?: any, previousValue?: any, index?: number | undefined, array?: any[] | undefined) => boolean, includeSplitter?: boolean) => any[];
export declare const calListTypeFromChangeData: (changeData: string) => EnumListType;
export declare const convertTo26: (num: number, upperCase?: boolean) => string;
/**
 * 阿拉伯数字转中文汉字
 */
export declare const numberToChinese: (num: number) => string;
export declare const convertToRoman: (num: number, upperCase?: boolean) => string;
export declare const calListItemTitle: (type: EnumListType, indent: number, index: number, parentTitle: string) => string;
