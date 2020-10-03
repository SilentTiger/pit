type IAttributes = { [key: string]: any }

export interface IAttributable {
  defaultAttributes: IAttributes
  overrideDefaultAttributes: IAttributes
  originalAttributes: IAttributes
  overrideAttributes: IAttributes
  attributes: IAttributes

  setOverrideDefaultAttributes(attr: IAttributes):void
  setOverrideAttributes(attr: IAttributes):void
  setAttributes(attr: IAttributes): void

  compileAttributes():void
}

export function IAttributableDecorator<T extends { new(...args: any[]): IAttributable }>(constructor: T) {
  return class extends constructor {
    setOverrideDefaultAttributes(attr: IAttributes) {
      const dataChanged = this.setAttr(attr, this.overrideDefaultAttributes)
      if (dataChanged) {
        this.compileAttributes()
      }
    }
    setOverrideAttributes(attr: IAttributes) {
      const dataChanged = this.setAttr(attr, this.overrideAttributes)
      if (dataChanged) {
        this.compileAttributes()
      }
    }
    setAttributes(attr: IAttributes) {
      const dataChanged = this.setAttr(attr, this.originalAttributes)
      if (dataChanged) {
        this.compileAttributes()
      }
    }
    compileAttributes() {
      this.attributes = { ...this.defaultAttributes, ...this.overrideDefaultAttributes, ...this.originalAttributes, ...this.overrideAttributes }
    }

    setAttr(source: IAttributes, target: IAttributes): boolean {
      let dataChanged = false
      const keys = Object.keys(this.defaultAttributes)
      for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i]
        if (source.hasOwnProperty(key)) {
          dataChanged = true
          if (source[key] !== this.defaultAttributes[key]) {
            target[key] = source[key]
          } else {
            delete target[key]
          }
        }
      }
      return dataChanged
    }
  }
}
