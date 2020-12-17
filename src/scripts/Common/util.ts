import bounds from 'binary-search-bounds'
import { EnumListType } from '../DocStructure/EnumListStyle'
import IRectangle from './IRectangle'
import { DocPos } from './DocPos'
import { ILinkedList, ILinkedListNode } from './LinkedList'
import IRangeNew from './IRangeNew'
import { IFragmentOverwriteAttributes } from '../DocStructure/FragmentOverwriteAttributes'
import { IFormatAttributes } from '../DocStructure/FormatAttributes'
import Op from 'quill-delta-enhanced/dist/Op'
import Delta from 'quill-delta-enhanced'

export const increaseId = (() => {
  let currentId = 0
  return () => {
    return currentId++
  }
})()

export const isChinese = (word: string): boolean => {
  const charCode = word.charCodeAt(0)
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
    charCode === 0x2013 ||      // –  连接号
    charCode === 0x2014 ||      // —  破折号
    // 有些字体引号宽度和文字宽度不一致，所以这里引号不算中文字
    // charCode === 0x2018 ||      // ‘  引号
    // charCode === 0x2019 ||      // ’
    // charCode === 0x201C ||      // “  引号
    // charCode === 0x201D ||      // ”
    charCode === 0x2026 ||      // …  省略号
    charCode === 0x3000 ||      // 全角空格
    charCode === 0x3001 ||      // 、  顿号
    charCode === 0x3002 ||      // 。  句号
    charCode === 0x3014 ||      // 〔  括号
    charCode === 0x3015        // 〕
}

export const calListTypeFromChangeData = (changeData: string): EnumListType => {
  switch (changeData) {
    case 'decimal':
      return EnumListType.ol1
    case 'ckj-decimal':
      return EnumListType.ol2
    case 'upper-decimal':
      return EnumListType.ol3
    case 'circle':
      return EnumListType.ul1
    case 'ring':
      return EnumListType.ul2
    case 'arrow':
      return EnumListType.ul3
    default:
      throw new Error('unknown list type')
  }
}

export const convertTo26 = (num: number, upperCase = false) => {
  const offset = upperCase ? 64 : 96
  let str = ''
  while (num > 0) {
    let m = num % 26
    if (m === 0) {
      m = 26
    }
    str = String.fromCharCode(m + offset) + str
    num = (num - m) / 26
  }
  return str
}

/**
 * 阿拉伯数字转中文汉字
 */
export const numberToChinese = (() => {
  const chnNumChar = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  const chnUnitSection = ['', '万', '亿', '万亿', '亿亿']
  const chnUnitChar = ['', '十', '百', '千']

  const sectionToChinese = (section: number) => {
    let strIns = ''
    let chnStr = ''
    let unitPos = 0
    let zero = true
    while (section > 0) {
      const v = section % 10
      if (v === 0) {
        if (!zero) {
          zero = true
          chnStr = chnNumChar[v] + chnStr
        }
      } else {
        zero = false
        strIns = chnNumChar[v]
        strIns = strIns + chnUnitChar[unitPos]
        chnStr = strIns + chnStr
      }
      unitPos++
      section = Math.floor(section / 10)
    }
    return chnStr
  }

  return (num: number) => {
    let unitPos = 0
    let strIns = ''
    let chnStr = ''
    let needZero = false

    if (num === 0) {
      return chnNumChar[0]
    }

    while (num > 0) {
      const section = num % 10000
      if (needZero) {
        chnStr = chnNumChar[0] + chnStr
      }
      strIns = sectionToChinese(section)
      strIns += (section !== 0) ? chnUnitSection[unitPos] : chnUnitSection[0]
      chnStr = strIns + chnStr
      needZero = (section < 1000) && (section > 0)
      num = Math.floor(num / 10000)
      unitPos++
    }

    return chnStr
  }
})()

