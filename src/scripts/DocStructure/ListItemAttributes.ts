import {EnumListType} from './EnumListStyle';

export default interface IListItemAttributes {
  listType: EnumListType;
  listId: string;
  liColor: string;
  liSize: number;
  liLinespacing: string;
  liIndent: number;
}

const listItemDefaultAttributes: IListItemAttributes = {
  listType: EnumListType.ol_1,
  listId: '',
  liColor: '#494949',
  liSize: 11,
  liLinespacing:  '100',
  liIndent: 0,
};

export { listItemDefaultAttributes as ListItemDefaultAttributes };
