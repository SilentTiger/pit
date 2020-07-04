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
      case 'subst':
        return { color: '#444' }
      case 'comment':
        return { color: '#888888' }
      case 'keyword':
      case 'attribute':
      case 'selector-tag':
      case 'meta-keyword':
      case 'doctag':
      case 'name':
        return { bold: true }
      case 'type':
      case 'string':
      case 'number':
      case 'selector-id':
      case 'selector-class':
      case 'quote':
      case 'template-tag':
      case 'deletion':
        return { color: '#888888' }
      case 'title':
      case 'section':
        return { color: '#888888', bold: true }
      case 'regexp':
      case 'symbol':
      case 'variable':
      case 'template-variable':
      case 'link':
      case 'selector-attr':
      case 'selector-pseudo':
        return { color: '#BC6060' }
      case 'literal':
        return { color: '#78A960' }
      case 'built_in':
      case 'bullet':
      case 'code':
      case 'addition':
        return { color: '#397300' }
      case 'meta':
        return { color: '#1f7199' }
      case 'meta-string':
        return { color: '#4d99bf' }
      case 'emphasis':
        return { italic: true }
      case 'strong':
        return { bold: true }
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
