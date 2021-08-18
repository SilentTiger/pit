export interface IBubbleUpable {
  bubbleUp(type: string, data: any, stack?: any[]): void
  setBubbleHandler(handler: ((type: string, data: any, stack?: any[]) => void) | null): void
}

export function IBubbleUpableDecorator<T extends new (...args: any[]) => IBubbleUpable>(constructor: T) {
  return class extends constructor {
    public bubbleHandler: ((type: string, data: any, stack?: any[]) => void) | null = null

    public bubbleUp(type: string, data: any, stack?: any[]): void {
      if (typeof this.bubbleHandler === 'function') {
        let newStack: any[] | undefined
        if (Array.isArray(stack)) {
          stack.push(this)
        } else {
          newStack = [this]
        }
        this.bubbleHandler(type, data, newStack ?? stack)
      }
    }

    public setBubbleHandler(handler: ((type: string, data: any, stack?: any[]) => void) | null): void {
      if (typeof handler === 'function') {
        this.bubbleHandler = handler
      } else {
        this.bubbleHandler = null
      }
    }
  }
}