export const convertToRoman = (() => {
  const aArray = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  const upperArray = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  const lowerArray = ['m', 'cm', 'd', 'cd', 'c', 'xc', 'l', 'xl', 'x', 'ix', 'v', 'iv', 'i']
  return (num: number, upperCase = false) => {
    const strArray = upperCase ? upperArray : lowerArray
    let str = ''
    for (let i = 0; i < aArray.length; i++) {
      while (num >= aArray[i]) {
        str += strArray[i]
        num -= aArray[i]
      }
    }
    return str
  }
})()

const calOl1title = (indent: number, index: number): string => {
  index++
  switch (indent % 3) {
    case 0:
      return index + '.'
    case 1:
      return convertTo26(index) + '.'
    case 2:
      return convertToRoman(index) + '.'
    default:
      return ''
  }
}

const calOl2title = (indent: number, index: number): string => {
  if (indent === 0) {
    return numberToChinese(index + 1) + '、'
  }
  switch (indent % 3) {
    case 1:
      return convertTo26(index + 1) + ')'
    case 2:
      return convertToRoman(index + 1) + '.'
    case 0:
      return (index + 1) + '.'
    default:
      return ''
  }
}

const calOl3title = (index: number, parentTitle: string): string => {
  return parentTitle + (index + 1) + '.'
}

const calUl1title = (indent: number): string => {
  if (indent === 0) {
    return '•'
  }
  switch (indent % 3) {
    case 1:
      return '◦'
    case 2:
      return '▪'
    case 0:
      return '▫'
    default:
      return ''
  }
}

const calUl3title = (indent: number): string => {
  if (indent === 0) {
    return '→'
  }
  switch (indent % 3) {
    case 1:
      return '▴'
    case 2:
      return '▪'
    case 0:
      return '•'
    default:
      return ''
  }
}

export const calListItemTitle = (type: EnumListType, indent: number, index: number, parentTitle: string): string => {
  switch (type) {
    case EnumListType.ol1:
      return calOl1title(indent, index)
    case EnumListType.ol2:
      return calOl2title(indent, index)
    case EnumListType.ol3:
      return calOl3title(index, parentTitle)
    case EnumListType.ul1:
      return calUl1title(indent)
    case EnumListType.ul2:
      return '⦿'
    case EnumListType.ul3:
      return calUl3title(indent)
  }
}

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
  const length = end2 - start2
  if (length === 0) {
    return (start1 <= start2 && start2 <= end1) ||
      (start1 <= end2 && end2 <= end1) ||
      (start2 < start1 && end1 <= end2)
  } else {
    return (start1 <= start2 && start2 < end1) ||
      (start1 < end2 && end2 <= end1) ||
      (start2 <= start1 && end1 <= end2)
  }
}

/**
 * 用于将各种属性合并到一个 {[key:string]:Set<any>} 对象中，
 * 主要是用于在当文档内容或选区变化时， 通知编辑器外部当前选区的格式变化情况
 * @param attrs 需要合并的属性对象
 * @param target 合并目标对象
 */
export const collectAttributes = (attrs: { [key: string]: any }, target: { [key: string]: Set<any> }) => {
  const keys = Object.keys(attrs)
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    const key = keys[keyIndex]
    if (target[key] === undefined) {
      target[key] = new Set()
    }
    if (attrs[key] instanceof Set) {
      const attrSet = attrs[key] as Set<any>
      attrSet.forEach((attrValue) => {
        target[key].add(attrValue)
      })
    } else {
      target[key].add(attrs[key])
    }
  }
}

export const findChildrenByRange = <T extends { start: number, length: number }>(
  children: T[],
  index: number, length: number,
  intersectionType: EnumIntersectionType = EnumIntersectionType.both,
): T[] => {
  let low = 0
  let high = children.length - 1
  let mid = Math.floor((low + high) / 2)
  while (high > low + 1) {
    const midValue = children[mid].start
    if (midValue < index) {
      low = mid
    } else if (midValue > index) {
      high = mid
    } else if (midValue === index) {
      break
    }
    mid = Math.floor((low + high) / 2)
  }

  if (children[high].start <= index) {
    mid = high
  }

  for (; mid >= 0; mid--) {
    if (children[mid].start <= index) {
      break
    }
  }
  mid = Math.max(mid, 0)

  const res: T[] = []
  if (length > 0) {
    res.push(children[mid])
    mid++
    for (; mid < children.length; mid++) {
      if (children[mid].start < index + length) {
        res.push(children[mid])
      } else {
        break
      }
    }
  } else {
    if (children[mid].start === index && mid > 0) {
      res.push(children[mid - 1])
    }
    res.push(children[mid])
    if (intersectionType !== EnumIntersectionType.both && res.length > 1) {
      const removeTarget = intersectionType === EnumIntersectionType.rightFirst ? 0 : 1
      res.splice(removeTarget, 1)
    }
  }

  return res
}

