import Fragment from "../DocStructure/Fragment";
import FragmentDate from '../DocStructure/FragmentDate';
import FragmentImage from "../DocStructure/FragmentImage";
import FragmentText from "../DocStructure/FragmentText";
import Run from "./Run";
import RunDate from './RunDate';
import RunImage from "./RunImage";
import RunText from "./RunText";

export function createRun(frag: Fragment, x: number, y: number): Run {
  let run: Run;
  switch (true) {
    case frag instanceof FragmentText:
      run = new RunText(frag as FragmentText, x, y);
      break;
    case frag instanceof FragmentImage:
      run = new RunImage(frag as FragmentImage, x, y);
      break;
    case frag instanceof FragmentDate:
      run = new RunDate(frag as FragmentDate, x, y);
      break;
    default:
      throw new Error("unknown frag type to create Run");
      break;
  }
  return run;
}
