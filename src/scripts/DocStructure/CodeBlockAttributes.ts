export default interface ICodeBlockAttributes {
  language: string
  theme: string
}

const codeBlockDefaultAttributes: ICodeBlockAttributes = {
  language: '',
  theme: '',
}

export { codeBlockDefaultAttributes as CodeBlockDefaultAttributes }