/**
 * 把 fragment 的 attributes 转换成 css 样式
 */
export const convertFragmentAttributesToCssStyleText = (attr: Partial<IFragmentOverwriteAttributes>): string => {
  const cssStyle: { [key: string]: string | number } = {}
  if (typeof attr.background === 'string') {
    cssStyle['background-color'] = attr.background
  }
  if (typeof attr.color === 'string') {
    cssStyle.color = attr.color
  }
  if (attr.strike) {
    cssStyle['text-decoration'] = (cssStyle['text-decoration'] ?? '') + ' line-through'
  }
  if (attr.underline) {
    cssStyle['text-decoration'] = (cssStyle['text-decoration'] ?? '') + ' underline'
  }
  if (typeof attr.font === 'string') {
    cssStyle['font-family'] = attr.font
  }
  if (typeof attr.size === 'number') {
    cssStyle['font-size'] = attr.size + 'pt'
  }
  if (attr.bold) {
    cssStyle['font-weight'] = 'bold'
  }
  if (attr.italic) {
    cssStyle['font-style'] = 'italic'
  }
  if (typeof attr.width === 'number') {
    cssStyle.width = attr.width
  }
  if (typeof attr.height === 'number') {
    cssStyle.height = attr.height
  }
  let res = ''
  const keys = Object.keys(cssStyle)
  for (let index = 0; index < keys.length; index++) {
    res += keys[index] + ':' + cssStyle[keys[index]] + ';'
  }
  return res
}

/**
 * 在 str 字符串中查找 searchTarget
 * @param searchTarget
 * @param str
 * @param caseSensitive
 */
export const searchTextString = (searchTarget: string, str: string, caseSensitive: boolean = false): number[] => {
  const searchStrLen = searchTarget.length
  if (searchStrLen === 0) {
    return []
  }
  let startIndex = 0
  const indices = []
  if (!caseSensitive) {
    str = str.toLowerCase()
    searchTarget = searchTarget.toLowerCase()
  }
  let index = str.indexOf(searchTarget, startIndex)
  while (index > -1) {
    indices.push(index)
    startIndex = index + searchStrLen
    index = str.indexOf(searchTarget, startIndex)
  }
  return indices
}

/**
 * 判断一个点是否在某个矩形区域内
 */
export const isPointInRectangle = (x: number, y: number, rect: IRectangle): boolean => {
  return (
    rect.x <= x && x <= rect.x + rect.width &&
    rect.y <= y && y <= rect.y + rect.height
  )
}

/**
 * 在一个 IRectangle 数组中找到 pos 所在的元素
 * @param {boolean} yOrdered children 是否按 y 正序排列，false 则表示 children 按 x 正序排列
 */
export const findRectChildInPos = <T extends IRectangle>(x: number, y: number, children: T[], yOrdered = true): T | null => {
  // 如果 children 按 y 正序排列则先用二分法查找 y，再看 x 是否在范围内
  // 如果 children 按 x 正序排列则先用二分法查找 x，再看 y 是否在范围内
  let resIndex: number
  const fakeTarget = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }

  if (yOrdered) {
    fakeTarget.y = y
    resIndex = bounds.le(children, fakeTarget, (a, b) => {
      return a.y - b.y
    })
  } else {
    fakeTarget.x = x
    resIndex = bounds.le(children, fakeTarget, (a, b) => {
      return a.x - b.x
    })
  }

  if (resIndex >= 0) {
    const res = children[resIndex]
    if (yOrdered) {
      return res.x <= x && res.x + res.width >= x && res.y + res.height >= y ? res : null
    } else {
      return res.y <= y && res.y + res.height >= y && res.x + res.width >= x ? res : null
    }
  } else {
    return null
  }
}

