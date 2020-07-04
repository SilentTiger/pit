import { highlight } from 'highlight.js'

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
      console.time('all')
      this.removeAll()
      console.time('highlight')
      const hlRes = highlight(this.attributes.language, this.codeLines.join('\n') + '\n')
      console.timeEnd('highlight')
      const tokenTreeEmitter = (hlRes.emitter as any)
      if (tokenTreeEmitter && tokenTreeEmitter.rootNode && tokenTreeEmitter.rootNode.children) {
        const frames: LayoutFrame[] = []
        const currentFrame = new LayoutFrame()
        console.time('parse layoutframe')
        this.parseTokenTree(tokenTreeEmitter.rootNode.children, frames, currentFrame, '')
        console.timeEnd('parse layoutframe')
        console.time('add all')
        this.addAll(frames)
        console.timeEnd('add all')
      }

      let currentFrame: LayoutFrame | null = null
      let newWidth = 0
      console.time('layout')
      for (let i = 0, l = this.children.length; i < l; i++) {
        currentFrame = this.children[i]
        currentFrame.layout()
        newWidth = Math.max(newWidth, currentFrame.x + currentFrame.width)
      }
      console.timeEnd('layout')
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
      console.timeEnd('all')
    }
  }

  public draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    console.time('draw')
    for (let index = 0; index < this.children.length; index++) {
      const currentFrame = this.children[index]
      const frameYPosStart = y + this.y + currentFrame.y
      const frameYPosEnd = frameYPosStart + currentFrame.height
      if (frameYPosStart >= viewHeight || frameYPosEnd <= 0) { continue }
      currentFrame.draw(ctx, this.x + x, this.y + y, viewHeight)
    }
    super.draw(ctx, x, y, viewHeight)
    console.timeEnd('draw')
  }

  /**
   * 把 highlight.js 解析代码的结果转成 frame 和 fragment
   */
  private parseTokenTree(treeRoot: TokenTreeNode[], frames: LayoutFrame[], currentFrame: LayoutFrame, currentKind: string): LayoutFrame {
    for (let index = 0; index < treeRoot.length; index++) {
      const currentTreeNode = treeRoot[index]
      if (typeof currentTreeNode === 'string') {
        if (currentTreeNode.indexOf('\n') >= 0) {
          const pieces = currentTreeNode.split('\n')
          for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
            const piece = pieces[pieceIndex]
            if (piece.length > 0) {
              const frag = new FragmentText()
              frag.setContent(piece)
              const attr = this.theme.getStyle(currentKind)
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
          frag.setContent(currentTreeNode)
          const attr = this.theme.getStyle(currentKind)
          const font = EnumFont.get('source')
          const fragAttr = { ...(typeof font === 'string' ? { font } : null), ...attr }
          frag.setAttributes(fragAttr)
          frag.calMetrics()
          currentFrame.add(frag)
        }
      } else {
        currentFrame = this.parseTokenTree(currentTreeNode.children, frames, currentFrame, currentTreeNode.kind)
      }
    }
    return currentFrame
  }
}
