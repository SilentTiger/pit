import Fragment from "../DocStructure/Fragment";
import Run from "./Run";
/**
 * 用 fragment 创建 一个 run，run 的工厂函数
 * @param frag fragment 实例
 * @param x 当前 run 的 x 坐标
 * @param y 当前 run 的 y 坐标
 */
export declare function createRun(frag: Fragment, x: number, y: number): Run;
