export default class FragmentAttributes {
  public author: string;
  public start: number;
  public length: number;
  public comment: string;
}

const FragmentDefaultAttributes = {
  author: '',
  comment: '',
  length: 0,
  start: 0,
};

export { FragmentDefaultAttributes };
