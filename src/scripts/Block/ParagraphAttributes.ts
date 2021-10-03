import { EnumTitle } from '../Common/EnumTextStyle'

export default interface IParagraphAttributes {
  title: EnumTitle
}

const paragraphDefaultAttributes: IParagraphAttributes = {
  title: EnumTitle.Text,
}

export { paragraphDefaultAttributes as ParagraphDefaultAttributes }
