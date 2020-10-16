export type IAttributes = { [key: string]: any }

export interface IAttributable {
  defaultAttributes: IAttributes
  overrideDefaultAttributes: IAttributes | null
  originalAttributes: IAttributes | null
  overrideAttributes: IAttributes | null
  attributes: IAttributes

  setOverrideDefaultAttributes(attr: IAttributes | null): void
  setOverrideAttributes(attr: IAttributes | null): void
  setAttributes(attr: IAttributes | null | undefined): void
  compileAttributes(): void
}

export function IAttributableDecorator<T extends { new(...args: any[]): IAttributable }>(constructor: T) {
  return class extends constructor {
    setOverrideDefaultAttributes(attr: IAttributes | null) {
      this.overrideDefaultAttributes = attr
      this.compileAttributes()
    }

    setOverrideAttributes(attr: IAttributes | null) {
      this.overrideAttributes = attr
      this.compileAttributes()
    }

    setAttributes(attr: IAttributes | null | undefined) {
      let needCompileAttributes = false
      if (!attr) {
        if (this.originalAttributes !== null) {
          this.originalAttributes = null
          needCompileAttributes = true
        }
      } else {
        const keys = Object.keys(this.defaultAttributes)
        for (let i = 0, l = keys.length; i < l; i++) {
          const key = keys[i]
          if (attr.hasOwnProperty(key)) {
            if (attr[key] === undefined && this.originalAttributes && this.originalAttributes.hasOwnProperty(key)) {
              delete this.originalAttributes[key]
              needCompileAttributes = true
            } else if (attr[key] !== this.defaultAttributes[key] && (this.originalAttributes === null || attr[key] !== this.originalAttributes[key])) {
              this.originalAttributes = this.originalAttributes ?? {}
              this.originalAttributes[key] = attr[key]
              needCompileAttributes = true
            } else if (attr[key] === this.defaultAttributes[key] && this.originalAttributes && this.originalAttributes.hasOwnProperty(key)) {
              delete this.originalAttributes[key]
              needCompileAttributes = true
              if (Object.keys(this.originalAttributes).length === 0) {
                this.originalAttributes = null
              }
            }
          }
        }
      }
      if (needCompileAttributes) {
        this.compileAttributes()
      }
    }

    compileAttributes() {
      const keys = Object.keys(this.defaultAttributes)
      for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i]
        if (this.overrideAttributes && this.overrideAttributes.hasOwnProperty(key)) {
          this.attributes[key] = this.overrideAttributes[key]
        } else if (this.originalAttributes && this.originalAttributes.hasOwnProperty(key)) {
          this.attributes[key] = this.originalAttributes[key]
        } else if (this.overrideDefaultAttributes && this.overrideDefaultAttributes.hasOwnProperty(key)) {
          this.attributes[key] = this.overrideDefaultAttributes[key]
        } else if (this.defaultAttributes.hasOwnProperty(key)) {
          this.attributes[key] = this.defaultAttributes[key]
        }
      }
    }
  }
}
