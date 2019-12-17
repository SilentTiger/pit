import { EnumCursorType } from './EnumCursorType'
import { IRenderStructure } from './IRenderStructure'

export default interface IPointerInteractive {
  getCursorType(): EnumCursorType
  onPointerEnter(x: number, y: number, targetStack: IRenderStructure[], currentTargetIndex: number): void
  onPointerLeave(): void
  onPointerMove(x: number, y: number, targetStack: IRenderStructure[], currentTargetIndex: number): void
  onPointerDown(x: number, y: number): void
  onPointerUp(x: number, y: number): void
  onPointerTap(x: number, y: number): void
}
