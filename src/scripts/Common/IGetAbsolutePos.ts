import type ICoordinatePos from './ICoordinatePos'

export interface IGetAbsolutePos extends ICoordinatePos {
  parent?: IGetAbsolutePos | null
  getAbsolutePos(): ICoordinatePos | null
}

export function IGetAbsolutePosDecorator<T extends new (...args: any[]) => IGetAbsolutePos>(constructor: T) {
  return class extends constructor {
    public getAbsolutePos(): ICoordinatePos | null {
      const parentPos = this.parent?.getAbsolutePos()
      if (parentPos) {
        parentPos.x += this.x
        parentPos.y += this.y
        return parentPos
      } else {
        return null
      }
    }
  }
}
