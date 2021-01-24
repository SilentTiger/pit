export default interface IFragmentAttributes {
  background: string
  color: string
  strike: boolean
  underline: boolean
  [key: string]: any
}

const fragmentDefaultAttributes = {
  background: '#ffffff',
  color: '#494949',
  strike: false,
  underline: false,
}

export { fragmentDefaultAttributes as FragmentDefaultAttributes }
