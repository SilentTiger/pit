import {EnumListType} from './EnumListStyle';

export default interface IListItemAttributes {
  type: EnumListType;
  listId: string;
  color: string;
  size: number;
  linespacing: string;
  indent: number;
}

const ListItemDefaultAttributes: IListItemAttributes = {
  type: EnumListType.ol_1,
  listId: '',
  color: '#494949',
  size: 11,
  linespacing:  '100',
  indent: 0,
};

export { ListItemDefaultAttributes };
