/**
 * 文档结构注册机
 * 这个类只暴露出一个实例，用来在全局注册各种 block 和 fragment，从而实现文档内容结构的可扩展
 */
import Block from './DocStructure/Block'
import Fragment from './DocStructure/Fragment'

class StructureRegistrar {
  private registeredBlocks: Map<string, new ()=> Block> = new Map()
  private registeredFragments: Map<string, new ()=> Fragment> = new Map()

  public registerBlock(blockType: string, BlockClass: new ()=> Block) {
    this.registeredBlocks.set(blockType, BlockClass)
  }

  public registerFragment(fragmentType: string, FragmentClass: new ()=> Fragment) {
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
