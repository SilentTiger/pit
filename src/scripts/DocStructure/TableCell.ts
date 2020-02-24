import { IRenderStructure } from '../Common/IRenderStructure'
import { IBubbleUpable } from '../Common/IBubbleElement'
import Op from 'quill-delta-enhanced/dist/Op'
import { ILinkedListNode } from '../Common/LinkedList'
import TableRow from './TableRow'
import DocContent from './DocContent'
import Delta from 'quill-delta-enhanced'

export default class TableCell extends DocContent implements ILinkedListNode, IRenderStructure, IBubbleUpable {
  public x: number = 0
  public y: number = 0
  public width: number = 0
  public height: number = 0
  public prevSibling: this | null = null
  public nextSibling: this | null = null
  public parent: TableRow | null = null
  public needLayout: boolean = true

  public readFromOps(Ops: Op[]): void {
    const delta = Ops[0].insert as Delta
    super.readFromChanges(delta)
  }

  public layout() {
    if (this.needLayout) {
      super.layout()
      this.needLayout = false
    }
  }
}
