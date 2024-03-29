/* eslint-disable no-param-reassign */
import type { Token } from 'prismjs'
import prism from 'prismjs'

import BlockCommon from './BlockCommon'
import type Op from 'quill-delta-enhanced/dist/Op'
import type ICodeBlockAttributes from './CodeBlockAttributes'
import { CodeBlockDefaultAttributes } from './CodeBlockAttributes'
import type ICanvasContext from '../Common/ICanvasContext'
import LayoutFrame from '../RenderStructure/LayoutFrame'
import type FragmentText from '../Fragment/FragmentText'
import type { CodeHighlightTheme } from './CodeHighlightThemeRegistrar'
import CodeHighlightThemeRegistrar, { DefaultTheme } from './CodeHighlightThemeRegistrar'
import { EnumFont } from '../Common/EnumTextStyle'
import FragmentParaEnd from '../Fragment/FragmentParaEnd'
import { FragmentTextDefaultAttributes } from '../Fragment/FragmentTextAttributes'
import { BubbleMessage } from '../Common/EnumBubbleMessage'
import { collectAttributes } from '../Common/util'
import { getPlatform } from '../Platform'
import { create } from '../Common/IoC'

const LINE_NUM_MARGIN_RIGHT = 3
const LINE_NUM_MARGIN_LEFT = 2
const CODE_MARGIN_LEFT = 2

export default class CodeBlock extends BlockCommon {
  public static override readonly typeName: string = 'code'
  public override attributes: ICodeBlockAttributes = { ...CodeBlockDefaultAttributes }
  private codeLines: string[] = []
  private theme: CodeHighlightTheme = new DefaultTheme()
  private lineNumWidth = 0

  public override readFromOps(Ops: Op[]): void {
    const frames = super.readOpsToLayoutFrame(Ops)
    // 给所有的 fragmentText 加上代码的字体
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      for (let j = 0; j < frame.children.length; j++) {
        const frag = frame.children[j]
        frag.setAttributes({ font: EnumFont.getFontValue('source') })
      }
    }
    this.addAll(frames)
    super.setFrameStart()
    this.setAttributes(Ops[Ops.length - 1].attributes)
  }

  public override setAttributes(attrs: any) {
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

  public override layout() {
    // CodeBlock 在排版的时候，会直接对代码的文字内容进行排版，此时渲染出来的代码是没有高亮着色的
    // 然后在 idleCallback 里用 prism 对当前代码块中所有内容 tokenize
    // 再根据 tokenize 的结果生成 layoutframe 和 里面的 fragment
    // 再把生成的新 frame 替换掉未着色的 frame 并按照普通 BlockCommon 的逻辑对 layoutframe 进行排版

    if (this.needLayout) {
      this.layoutFrames()
      getPlatform().requestIdleCallback(this.idleColoring)
    }
  }

  public override draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
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
      if (frameYPosStart >= viewHeight || frameYPosEnd <= 0) {
        continue
      }
      currentFrame.draw(ctx, this.x + x, this.y + y, viewHeight)
      // 绘制行号
      ctx.textAlign = 'right'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = this.theme.lineNumColor
      ctx.fillText(
        (index + 1).toString(),
        x + this.x + currentFrame.x - CODE_MARGIN_LEFT - LINE_NUM_MARGIN_RIGHT,
        currentFrame.lines[0].y + currentFrame.lines[0].baseline + currentFrame.y + this.y + y,
      )
      ctx.textAlign = 'start'
    }
    super.draw(ctx, x, y, viewHeight)
  }

  public override getFormat(): { [key: string]: Set<any> } {
    const res = {}
    collectAttributes(this.attributes, res)
    return res
  }

  public override createSelf(): CodeBlock {
    return new CodeBlock()
  }

  protected override setChildrenMaxWidth(frame: LayoutFrame) {
    frame.setMaxWidth(this.width - this.lineNumWidth - CODE_MARGIN_LEFT)
  }

  private layoutFrames() {
    // 然后计算行号需要的宽度，因为 code 用的是等宽字体，所以只用计算最大行号的宽度就行了
    this.lineNumWidth =
      getPlatform().measureTextWidth(this.children.length.toString(), {
        font: EnumFont.getFontValue('source')!,
        italic: false,
        bold: false,
        size: FragmentTextDefaultAttributes.size,
      }) +
      LINE_NUM_MARGIN_LEFT +
      LINE_NUM_MARGIN_RIGHT

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

  private idleColoring = ({ timeRemaining, didTimeout }: { timeRemaining: () => number; didTimeout: boolean }) => {
    console.log('coloring')
    const frames = this.tokenize()

    this.removeAll()
    this.addAll(frames)
    this.layoutFrames()
    this.bubbleUp(BubbleMessage.NEED_DRAW, null, [this])
  }

  private tokenize(): LayoutFrame[] {
    let stringContent = ''
    for (let i = 0; i < this.children.length; i++) {
      stringContent += this.children[i].toText()
    }
    const tokenStream = prism.tokenize(stringContent, prism.languages.javascript)
    const frames: LayoutFrame[] = []
    if (tokenStream.length > 0) {
      const currentFrame = create<LayoutFrame>(LayoutFrame.typeName)
      this.parseTokenTree(tokenStream, frames, currentFrame, '')
    }
    return frames
  }

  /**
   * 把 prism 解析代码的结果转成 frame 和 fragment
   */
  private parseTokenTree(
    treeRoot: Array<string | Token>,
    frames: LayoutFrame[],
    currentFrame: LayoutFrame,
    currentTokenType: string,
  ): LayoutFrame {
    for (let index = 0; index < treeRoot.length; index++) {
      const currentToken = treeRoot[index]
      if (typeof currentToken === 'string') {
        if (currentToken.indexOf('\n') >= 0) {
          const pieces = currentToken.split('\n')
          for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
            const piece = pieces[pieceIndex]
            if (piece.length > 0) {
              const frag = create<FragmentText>('')
              frag.setContent(piece)
              const attr = this.theme.getStyle(currentTokenType)
              const font = EnumFont.getFontValue('source')
              const fragAttr = { ...attr, ...(typeof font === 'string' ? { font } : null) }
              frag.setAttributes(fragAttr)
              frag.calMetrics()
              currentFrame.addLast(frag)
            }
            if (pieceIndex !== pieces.length - 1) {
              const fragEnd = create<FragmentParaEnd>(FragmentParaEnd.typeName)
              fragEnd.calMetrics()
              currentFrame.addLast(fragEnd)

              currentFrame.calLength()
              frames.push(currentFrame)
              currentFrame = create<LayoutFrame>(LayoutFrame.typeName)
            }
          }
        } else {
          const frag = create<FragmentText>('')
          frag.setContent(currentToken)
          const attr = this.theme.getStyle(currentTokenType)
          const font = EnumFont.getFontValue('source')
          const fragAttr = { ...attr, ...(typeof font === 'string' ? { font } : null) }
          frag.setAttributes(fragAttr)
          frag.calMetrics()
          currentFrame.addLast(frag)
        }
      } else if (typeof currentToken.content === 'string') {
        currentFrame = this.parseTokenTree([currentToken.content], frames, currentFrame, currentToken.type)
      } else {
        currentFrame = this.parseTokenTree(
          currentToken.content as Array<string | Token>,
          frames,
          currentFrame,
          currentToken.type,
        )
      }
    }
    return currentFrame
  }
}
