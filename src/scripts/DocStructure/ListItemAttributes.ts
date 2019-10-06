import {EnumListType} from './EnumListStyle';

export default interface IListItemAttributes {
  listType: EnumListType;
  listId: number;
  liColor: string;
  liSize: number;
  liLinespacing: string;
  liIndent: number;
}

const listItemDefaultAttributes: IListItemAttributes = {
  listType: EnumListType.ol_1,
  listId: 0,
  liColor: '#494949',
  liSize: 11,
  liLinespacing:  '100',
  liIndent: 0,
};

export { listItemDefaultAttributes as ListItemDefaultAttributes };
