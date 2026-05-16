/**
 * 可编辑的提示存储文件
 *
 * 说明：每个 key 对应一个关卡或结局的标识（例如: "stage0", "end1"），
 * 值是一个长度为 3 的字符串数组，对应三个提示（hint1, hint2, hint3）。
 * 你可以直接编辑此文件以添加/修改提示。
 */

export const HINTS: Record<string, string[]> = {
  // 示例条目，替换或新增条目以扩展提示库
  "stage0": [
    "照着about里说的做。",
    "照着intro里说的做。",
    "inst应该已经教会了你。"
  ],

  // 在此示例之外，请按格式添加类似条目：
  // "stage1": ["hint1","hint2","hint3"],
};

export const HINT_KEYS = Object.keys(HINTS);
