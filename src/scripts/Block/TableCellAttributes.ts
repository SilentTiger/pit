import { EnumCellVerticalAlign } from '../Common/EnumTableStyle'

export default interface ITableCellAttributes {
  vertAlign: EnumCellVerticalAlign
  colSpan: number
  rowSpan: number
}

const tableCellDefaultAttributes: ITableCellAttributes = {
  vertAlign: EnumCellVerticalAlign.Top,
  colSpan: 1,
  rowSpan: 1,
}

export { tableCellDefaultAttributes as TableCellDefaultAttributes }
