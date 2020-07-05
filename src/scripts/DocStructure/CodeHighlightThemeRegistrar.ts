export abstract class CodeHighlightTheme {
  public abstract readonly background: string
  public abstract getStyle(kind: string): null | {
    color?: string,
    bold?: boolean,
    italic?: boolean
  }
}

export class DefaultTheme extends CodeHighlightTheme {
  public readonly background = '#f0f0f0'
  public getStyle(kind: string): null | { color?: string | undefined; bold?: boolean | undefined; italic?: boolean | undefined } {
    switch (kind) {
      case 'comment':
      case 'prolog':
      case 'doctype':
      case 'cdata':
        return { color: 'slategray' }
      case 'punctuation':
        return { color: '#999' }
      case 'property':
      case 'tag':
      case 'boolean':
      case 'number':
      case 'constant':
      case 'symbol':
      case 'deleted': {
        return { color: '#905' }
      }
      case 'selector':
      case 'attr-name':
      case 'string':
      case 'char':
      case 'builtin':
      case 'inserted': {
        return { color: '#690' }
      }
      case 'operator':
      case 'entity':
      case 'url':
        return {
          color: '#9a6e3a',
        }
      case 'atrule':
      case 'attr-value':
      case 'keyword': {
        return { color: '#07a' }
      }
      case 'function':
      case 'class-name': {
        return { color: '#DD4A68' }
      }
      case 'regex':
      case 'important':
      case 'variable': {
        return { color: '#e90' }
      }
      case 'bold': {
        return { bold: true }
      }
      case 'italic': {
        return { italic: true }
      }
      default:
        return null
    }
  }
}

class CodeHighlightThemeRegistrar {
  private registeredThemes: Map<string, CodeHighlightTheme> = new Map()

  public registerTheme(themeType: string, ThemeClass: CodeHighlightTheme) {
    this.registeredThemes.set(themeType, ThemeClass)
  }

  public unregisterTheme(themeType: string) {
    this.registeredThemes.delete(themeType)
  }

  public unregisterAllTheme() {
    this.registeredThemes.clear()
  }

  public getThemeClass(themeType: string) {
    return this.registeredThemes.get(themeType)
  }
}

export default new CodeHighlightThemeRegistrar()