/**
 * 在一个 IRectangle 数组中找到 posY 所在的元素
 * @param {dichotomy} boolean 是否使用二分法查找
 */
export const findRectChildInPosY = <T extends IRectangle>(y: number, children: T[], dichotomy = true): T | null => {
  const fakeTarget = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }

  fakeTarget.y = y

  if (!dichotomy) {
    // 不用二分法查找就顺序遍历
    let res: T | null = null
    if (children.length === 0 || children[0].y > fakeTarget.y) { return res }
    for (let index = 0; index < children.length; index++) {
      if (children[index].y <= fakeTarget.y) {
        res = children[index]
      } else {
        break
      }
    }
    return res
  } else {
    // 用二分法查找
    const resIndex = bounds.le(children, fakeTarget, (a, b) => {
      return a.y - b.y
    })
    if (resIndex >= 0) {
      return children[resIndex]
    } else {
      return null
    }
  }
}

export const findChildInDocPos = <T extends { start: number }>(start: number, children: T[], dichotomy = true): T | null => {
  const index = findChildIndexInDocPos(start, children, dichotomy)
  if (index >= 0) {
    return children[index]
  } else {
    return null
  }
}

export const findChildIndexInDocPos = <T extends { start: number }>(start: number, children: T[], dichotomy = true): number => {
  const fakeTarget = {
    start: 0,
  }
  fakeTarget.start = start

  if (dichotomy) {
    const resIndex = bounds.le(children, fakeTarget, (a, b) => {
      return a.start - b.start
    })
    if (resIndex >= 0) {
      return resIndex
    } else {
      return -1
    }
  } else {
    let res = -1
    if (children.length === 0 || children[0].start > fakeTarget.start) { return res }
    for (let index = 0; index < children.length; index++) {
      if (children[index].start <= fakeTarget.start) {
        res = index
      } else {
        break
      }
    }
    return res
  }
}

/**
 * web 中 canvas 绘制水平和垂直线条的时候，如果坐标是整数，在高分屏上绘制出来的线条非常细
 * 所以用这个方法可以把这类坐标值改为一个离他最近的 x.5 的值
 */
export const findHalf = (origin: number, direction: 1 | -1): number => {
  return (Math.floor(origin) * 2 + direction) / 2
}

export function cloneDocPos(pos: null): null
export function cloneDocPos(pos: DocPos): DocPos
export function cloneDocPos(pos: DocPos | null): DocPos | null
export function cloneDocPos<T extends DocPos | null>(pos: T): T {
  if (pos !== null) {
    const targetPos: any = {
      index: pos.index,
      inner: pos.inner === null ? null : cloneDocPos(pos.inner),
    }
    return targetPos
  }
  return null as any
}

export const getRelativeDocPos = (start: number, pos: DocPos): DocPos => {
  if (pos.index >= start) {
    const { inner } = pos
    const newInner = cloneDocPos(inner)
    return {
      index: pos.index - start,
      inner: newInner,
    }
  } else {
    return {
      index: 0,
      inner: null,
    }
  }
}

/**
 * 比较两个文档位置，如果 posA 在 posB 后面，就返回 true 否则返回 false
 */
export const compareDocPos = (posA: DocPos, posB: DocPos): 1 | 0 | -1 => {
  if (posA.index > posB.index) return 1
  if (posA.index < posB.index) return -1

  if (posA.inner === null && posB.inner !== null) return -1
  if (posA.inner !== null && posB.inner === null) return 1
  if (posA.inner !== null && posB.inner !== null) return compareDocPos(posA.inner, posB.inner)
  return 0
}

export const moveDocPos = (pos: DocPos, step: number): DocPos => {
  const targetPos: DocPos = pos.inner === null
    ? {
        index: pos.index + step,
        inner: null,
      }
    : {
        index: pos.index,
        inner: moveDocPos(pos.inner, step),
      }
  return targetPos
}

