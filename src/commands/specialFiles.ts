/**
 * 特殊文件和目录的运行时规则引擎
 *
 * 这个模块负责：
 * - 以声明式规则的形式维护特殊文件逻辑
 * - 根据文件系统事件计算可见性、可访问性、覆盖内容、以及结构替换
 * - 让后续关卡只需扩展规则数据，而不是在逻辑中写新函数
 */

import { fileSystem, fileContents } from "../dirStructure";

export type SpecialState = {
  flags: Record<string, boolean>;
  effects: Record<string, SpecialEffect>;
};

export type SpecialEffect = {
  visible?: boolean;
  accessible?: boolean;
  listable?: boolean;
  overrideContent?: string;
};

export type RuleCondition =
  | { type: "fileExists"; path: string }
  | { type: "folderExists"; path: string }
  | { type: "fileContentEquals"; path: string; content: string }
  | { type: "flagTrue"; name: string }
  | { type: "flagFalse"; name: string }
  | { type: "not"; condition: RuleCondition }
  | { type: "any"; conditions: RuleCondition[] }
  | { type: "all"; conditions: RuleCondition[] }
  | { type: "fileGroup"; items: RuleCondition[] };

export type RuleAction =
  | { type: "setVisibility"; path: string; visible: boolean }
  | { type: "setAccessibility"; path: string; accessible: boolean }
  | { type: "setListability"; path: string; listable: boolean }
  | { type: "setFlag"; name: string; value: boolean }
  | { type: "overrideContent"; path: string; content: string }
  | { type: "replaceTree"; path: string; tree: SpecialTreeNode };

export type SpecialTreeNode =
  | { type: "folder"; children: Record<string, SpecialTreeNode> }
  | { type: "file"; content?: string };

export type SpecialRule = {
  trigger: "read" | "create" | "delete" | "write";
  path: string;
  conditions?: RuleCondition[];
  actions: RuleAction[];
};

export const specialState: SpecialState = {
  flags: {},
  effects: {},
};

const pathKey = (path: string[]) => path.join("/");
const normalizePath = (path: string | string[]) =>
  typeof path === "string" ? path.split("/").filter(Boolean) : path;

const ensureEffect = (path: string) => {
  if (!specialState.effects[path]) {
    specialState.effects[path] = {};
  }
  return specialState.effects[path];
};

const getEffectFlags = (path: string[]) => {
  const effect = specialState.effects[pathKey(path)] || {};
  return {
    listable: effect.listable ?? effect.visible ?? true,
    accessible: effect.accessible ?? effect.visible ?? true,
  };
};

export const isPathAccessible = (path: string[]) => {
  if (path.length === 0) return true;
  const nodes = normalizePath(path);
  for (let idx = 1; idx <= nodes.length; idx += 1) {
    const prefixes = nodes.slice(0, idx);
    if (!getEffectFlags(prefixes).accessible) {
      return false;
    }
  }
  return true;
};

export const isPathListable = (path: string[]) => {
  if (path.length === 0) return true;
  const nodes = normalizePath(path);
  for (let idx = 1; idx <= nodes.length; idx += 1) {
    const prefixes = nodes.slice(0, idx);
    if (!getEffectFlags(prefixes).listable) {
      return false;
    }
  }
  return true;
};

const folderExists = (path: string[]) => {
  let current: any = fileSystem.root.children;
  for (const part of path) {
    if (!current?.[part] || current[part].type !== "folder") return false;
    current = current[part].children;
  }
  return true;
};

const fileExists = (path: string[]) => {
  const key = pathKey(path);
  return fileContents[key] !== undefined;
};

const fileContentEquals = (path: string[], content: string) => {
  const key = pathKey(path);
  return fileContents[key] === content;
};

