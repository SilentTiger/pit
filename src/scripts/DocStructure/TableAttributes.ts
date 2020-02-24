export default interface ITableAttributes {
  width: number
  colWidth: number[]
}

const tableDefaultAttributes: ITableAttributes = {
  width: 0,
  colWidth: [0],
}

export { tableDefaultAttributes as TableDefaultAttributes }
