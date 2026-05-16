/**
 * 维护特殊规则数据的独立文件
 * 让规则更易于扩展和维护，避免将大量数据留在规则引擎实现文件中。
 */

import type { SpecialRule, SpecialTreeNode } from "./specialFiles";

const treeFile = { type: "file" } as const;
const treeFolder = (children: Record<string, SpecialTreeNode>) => ({ type: "folder", children } as const);

export const SPECIAL_RULES: SpecialRule[] = [
  {
    trigger: "write",
    path: "test/example1/gratitude/great",
    conditions: [
      { type: "fileContentEquals", path: "test/example1/gratitude/great", content: "abcdefg" },
    ],
    actions: [{ type: "setVisibility", path: "test/example1/something", visible: true }],
  },
  {
    trigger: "write",
    path: "test/example1/gratitude/great",
    conditions: [
      {
        type: "not",
        condition: {
          type: "fileContentEquals",
          path: "test/example1/gratitude/great",
          content: "abcdefg",
        },
      },
    ],
    actions: [{ type: "setVisibility", path: "test/example1/something", visible: false }],
  },
  {
    trigger: "delete",
    path: "test/example1/gratitude/great",
    actions: [{ type: "setVisibility", path: "test/example1/something", visible: false }],
  },
  {
    trigger: "read",
    path: "test/example2/another",
    conditions: [
      {
        type: "fileGroup",
        items: [
          { type: "fileContentEquals", path: "test/example2/maybeafile/qwerty", content: "123456" },
          { type: "folderExists", path: "test/example2/maybeafile/asdcxz" },
          { type: "fileExists", path: "test/example2/maybeafile/asdcxz/lambda" },
          {
            type: "fileContentEquals",
            path: "test/example2/maybeafile/asdcxz/aaaaaaaaa/disr",
            content: "999999",
          },
        ],
      },
    ],
    actions: [{ type: "overrideContent", path: "test/example2/another", content: "zxcvbn" }],
  },
  {
    trigger: "read",
    path: "test/example3/noway",
    actions: [
      { type: "setFlag", name: "test/example3/noway.read", value: true },
      {
        type: "replaceTree",
        path: "test/example3/ourlast",
        tree: treeFolder({
          hello: treeFolder({
            yesyes: treeFile,
            yeyyyy: treeFile,
          }),
          imimimi: treeFile,
        }),
      },
    ],
  },
];
