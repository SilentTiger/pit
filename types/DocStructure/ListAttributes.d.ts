import { EnumListType } from './EnumListStyle';
export default interface IListAttributes {
    type: EnumListType;
    listId: string;
}
declare const listDefaultAttributes: IListAttributes;
export { listDefaultAttributes as ListDefaultAttributes };
