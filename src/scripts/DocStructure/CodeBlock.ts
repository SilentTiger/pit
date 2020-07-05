import prism, { Token } from 'prismjs'

import BlockCommon from './BlockCommon'
import Op from 'quill-delta-enhanced/dist/Op'
import ICodeBlockAttributes, { CodeBlockDefaultAttributes } from './CodeBlockAttributes'
import ICanvasContext from '../Common/ICanvasContext'
import LayoutFrame from './LayoutFrame'
import FragmentText from './FragmentText'
import CodeHighlightThemeRegistrar, { CodeHighlightTheme, DefaultTheme } from './CodeHighlightThemeRegistrar'
import { EnumFont } from './EnumTextStyle'
import FragmentParaEnd from './FragmentParaEnd'
// code block 是一个特殊的 block，
// 它读取 op 的方式，layout 的方式都与一般 block 完全不同

type TokenTreeNode = {kind: string, children: TokenTreeNode[]} | string

export default class CodeBlock extends BlockCommon {
  public static readonly blockType: string = 'code'
  public attributes:ICodeBlockAttributes = { ...CodeBlockDefaultAttributes }
  private codeLines: string[] = []
  private theme: CodeHighlightTheme = new DefaultTheme()

  public readFromOps(Ops: Op[]): void {
    for (let index = 0; index < Ops.length; index++) {
      const op = Ops[index]
      if (typeof op.insert === 'string') {
        this.codeLines.push(op.insert)
      }
    }
    this.setAttributes(Ops[Ops.length - 1].attributes)
  }

  public setAttributes(attrs: any) {
    if (typeof attrs.language === 'string') {
      this.attributes.language = attrs.language
    }
    if (typeof attrs.theme === 'string') {
      const theme = CodeHighlightThemeRegistrar.getThemeClass(attrs.theme)
      if (theme) {
        this.theme = theme
      }
    }
  }

  public layout() {
    if (this.needLayout) {
      this.removeAll()
      console.time('highlight')
      const tokenStream = prism.tokenize(this.codeLines.join('\n') + '\n', prism.languages.javascript)
      console.timeEnd('highlight')
      if (tokenStream.length > 0) {
        const frames: LayoutFrame[] = []
        const currentFrame = new LayoutFrame()
        this.parseTokenTree(tokenStream, frames, currentFrame, '')
        this.addAll(frames)
      }

      let currentFrame: LayoutFrame | null = null
      let newWidth = 0
      for (let i = 0, l = this.children.length; i < l; i++) {
        currentFrame = this.children[i]
        currentFrame.layout()
        newWidth = Math.max(newWidth, currentFrame.x + currentFrame.width)
      }
      if (this.head !== null) {
        this.head.setPositionY(0, true, true)
      }
      this.needLayout = false

      let newHeight = 0
      if (currentFrame !== null) {
        newHeight = currentFrame.y + currentFrame.height
      }
      this.setHeight(newHeight)
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height)
      }
    }
  }

  public draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    for (let index = 0; index < this.children.length; index++) {
      const currentFrame = this.children[index]
      const frameYPosStart = y + this.y + currentFrame.y
      const frameYPosEnd = frameYPosStart + currentFrame.height
      if (frameYPosStart >= viewHeight || frameYPosEnd <= 0) { continue }
      currentFrame.draw(ctx, this.x + x, this.y + y, viewHeight)
    }
    super.draw(ctx, x, y, viewHeight)
  }

  /**
   * 把 highlight.js 解析代码的结果转成 frame 和 fragment
   */
  private parseTokenTree(treeRoot: Array<string | Token>, frames: LayoutFrame[], currentFrame: LayoutFrame, currentTokenType: string): LayoutFrame {
    for (let index = 0; index < treeRoot.length; index++) {
      const currentToken = treeRoot[index]
      if (typeof currentToken === 'string') {
        if (currentToken.indexOf('\n') >= 0) {
          const pieces = currentToken.split('\n')
          for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
            const piece = pieces[pieceIndex]
            if (piece.length > 0) {
              const frag = new FragmentText()
              frag.setContent(piece)
              const attr = this.theme.getStyle(currentTokenType)
              const font = EnumFont.get('source')
              const fragAttr = { ...(typeof font === 'string' ? { font } : null), ...attr }
              frag.setAttributes(fragAttr)
              frag.calMetrics()
              currentFrame.add(frag)
            }
            if (pieceIndex !== pieces.length - 1) {
              const fragEnd = new FragmentParaEnd()
              fragEnd.calMetrics()
              currentFrame.add(fragEnd)

              frames.push(currentFrame)
              currentFrame = new LayoutFrame()
            }
          }
        } else {
          const frag = new FragmentText()
          frag.setContent(currentToken)
          const attr = this.theme.getStyle(currentTokenType)
          const font = EnumFont.get('source')
          const fragAttr = { ...(typeof font === 'string' ? { font } : null), ...attr }
          frag.setAttributes(fragAttr)
          frag.calMetrics()
          currentFrame.add(frag)
        }
      } else {
        currentFrame = this.parseTokenTree(currentToken.content as Array<string| Token>, frames, currentFrame, currentToken.type)
      }
    }
    return currentFrame
  }
}
