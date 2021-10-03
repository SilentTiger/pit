import Delta from 'quill-delta-enhanced'
import Op from 'quill-delta-enhanced/dist/Op'

/**
 * DocPosJSON 表示文档中的某个位置
 *
 * 这个结构是特意按照 Delta 的结构来设计的，目的就是为了方便把这个数据结构转成一个标准的 Delta 类
 * 转成 Delta 之后就可以很方便地进行 transform、diff、equal 之类的操作
 * 比如：
 * 1、某个文档中有两个段落，第一个段落长度为 10， 第二个长的为 5，要表示当前光标在第二个段落第二个字后面，可以表示为：
 * [
 *   { retain: 12 }
 * ]
 * 2、某个文档中有两段内容，第一段是一个普通段落，长度为 10，第二段是一个 5 行 3 列的表格，
 *   光标在表格第四行第二个单元格中第一个段落的第 5 个字符后面，则可以表示为：
 * [
 *   { retain: 10 },          // 先略过 table 前面的长度
 *   {
 *      retain: { ops: [
 *        { retain: 3 },      // 再略过三行
 *        {
 *          retain: { ops: [
 *            { retain: 1 },  // 再略过第四行的第一个单元格
 *            {
 *              retain: { ops: [
 *                { retain: 5 } // 最后涨到第四行第二单元格中第一个段落的第 5 个字
 *              ]}
 *            }
 *          ]}
 *        }
 *      ]}
 *   }
 * ]
 */
type DocPosJSON = { ops: Array<{ retain: number | DocPosJSON }> }

/**
 * DocPos 是 DocPosJSON 的简化形式
 * DocPosJSON 其实本质上是 Delta 的结构，是一种开放式的数据接口，
 * 在代码逻辑里面使用的时候不太方便（经常需要做各种边界情况的判断）
 * 所以在代码中简化为 DocPos，这两种数据很容易用下面的工具方法互相转化
 */
export type DocPos = {
  index: number
  inner: DocPos | null
}

export const jsonToDocumentPos = (jsonObj: DocPosJSON): DocPos | null => {
  if (jsonObj.ops.length === 1) {
    if (typeof jsonObj.ops[0].retain === 'number') {
      return {
        index: jsonObj.ops[0].retain,
        inner: null,
      }
    } else {
      const inner = jsonToDocumentPos(jsonObj.ops[0].retain)
      if (inner !== null) {
        return {
          index: 0,
          inner,
        }
      } else {
        return null
      }
    }
  } else if (jsonObj.ops.length === 2) {
    const index = jsonObj.ops[0].retain
    const inner = typeof jsonObj.ops[1].retain === 'object' ? jsonToDocumentPos(jsonObj.ops[1].retain) : null
    if (typeof index === 'number' && inner !== null) {
      return { index, inner }
    } else {
      return null
    }
  } else {
    return null
  }
}

export const documentPosToJSON = (docPos: DocPos): DocPosJSON | null => {
  const res: DocPosJSON = { ops: [] }
  if (docPos.index > 0) {
    res.ops.push({ retain: docPos.index })
  }
  if (docPos.inner !== null) {
    res.ops.push({ retain: documentPosToJSON(docPos.inner) as DocPosJSON })
  }
  if (res.ops.length > 0) {
    return res
  } else {
    return null
  }
}

export const moveRight = (docPos: DocPos, offset: number): DocPos => {
  if (docPos.inner === null) {
    return { index: docPos.index + offset, inner: null }
  } else {
    return { index: docPos.index, inner: moveRight(docPos.inner, offset) }
  }
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
  if (posA.index > posB.index) {
    return 1
  }
  if (posA.index < posB.index) {
    return -1
  }

  if (posA.inner === null && posB.inner !== null) {
    return -1
  }
  if (posA.inner !== null && posB.inner === null) {
    return 1
  }
  if (posA.inner !== null && posB.inner !== null) {
    return compareDocPos(posA.inner, posB.inner)
  }
  return 0
}

export const moveDocPos = (pos: DocPos, step: number): DocPos => {
  const targetPos: DocPos =
    pos.inner === null
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

export const transformDocPos = (pos: DocPos, delta: Delta): DocPos => {
  const newPos = cloneDocPos(pos)
  let thisPos = 0
  const otherIter = Op.iterator(delta.ops)
  while (otherIter.hasNext()) {
    if (otherIter.peekType() === 'insert') {
      const peekLength = otherIter.peekLength()
      newPos.index += peekLength
      thisPos += peekLength
      otherIter.next()
    } else if (otherIter.peekType() === 'delete') {
      const peekLength = otherIter.peekLength()
      if (peekLength > newPos.index - thisPos) {
        newPos.index = thisPos
        newPos.inner = null
        return newPos
      } else {
        newPos.index -= peekLength
        otherIter.next()
      }
    } else {
      // peekType === 'retain'
      const peekLength = otherIter.peekLength()
      const op = otherIter.next()
      if (peekLength === 1 && op.retain instanceof Delta && thisPos === newPos.index && newPos.inner !== null) {
        return {
          index: newPos.index,
          inner: transformDocPos(newPos.inner, op.retain),
        }
      } else if (peekLength > newPos.index - thisPos) {
        return newPos
      } else {
        thisPos += peekLength
      }
    }
  }
  return newPos
}
