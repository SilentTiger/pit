import type { DocPos } from './DocPos'
import type IRectangle from './IRectangle'
import type { ILinkedList, ILinkedListNode } from './LinkedList'
import { findChildInDocPos, getRelativeDocPos } from './util'

export interface IDocPosOperatorC {
  firstPos(): DocPos
  lastPos(): DocPos
}

export interface IDocPosOperatorH extends IDocPosOperatorC {
  nextPos(pos: DocPos): DocPos | null
  prevPos(pos: DocPos): DocPos | null
}

export interface IDocPosOperatorV {
  firstLinePos(x: number): DocPos | null
  lastLinePos(x: number): DocPos | null
  nextLinePos(pos: DocPos, x: number): DocPos | null
  prevLinePos(pos: DocPos, x: number): DocPos | null
  lineStartPos(pos: DocPos, y: number): DocPos | null
  lineEndPos(pos: DocPos, y: number): DocPos | null
}

export type IDocPosOperator = IDocPosOperatorC & IDocPosOperatorH & IDocPosOperatorV

export function IDosPosOperatorHDecorator<
  T extends new (...args: any[]) => IDocPosOperatorC &
    IDocPosOperatorH &
    ILinkedList<IDocPosOperatorH & ILinkedListNode & { start: number }>,
>(constructor: T) {
  return class extends constructor {
    public firstPos(): DocPos {
      if (!this.head) {
        throw new Error('layout frame should not be empty while getting firstPos')
      }
      return { index: 0, inner: null }
    }
    public lastPos(): DocPos {
      if (!this.tail) {
        throw new Error('layout frame should not be empty while getting lastPos')
      }
      const endPos = this.tail.lastPos()
      return { index: endPos.index + this.tail.start, inner: endPos.inner }
    }
    public nextPos(pos: DocPos): DocPos | null {
      const targetChild = findChildInDocPos(pos.index, this.children)
      let res: DocPos | null = null
      if (targetChild) {
        res = targetChild.nextPos(getRelativeDocPos(targetChild.start, pos))
        if (!res) {
          if (targetChild.nextSibling) {
            res = targetChild.nextSibling.firstPos()
            res = { index: res.index + targetChild.nextSibling.start, inner: res.inner }
          }
        } else {
          res = { index: res.index + targetChild.start, inner: res.inner }
        }
      }
      return res
    }
    public prevPos(pos: DocPos): DocPos | null {
      const targetChild = findChildInDocPos(pos.index, this.children)
      let res: DocPos | null = null
      if (targetChild) {
        res = targetChild.prevPos(getRelativeDocPos(targetChild.start, pos))
        if (!res) {
          if (targetChild.prevSibling) {
            res = targetChild.prevSibling.lastPos()
            res = { index: res.index + targetChild.prevSibling.start, inner: res.inner }
          }
        } else {
          res = { index: res.index + targetChild.start, inner: res.inner }
        }
      }
      return res
    }
  }
}

export function IDosPosOperatorVDecorator<
  T extends new (...args: any[]) => IDocPosOperatorC &
    IDocPosOperatorV &
    ILinkedList<
      IDocPosOperatorV &
        ILinkedListNode &
        IRectangle & { start: number; getDocumentPos: (x: number, y: number, start: boolean) => DocPos | null }
    >,
>(constructor: T) {
  return class extends constructor {
    public firstLinePos(x: number): DocPos | null {
      return this.head?.firstLinePos(x) ?? null
    }
    public lastLinePos(x: number): DocPos | null {
      const targetChild = this.children[this.children.length - 1]
      const res = targetChild.lastLinePos(x)
      return res ? { index: res.index + targetChild.start, inner: res.inner } : null
    }
    public nextLinePos(pos: DocPos, x: number): DocPos | null {
      const targetChild = findChildInDocPos(pos.index, this.children)
      let res: DocPos | null = null
      if (targetChild) {
        res = targetChild.nextLinePos(getRelativeDocPos(targetChild.start, pos), x - targetChild.x)
        if (!res) {
          if (targetChild.nextSibling) {
            res = targetChild.nextSibling.firstLinePos(x)
            if (res) {
              res = { index: res.index + targetChild.nextSibling.start, inner: res.inner }
            }
          }
        } else {
          res = { index: res.index + targetChild.start, inner: res.inner }
        }
      }
      return res
    }
    public prevLinePos(pos: DocPos, x: number): DocPos | null {
      const targetChild = findChildInDocPos(pos.index, this.children)
      let res: DocPos | null = null
      if (targetChild) {
        res = targetChild.prevLinePos(getRelativeDocPos(targetChild.start, pos), x - targetChild.x)
        if (!res) {
          if (targetChild.prevSibling) {
            res = targetChild.prevSibling.lastLinePos(x)
            if (res) {
              res = { index: res.index + targetChild.prevSibling.start, inner: res.inner }
            }
          }
        } else {
          res = { index: res.index + targetChild.start, inner: res.inner }
        }
      }
      return res
    }
    public lineStartPos(pos: DocPos, y: number): DocPos | null {
      const targetChild = findChildInDocPos(pos.index, this.children)
      let res: DocPos | null = null
      if (targetChild) {
        res = targetChild.lineStartPos(getRelativeDocPos(targetChild.start, pos), y - targetChild.y)
        if (res) {
          res = { index: res.index + targetChild.start, inner: res.inner }
        }
      }
      return res
    }
    public lineEndPos(pos: DocPos, y: number): DocPos | null {
      const targetChild = findChildInDocPos(pos.index, this.children)
      let res: DocPos | null = null
      if (targetChild) {
        res = targetChild.lineEndPos(getRelativeDocPos(targetChild.start, pos), y - targetChild.y)
        if (res) {
          res = { index: res.index + targetChild.start, inner: res.inner }
        }
      }
      return res
    }
  }
}
