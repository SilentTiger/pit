import { LinkedList } from "../Common/LinkedList";
import { guid } from "../Common/Util";
import Paragraph from '../DocStructure/Paragraph';
import Line from "./Line";
export default class Frame extends LinkedList<Line> {
  public readonly id: string = guid();
  constructor(paragraph: Paragraph) {
    super();
  }
}
