/**
 * 文档结构注册机
 * 这个类只暴露出一个实例，用来在全局注册各种 block 和 fragment，从而实现文档内容结构的可扩展
 */
import Delta from 'quill-delta-enhanced'
import type Block from './Block/Block'
import type Fragment from './Fragment/Fragment'

class StructureRegistrar {
  private defaultDocContentDelta: Delta = new Delta([{ insert: 1, attributes: { frag: 'end', block: 'para' } }])
  private registeredBlocks: Map<string, new () => Block> = new Map()
  private registeredFragments: Map<string, new () => Fragment> = new Map()

  public getDefaultDocContentDelta() {
    return this.defaultDocContentDelta
  }

  public setDefaultDocContentDelta(delta: Delta) {
    this.defaultDocContentDelta = delta
  }

  public registerBlock(blockType: string, BlockClass: new () => Block) {
    this.registeredBlocks.set(blockType, BlockClass)
  }

  public registerFragment(fragmentType: string, FragmentClass: new () => Fragment) {
    this.registeredFragments.set(fragmentType, FragmentClass)
  }

  public unregisterBlock(blockType: string) {
    this.registeredBlocks.delete(blockType)
  }

  public unregisterAllBlock() {
    this.registeredBlocks.clear()
  }

  public unregisterFragment(fragmentType: string) {
    this.registeredFragments.delete(fragmentType)
  }

  public unregisterAllFragment() {
    this.registeredFragments.clear()
  }

  public getBlockClass(blockType: string) {
    return this.registeredBlocks.get(blockType)
  }

  public getFragmentClass(fragmentType: string) {
    return this.registeredFragments.get(fragmentType)
  }
}

export default new StructureRegistrar()
