export default interface IFragmentAttributes {
  author?: string;
  background?: string;
  comment?: string;
  strike?: boolean;
  underline?: boolean;
}

const FragmentDefaultAttributes = {
  author: '',
  background: '#ffffff',
  comment: '',
  strike: false,
  underline: false,
};

export { FragmentDefaultAttributes };
