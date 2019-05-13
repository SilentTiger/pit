import { EnumListType } from './EnumListStyle';
export default interface IListItemAttributes {
    type: EnumListType;
    listId: string;
    color: string;
    size: number;
    linespacing: string;
    indent: number;
}
declare const listItemDefaultAttributes: IListItemAttributes;
export { listItemDefaultAttributes as ListItemDefaultAttributes };
