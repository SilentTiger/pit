import type Fragment from '../Fragment/Fragment'
import type Run from '../RenderStructure/Run'

const classMap: Map<string, new () => any> = new Map()
export const bind = (type: string, constructorFunction: new () => any) => {
  if (classMap.has(type)) {
    throw new Error(`can not bind twice: ${type}`)
  }
  classMap.set(type, constructorFunction)
}

export const get = <T extends new () => any>(type: string) => {
  if (!classMap.has(type)) {
    throw new Error(`can not find constructor: ${type}`)
  }
  return classMap.get(type) as T
}

export const create = <T>(type: string): T => {
  const ConstructorFunction = classMap.get(type)
  if (!ConstructorFunction) {
    throw new Error(`can not find constructor: ${type}`)
  } else {
    return new ConstructorFunction() as T
  }
}

const fragTypeSet: Set<typeof Fragment> = new Set()
const runMapArray: {
  fragType: typeof Fragment
  constructorFunction: new (frag: Fragment, x: number, y: number) => Run
}[] = []
export const bindRun = (
  fragType: typeof Fragment,
  constructorFunction: new (frag: Fragment, x: number, y: number) => Run,
) => {
  if (fragTypeSet.has(fragType)) {
    throw new Error(`can not bind run twice: ${fragType.toString()}`)
  }
  fragTypeSet.add(fragType)
  runMapArray.push({ fragType, constructorFunction })
}

export const createRun = <T extends Run>(frag: Fragment, x: number, y: number): T => {
  for (let index = 0; index < runMapArray.length; index++) {
    const { fragType, constructorFunction: RunConstructor } = runMapArray[index]
    if (frag instanceof fragType) {
      return new RunConstructor(frag, x, y) as T
    }
  }
  throw new Error(`can not find run constructor: ${frag}`)
}
