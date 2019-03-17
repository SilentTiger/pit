import {EnumListType} from './EnumListStyle';

export default interface IListAttributes {
  type: EnumListType;
  listId: string;
}

const ListDefaultAttributes: IListAttributes = {
  type: EnumListType.ol_1,
  listId: '',
};

export { ListDefaultAttributes };
