export interface IBubbleUpable {
  parent?: IBubbleUpable | null
  bubbleUp(type: string, data: any, stack?: any[]): void
}

export function IBubbleUpableDecorator<T extends new (...args: any[]) => IBubbleUpable>(constructor: T) {
  return class extends constructor {
    public bubbleUp(type: string, data: any, stack?: any[]): void {
      if (this.parent) {
        let newStack: any[] | undefined
        if (Array.isArray(stack)) {
          stack.push(this)
        } else {
          newStack = [this]
        }
        this.parent.bubbleUp(type, data, newStack ?? stack)
      }
    }
  }
}
