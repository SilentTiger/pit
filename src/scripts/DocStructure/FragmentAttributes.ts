export default class FragmentAttributes {
  public author: string;
  public background: string;
  public comment: string;
  public strike: boolean;
  public underline: boolean;
}

const FragmentDefaultAttributes = {
  author: '',
  background: '#ffffff',
  comment: '',
  strike: false,
  underline: false,
};

export { FragmentDefaultAttributes };
