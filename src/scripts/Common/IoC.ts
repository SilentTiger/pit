const map: Map<string, new () => any> = new Map()

export const bind = (type: string, constructorFunction: new () => any) => {
  if (map.has(type)) {
    throw new Error(`can not bind twice: ${type}`)
  }
  map.set(type, constructorFunction)
}

export const get = <T extends new () => any>(type: string) => {
  if (!map.has(type)) {
    throw new Error(`can not find constructor: ${type}`)
  }
  return map.get(type) as T
}

export const create = <T>(type: string): T => {
  const ConstructorFunction = map.get(type)
  if (!ConstructorFunction) {
    throw new Error(`can not find constructor: ${type}`)
  } else {
    return new ConstructorFunction() as T
  }
}
