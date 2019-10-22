import Fragment from '../DocStructure/Fragment'
import FragmentDate from '../DocStructure/FragmentDate'
import FragmentImage from '../DocStructure/FragmentImage'
import FragmentParaEnd from '../DocStructure/FragmentParaEnd'
import FragmentText from '../DocStructure/FragmentText'
import Run from './Run'
import RunDate from './RunDate'
import RunImage from './RunImage'
import RunParaEnd from './RunParaEnd'
import RunText from './RunText'

/**
 * 用 fragment 创建 一个 run，run 的工厂函数
 * @param frag fragment 实例
 * @param x 当前 run 的 x 坐标
 * @param y 当前 run 的 y 坐标
 */
export function createRun(frag: Fragment, x: number, y: number): Run {
  let run: Run
  switch (true) {
    case frag instanceof FragmentText:
      run = new RunText(frag as FragmentText, x, y)
      break
    case frag instanceof FragmentImage:
      run = new RunImage(frag as FragmentImage, x, y)
      break
    case frag instanceof FragmentDate:
      run = new RunDate(frag as FragmentDate, x, y)
      break
    case frag instanceof FragmentParaEnd:
      run = new RunParaEnd(frag as FragmentParaEnd, x, y)
      break
    default:
      throw new Error('unknown frag type to create Run')
      break
  }
  return run
}
