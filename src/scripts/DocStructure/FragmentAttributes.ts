export default class FragmentAttributes {
  public author: string;
  public background: string;
  public color: string;
  public comment: string;
  public strike: boolean;
  public underline: boolean;
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