export const transformDocPosToDelta = (pos: DocPos): Delta => {
  const ops: Op[] = []
  if (pos.index > 0) {
    ops.push({ retain: pos.index })
  }
  if (pos.inner !== null) {
    ops.push({ retain: new Delta(transformDocPosToDelta(pos.inner)) })
  }

  return new Delta(ops)
}

export const transformDeltaToDocPos = (posDelta: Delta): DocPos => {
  // 传入 posDelta 是用来表示一个 DocPos 的 delta，里面只会有 retain number 操作
  const ops = posDelta.ops
  if (typeof ops[0].retain === 'number') {
    return {
      index: ops[0].retain,
      inner: ops[1] ? transformDeltaToDocPos(ops[1].retain as Delta) : null,
    }
  } else {
    return {
      index: 0,
      inner: ops[0] ? transformDeltaToDocPos(ops[0].retain as Delta) : null,
    }
  }
}

type CanGetFormatItem = { start: number, getFormat: (range?: IRangeNew) => { [key: string]: Set<any> } } & ILinkedListNode
/**
 * 获取指定范围内元素的 attributes
 * @param priority 当 ranges 中某个 range 的 start 和 end 相同时，left 表示优先取 range.start 左边元素的 attributes，否则优先取右边元素的 attributes
 */
export const getFormat = (target: ILinkedList<CanGetFormatItem>, ranges?: IRangeNew[], priority: 'left' | 'right' = 'right'): { [key: string]: Set<any> } => {
  const res: { [key: string]: Set<any> } = {}
  if (ranges) {
    for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
      // 如果 range 的 start 和 end 相同，就直接找到所在的 block 然后 getFormat
      const range = ranges[rangeIndex]
      if (compareDocPos(range.start, range.end) === 0) {
        let targetChild = findChildInDocPos(range.start.index, target.children, true)
        if (targetChild?.start === range.start.index && range.start.inner === null) {
          if (priority === 'left' && targetChild.prevSibling !== null) {
            targetChild = targetChild.prevSibling
          }
        }
        if (targetChild) {
          collectAttributes(targetChild.getFormat({
            start: getRelativeDocPos(targetChild.start, range.start),
            end: getRelativeDocPos(targetChild.start, range.end),
          }), res)
        }
      } else {
        // 2、有选择内容的时候
        const startChild = findChildInDocPos(range.start.index, target.children, true)
        let endChild = findChildInDocPos(range.end.index, target.children, true)
        if (!startChild || !endChild) continue

        // 如果 range.end 在 endChild 的开始位置，endChild 就要取前一个元素
        if (range.end.index === endChild.start && range.end.inner === null) {
          endChild = endChild.prevSibling ?? endChild
        }

        // 然后开始取格式，分开始和结束在同一个 block 和 在不同的 block 两种情况
        if (startChild === endChild) {
          collectAttributes(startChild.getFormat({
            start: getRelativeDocPos(startChild.start, range.start),
            end: getRelativeDocPos(startChild.start, range.end),
          }), res)
        } else {
          let currentChild: CanGetFormatItem | null = endChild
          while (currentChild) {
            if (currentChild === endChild || currentChild === startChild) {
              collectAttributes(currentChild.getFormat({
                start: getRelativeDocPos(currentChild.start, range.start),
                end: getRelativeDocPos(currentChild.start, range.end),
              }), res)
            } else {
              collectAttributes(currentChild.getFormat(), res)
            }
            if (currentChild !== startChild) {
              currentChild = currentChild.prevSibling
            } else {
              break
            }
          }
        }
      }
    }
  } else {
    for (let i = 0; i < target.children.length; i++) {
      collectAttributes(target.children[i].getFormat(), res)
    }
  }
  return res
}