const evaluateCondition = (condition: RuleCondition): boolean => {
  switch (condition.type) {
    case "fileExists":
      return fileExists(normalizePath(condition.path));
    case "folderExists":
      return folderExists(normalizePath(condition.path));
    case "fileContentEquals":
      return fileContentEquals(normalizePath(condition.path), condition.content);
    case "flagTrue":
      return specialState.flags[condition.name] === true;
    case "flagFalse":
      return specialState.flags[condition.name] === false;
    case "not":
      return !evaluateCondition(condition.condition);
    case "any":
      return condition.conditions.some(evaluateCondition);
    case "all":
      return condition.conditions.every(evaluateCondition);
    case "fileGroup":
      return condition.items.every(evaluateCondition);
    default:
      return false;
  }
};

const applyAction = (action: RuleAction) => {
  switch (action.type) {
    case "setVisibility":
      ensureEffect(action.path).visible = action.visible;
      break;
    case "setAccessibility":
      ensureEffect(action.path).accessible = action.accessible;
      break;
    case "setListability":
      ensureEffect(action.path).listable = action.listable;
      break;
    case "setFlag":
      specialState.flags[action.name] = action.value;
      break;
    case "overrideContent":
      ensureEffect(action.path).overrideContent = action.content;
      break;
    case "replaceTree":
      replaceTree(normalizePath(action.path), action.tree);
      break;
  }
};

const processSpecialRule = (rule: SpecialRule) => {
  const conditions = rule.conditions ?? [];
  const pass = conditions.every(evaluateCondition);
  if (!pass) return;
  rule.actions.forEach(applyAction);
};

const replaceTree = (path: string[], tree: SpecialTreeNode) => {
  let current: any = fileSystem.root.children;
  for (let i = 0; i < path.length - 1; i += 1) {
    current = current[path[i]]?.children;
    if (!current) return;
  }
  const name = path[path.length - 1];
  if (!current) return;

  const deleteSubtree = (sub: any, prefix: string[]) => {
    if (sub.type === "folder") {
      Object.entries(sub.children).forEach(([key, child]: [string, any]) => {
        deleteSubtree(child, [...prefix, key]);
      });
      delete sub.children;
    }
    if (sub.type === "file") {
      delete fileContents[prefix.join("/")];
    }
  };

  if (current[name]) {
    deleteSubtree(current[name], path);
    delete current[name];
  }

  const buildNode = (node: SpecialTreeNode, parent: any, nodeName: string) => {
    if (node.type === "folder") {
      parent[nodeName] = { type: "folder", children: {} };
      Object.entries(node.children).forEach(([childName, childNode]) => {
        buildNode(childNode, parent[nodeName].children, childName);
      });
    } else {
      parent[nodeName] = { type: "file" };
      fileContents[[...path.slice(0, -1), nodeName].join("/")] = node.content ?? "";
    }
  };

  buildNode(tree, current, name);
};

const isPrefixPath = (prefix: string[], path: string[]) => {
  if (prefix.length > path.length) return false;
  return prefix.every((segment, index) => segment === path[index]);
};

import { SPECIAL_RULES } from "./specialRules";

const processSpecialRules = (trigger: SpecialRule["trigger"], eventPath: string[]) => {
  const eventKey = pathKey(eventPath);
  for (const rule of SPECIAL_RULES) {
    if (rule.trigger !== trigger) continue;
    const rulePath = normalizePath(rule.path);
    if (trigger === "read") {
      if (pathKey(rulePath) !== eventKey) continue;
    } else {
      if (!isPrefixPath(rulePath, eventPath)) continue;
    }
    processSpecialRule(rule);
  }
};

export const runReadRule = (path: string[]) => {
  processSpecialRules("read", path);
  const effect = specialState.effects[pathKey(path)];
  return effect?.overrideContent ?? null;
};

export const runCreateRule = (path: string[]) => {
  processSpecialRules("create", path);
};

export const runDeleteRule = (path: string[]) => {
  processSpecialRules("delete", path);
};

export const runWriteRule = (path: string[], newContent: string) => {
  void newContent;
  processSpecialRules("write", path);
};

