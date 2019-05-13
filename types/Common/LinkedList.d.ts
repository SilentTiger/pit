/**
 * 链式列表泛型类，提供了基本的链式列表操作
 */
export declare abstract class LinkedList<T extends ILinkedListNode> {
    readonly children: T[];
    head: T | null;
    tail: T | null;
    /**
     * 在当前链式列表末尾插入一个子元素
     * @param node 子元素实例
     */
    add(node: T): void;
    /**
     * 在目标子元素实例前插入一个子元素
     * @param node 要插入的子元素实例
     * @param target 目标子元素实例
     */
    addBefore(node: T, target: T): void;
    /**
     * 在指定索引位置插入一个子元素实例
     * @param node 子元素实例
     * @param index 索引位置
     */
    addAtIndex(node: T, index: number): void;
    /**
     * 将一组子元素实例插入当前链式列表末尾
     * @param nodes 子元素数组
     */
    addAll(nodes: T[]): void;
    /**
     * 清楚当前链式列表中所有子元素
     */
    removeAll(): void;
    /**
     * 从当前链式列表删除一个子元素
     * @param node 要删除的子元素
     */
    remove(node: T): void;
    /**
     * 查找元素在当前链式列表中的索引位置，如果找不到返回 -1
     * @param node 子元素实例
     */
    findIndex(node: T): number;
}
/**
 * 链式列表子元素接口
 */
export interface ILinkedListNode {
    /**
     * 前一个元素节点
     */
    prevSibling: this | null;
    /**
     * 后一个元素节点
     */
    nextSibling: this | null;
    /**
     * 当前子元素实例所属的链式列表
     */
    parent: LinkedList<ILinkedListNode> | null;
    /**
     * 销毁该节点，主要用来释放当前子元素节点所持有的各种资源，
     * 该方法并不会将子元素自身从所属链式列表中移除
     */
    destroy(): void;
}
