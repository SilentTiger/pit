import {EnumListType} from './EnumListStyle';

export default interface IListAttributes {
  type: EnumListType;
  listId: string;
}

const listDefaultAttributes: IListAttributes = {
  type: EnumListType.ol_1,
  listId: '',
};

export { listDefaultAttributes as ListDefaultAttributes };
