import { EnumAlign } from './EnumParagraphStyle'

export default interface ILayoutFrameAttributes {
  align: EnumAlign
  linespacing: number
  indent: number
  [key: string]: any
}

const layoutFrameDefaultAttributes: ILayoutFrameAttributes = {
  align: EnumAlign.left,
  indent: 0,
  linespacing: 1.7,
}

export { layoutFrameDefaultAttributes as LayoutFrameDefaultAttributes }
