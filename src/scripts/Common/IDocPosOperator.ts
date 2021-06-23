import { DocPos, moveRight } from './DocPos'
import IRectangle from './IRectangle'
import { ILinkedList, ILinkedListNode } from './LinkedList'
import { findChildInDocPos, getRelativeDocPos } from './util'

export interface IDocPosOperatorC {
  firstPos(): DocPos
  lastPos(): DocPos
}

export interface IDocPosOperatorH {
  nextPos(pos: DocPos): DocPos | null
  prevPos(pos: DocPos): DocPos | null
}

export interface IDocPosOperatorV {
  nextLinePos(pos: DocPos, x: number, y: number): DocPos | null
  prevLinePos(pos: DocPos, x: number, y: number): DocPos | null
  lineStartPos(pos: DocPos, y: number): DocPos | null
  lineEndPos(pos: DocPos, y: number): DocPos | null
}

export type IDocPosOperator = IDocPosOperatorC & IDocPosOperatorH & IDocPosOperatorV

export function IDosPosOperatorHDecorator<
  T extends new (...args: any[]) => IDocPosOperatorC &
    IDocPosOperatorH &
    ILinkedList<IDocPosOperator & ILinkedListNode & { start: number }>,
>(constructor: T) {
  return class extends constructor {
    public firstPos(): DocPos {
      if (!this.head) {
        throw new Error('layout frame should not be empty while getting firstPos')
      }
      return this.head.firstPos()
    }
    public lastPos(): DocPos {
      if (!this.tail) {
        throw new Error('layout frame should not be empty while getting lastPos')
      }
      return moveRight(this.tail.lastPos(), this.tail.start)
    }
    public nextPos(pos: DocPos): DocPos | null {
      const targetChild = findChildInDocPos(pos.index, this.children)
      let res: DocPos | null = null
      if (targetChild) {
        res = targetChild.nextPos(getRelativeDocPos(targetChild.start, pos))
        if (!res) {
          if (targetChild.nextSibling) {
            res = moveRight(targetChild.nextSibling.firstPos(), targetChild.nextSibling.start)
          }
        } else {
          res = moveRight(res, targetChild.start)
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
            res = moveRight(targetChild.prevSibling.firstPos(), targetChild.prevSibling.start)
          }
        } else {
          res = moveRight(res, targetChild.start)
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
      IDocPosOperator &
        ILinkedListNode &
        IRectangle & { start: number; getDocumentPos: (x: number, y: number, start: boolean) => DocPos | null }
    >,
>(constructor: T) {
  return class extends constructor {
    public nextLinePos(pos: DocPos, x: number, y: number): DocPos | null {
      const targetChild = findChildInDocPos(pos.index, this.children)
      let res: DocPos | null = null
      if (targetChild) {
        res = targetChild.nextLinePos(getRelativeDocPos(targetChild.start, pos), x - targetChild.x, y - targetChild.y)
        if (!res) {
          if (targetChild.nextSibling) {
            const nextFrameFirstLinePos = targetChild.nextSibling.getDocumentPos(
              x - targetChild.nextSibling.x,
              0,
              false,
            )
            if (nextFrameFirstLinePos) {
              res = moveRight(nextFrameFirstLinePos, targetChild.nextSibling.start)
            }
          }
        } else {
          res = moveRight(res, targetChild.start)
        }
      }
      return res
    }
    public prevLinePos(pos: DocPos, x: number, y: number): DocPos | null {
      const targetChild = findChildInDocPos(pos.index, this.children)
      let res: DocPos | null = null
      if (targetChild) {
        res = targetChild.prevLinePos(getRelativeDocPos(targetChild.start, pos), x - targetChild.x, y - targetChild.y)
        if (!res) {
          if (targetChild.prevSibling) {
            const prevFrameLastLinePos = targetChild.prevSibling.getDocumentPos(
              x - targetChild.prevSibling.x,
              targetChild.prevSibling.height,
              false,
            )
            if (prevFrameLastLinePos) {
              res = moveRight(prevFrameLastLinePos, targetChild.prevSibling.start)
            }
          }
        } else {
          res = moveRight(res, targetChild.start)
        }
      }
      return res
    }
    public lineStartPos(pos: DocPos, y: number): DocPos | null {
      const targetChild = findChildInDocPos(pos.index, this.children)
      let res: DocPos | null = null
      if (targetChild) {
        res = targetChild.lineStartPos(getRelativeDocPos(targetChild.start, pos), y - targetChild.y)
      }
      return res
    }
    public lineEndPos(pos: DocPos, y: number): DocPos | null {
      const targetChild = findChildInDocPos(pos.index, this.children)
      let res: DocPos | null = null
      if (targetChild) {
        res = targetChild.lineEndPos(getRelativeDocPos(targetChild.start, pos), y - targetChild.y)
      }
      return res
    }
  }
}
