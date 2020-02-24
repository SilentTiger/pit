import { EnumCellVerticalAlign } from './EnumTableStyle'

export default interface ITableCellAttributes {
  verticalAlign: EnumCellVerticalAlign
}

const tableCellDefaultAttributes: ITableCellAttributes = {
  verticalAlign: EnumCellVerticalAlign.Top,
}

export { tableCellDefaultAttributes as TableCellDefaultAttributes }
