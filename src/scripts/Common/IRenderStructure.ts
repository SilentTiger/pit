import IDrawable from './IDrawable'
import IRectangle from './IRectangle'
import IPointerInteractive from './IPointerInteractive'

export type IRenderStructure = IDrawable & IPointerInteractive & IRectangle
