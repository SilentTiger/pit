export default interface IFragmentAttributes {
  author: string;
  background: string;
  color: string;
  comment: string;
  strike: boolean;
  underline: boolean;
}

const FragmentDefaultAttributes = {
  author: '',
  background: '#ffffff',
  color: '#494949',
  comment: '',
  strike: false,
  underline: false,
};

export { FragmentDefaultAttributes };
