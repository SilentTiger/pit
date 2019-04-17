import Delta from "quill-delta";

/**
 * Loader 负责加载 sample_docs 中的数据文件，同时将数据文件中的字符数据转换成 JSON 数据
 */

export default function start(fileName?: string): Promise<Delta> {
  fileName = fileName || "006.txt";
  return fetch(`sample_docs/${fileName}`, { mode: "no-cors" })
    .then((res) => {
      console.time("loader");
      return res.text();
    })
    .then((text) => {
      const res = new Delta(JSON.parse(text));
      console.timeEnd("loader");
      return res;
    });
}