type CanFormatItem = { start: number, length: number, format: (attr: IFormatAttributes, range?: IRangeNew) => void } & ILinkedListNode
export const format = <T extends ILinkedList<U>, U extends CanFormatItem>(target: T, attr: IFormatAttributes, range?: IRangeNew): { start: U, end: U } | null => {
  let returnStart: U | null = null
  let returnEnd: U | null = null
  if (range) {
    const startChild = findChildInDocPos(range.start.index, target.children, true)
    let endChild = findChildInDocPos(range.end.index, target.children, true)
    if (!startChild || !endChild) return null

    if (startChild !== endChild && endChild.prevSibling && endChild.start === range.end.index && range.end.inner === null) {
      endChild = endChild.prevSibling
    }

    // 尝试合并属性相同的 child
    returnStart = startChild.prevSibling || target.head
    returnEnd = endChild.nextSibling || target.tail

    if (startChild === endChild) {
      startChild.format(attr, {
        start: getRelativeDocPos(startChild.start, range.start),
        end: getRelativeDocPos(endChild.start, range.end),
      })
    } else {
      let currentFrag: U | null = endChild
      while (currentFrag) {
        if (currentFrag === startChild) {
          if (currentFrag.start === range.start.index && range.start.inner === null) {
            currentFrag.format(attr)
          } else {
            currentFrag.format(attr, { start: { index: range.start.index - currentFrag.start, inner: range.start.inner }, end: { index: currentFrag.start + currentFrag.length, inner: null } })
          }
          break
        } else if (currentFrag === endChild) {
          if (currentFrag.start + currentFrag.length === range.end.index && range.end.inner === null) {
            currentFrag.format(attr)
          } else {
            currentFrag.format(attr, { start: { index: 0, inner: null }, end: { index: range.end.index - currentFrag.start, inner: range.end.inner } })
          }
        } else {
          currentFrag.format(attr)
        }
        currentFrag = currentFrag.prevSibling
      }
    }
  } else {
    returnStart = target.head
    returnEnd = target.tail
    for (let index = 0; index < target.children.length; index++) {
      const frag = target.children[index]
      frag.format(attr)
    }
  }

  if (returnStart && returnEnd) {
    return {
      start: returnStart,
      end: returnEnd,
    }
  } else {
    return null
  }
}

type CanClearFormatItem = { start: number, length: number, clearFormat: (range?: IRangeNew) => void } & ILinkedListNode
export const clearFormat = <T extends ILinkedList<U>, U extends CanClearFormatItem>(target: T, range?: IRangeNew): { start: U, end: U } | null => {
  let returnStart: U | null = null
  let returnEnd: U | null = null
  if (range) {
    const startChild = findChildInDocPos(range.start.index, target.children, true)
    const endChild = findChildInDocPos(range.end.index, target.children, true)
    if (!startChild || !endChild) return null

    // 尝试合并属性相同的 child
    returnStart = startChild.prevSibling || target.head
    returnEnd = endChild.nextSibling || target.tail

    if (startChild === endChild) {
      startChild.clearFormat({
        start: getRelativeDocPos(startChild.start, range.start),
        end: getRelativeDocPos(endChild.start, range.end),
      })
    } else {
      let currentFrag: U | null = endChild
      while (currentFrag) {
        if (currentFrag === startChild) {
          if (currentFrag.start === range.start.index && range.start.inner === null) {
            currentFrag.clearFormat()
          } else {
            currentFrag.clearFormat({ start: { index: range.start.index - currentFrag.start, inner: range.start.inner }, end: { index: currentFrag.start + currentFrag.length, inner: null } })
          }
          break
        } else if (currentFrag === endChild) {
          if (currentFrag.start + currentFrag.length === range.end.index && range.end.inner === null) {
            currentFrag.clearFormat()
          } else {
            currentFrag.clearFormat({ start: { index: 0, inner: null }, end: { index: range.end.index - currentFrag.start, inner: range.end.inner } })
          }
        } else {
          currentFrag.clearFormat()
        }
        currentFrag = currentFrag.prevSibling
      }
    }
  } else {
    returnStart = target.head
    returnEnd = target.tail
    for (let index = 0; index < target.children.length; index++) {
      const frag = target.children[index]
      frag.clearFormat()
    }
  }

  if (returnStart && returnEnd) {
    return {
      start: returnStart,
      end: returnEnd,
    }
  } else {
    return null
  }
}
