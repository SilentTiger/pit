import { EnumCursorType } from './EnumCursorType'

export default interface IPointerInteractive {
  getCursorType(): EnumCursorType
  onPointerEnter(x: number, y: number): void
  onPointerLeave(): void
  onPointerMove(x: number, y: number): void
  onPointerDown(x: number, y: number): void
  onPointerUp(x: number, y: number): void
  onPointerTap(x: number, y: number): void
}
