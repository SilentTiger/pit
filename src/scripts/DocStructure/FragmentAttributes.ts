export default interface IFragmentAttributes {
  author: string;
  background: string;
  color: string;
  comment: string;
  strike: boolean;
  underline: boolean;
}

const fragmentDefaultAttributes = {
  author: '',
  background: '#ffffff',
  color: '#494949',
  comment: '',
  strike: false,
  underline: false,
};

export { fragmentDefaultAttributes as FragmentDefaultAttributes };
