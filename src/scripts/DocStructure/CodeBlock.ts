import prism, { Token, util } from 'prismjs'

import BlockCommon from './BlockCommon'
import Op from 'quill-delta-enhanced/dist/Op'
import ICodeBlockAttributes, { CodeBlockDefaultAttributes } from './CodeBlockAttributes'
import ICanvasContext from '../Common/ICanvasContext'
import LayoutFrame from './LayoutFrame'
import FragmentText from './FragmentText'
import CodeHighlightThemeRegistrar, { CodeHighlightTheme, DefaultTheme } from './CodeHighlightThemeRegistrar'
import { EnumFont } from './EnumTextStyle'
import FragmentParaEnd from './FragmentParaEnd'
import { measureTextWidth } from '../Common/Platform'
import { FragmentTextDefaultAttributes } from './FragmentTextAttributes'
// code block 是一个特殊的 block，
// 它读取 op 的方式，layout 的方式都与一般 block 完全不同

type TokenTreeNode = { kind: string, children: TokenTreeNode[] } | string

const LINE_NUM_MARGIN_RIGHT = 3
const LINE_NUM_MARGIN_LEFT = 2
const CODE_MARGIN_LEFT = 2

export default class CodeBlock extends BlockCommon {
  public static readonly blockType: string = 'code'
  public attributes:ICodeBlockAttributes = { ...CodeBlockDefaultAttributes }
  private codeLines: string[] = []
  private theme: CodeHighlightTheme = new DefaultTheme()
  private lineNumWidth: number = 0

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
    // CodeBlock 在排版的时候，先用 prism 对当前代码块中所有内容 tokenize
    // 然后根据 tokenize 的结果生成 layoutframe 和 里面的 fragment
    // 再按照普通 BlockCommon 的逻辑对 layoutframe 进行排版
    // 最后根据排版的结果加上行号

    if (this.needLayout) {
      this.removeAll()
      // 先 tokenize
      const tokenStream = prism.tokenize(this.codeLines.join('\n') + '\n', prism.languages.javascript)
      if (tokenStream.length > 0) {
        const frames: LayoutFrame[] = []
        const currentFrame = new LayoutFrame()
        this.parseTokenTree(tokenStream, frames, currentFrame, '')

        // 然后计算行号需要的宽度，因为 code 用的是等宽字体，所以只用计算最大行号的宽度就行了
        this.lineNumWidth = measureTextWidth(frames.length.toString(), {
          font: EnumFont.get('source')!,
          italic: false,
          bold: false,
          size: FragmentTextDefaultAttributes.size,
        }) + LINE_NUM_MARGIN_LEFT + LINE_NUM_MARGIN_RIGHT

        this.addAll(frames)
      }

      let currentFrame: LayoutFrame | null = null
      let newWidth = 0
      for (let i = 0, l = this.children.length; i < l; i++) {
        currentFrame = this.children[i]
        currentFrame.layout()
        currentFrame.x = this.lineNumWidth + CODE_MARGIN_LEFT
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
    // 绘制背景色
    ctx.fillStyle = this.theme.codeBackground
    ctx.fillRect(x + this.x + this.lineNumWidth, y + this.y, this.width - this.lineNumWidth, this.height)
    // 绘制行号背景色
    ctx.fillStyle = this.theme.lineNumBackground
    ctx.fillRect(x + this.x, y + this.y, this.lineNumWidth, this.height)
    for (let index = 0; index < this.children.length; index++) {
      const currentFrame = this.children[index]
      const frameYPosStart = y + this.y + currentFrame.y
      const frameYPosEnd = frameYPosStart + currentFrame.height
      if (frameYPosStart >= viewHeight || frameYPosEnd <= 0) { continue }
      currentFrame.draw(ctx, this.x + x, this.y + y, viewHeight)
      // 绘制行号
      ctx.textAlign = 'right'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = this.theme.lineNumColor
      ctx.fillText(
        (index + 1).toString(),
        x + this.x + currentFrame.x - CODE_MARGIN_LEFT - LINE_NUM_MARGIN_RIGHT,
        currentFrame.lines[0].y + currentFrame.lines[0].baseline + currentFrame.y + this.y + y
      )
      ctx.textAlign = 'start'
    }
    super.draw(ctx, x, y, viewHeight)
  }

  protected setChildrenMaxWidth(frame: LayoutFrame) {
    frame.setMaxWidth(this.width - this.lineNumWidth - CODE_MARGIN_LEFT)
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
