import type Fragment from '../Fragment/Fragment'
import type Run from '../RenderStructure/Run'

const classMap: Map<string, new (...args: any[]) => any> = new Map()
export const bind = (type: string, constructorFunction: new (...args: any[]) => any) => {
  if (classMap.has(type)) {
    throw new Error(`can not bind twice: ${type}`)
  }
  classMap.set(type, constructorFunction)
}

export const get = <T extends new (...args: any[]) => any>(type: string) => {
  if (!classMap.has(type)) {
    throw new Error(`can not find constructor: ${type}`)
  }
  return classMap.get(type) as T
}

export const create = <T>(type: string, ...args: any[]): T => {
  const ConstructorFunction = classMap.get(type)
  if (!ConstructorFunction) {
    throw new Error(`can not find constructor: ${type}`)
  } else {
    return new ConstructorFunction(...args) as T
  }
}

const fragmentRunMap: Map<string, string> = new Map()

export const mapRunToFragment = (fragTypeName: string, runTypeName: string) => {
  fragmentRunMap.set(fragTypeName, runTypeName)
}

export const createRunByFragment = (frag: Fragment): Run => {
  const fragType = frag.typeName
  const runType = fragmentRunMap.get(fragType)
  if (runType) {
    return create(runType, frag)
  }
  throw new Error(`can not find run constructor: ${frag}`)
}
