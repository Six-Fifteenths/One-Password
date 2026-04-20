import { BANNER } from "./banner";
import { DEFAULT } from "./default";
import { changeDirectory, readFile, listDirectory, createDirectory, createFile, editFile, handleRmRf } from "./fileOperations";

/** 命令执行上下文：包含所有命令需要访问的 DOM 元素和状态管理函数 */
export type CommandContext = {
  writeLines: (msg: string[]) => void;
  clearTerminal: () => void;
  setBareMode: (b: boolean) => void;
  getBareMode: () => boolean;
  easterEggStyles: () => void;
  disableInput: () => void;
  USERINPUT: HTMLInputElement | null;
  currentPath: string[];
  setCurrentPath: (path: string[]) => void;
};

/** 命令处理函数类型 */
type CommandHandler = (ctx: CommandContext) => void;

/** 装饰器：为命令应用 bare-mode 支持 - 在 bareMode 中禁用命令 */
const applyBareMode = (handler: CommandHandler): CommandHandler => {
  return (ctx: CommandContext) => {
    if (ctx.getBareMode()) {
      // bareMode 中不执行任何命令
      return;
    }
    handler(ctx);
  };
};

/** 命令处理器映射表 */
const commands: Record<string, CommandHandler> = {
  clear: applyBareMode((ctx) => ctx.clearTerminal()),
  banner: applyBareMode((ctx) => ctx.writeLines(BANNER)),
  'rm -rf': applyBareMode((ctx) => ctx.writeLines(["rm: missing operand", "<br>"])),
  ls: applyBareMode((ctx) => listDirectory(ctx)),
  mkdir: applyBareMode((ctx) => ctx.writeLines(["mkdir: missing operand", "<br>"])),
  touch: applyBareMode((ctx) => ctx.writeLines(["touch: missing operand", "<br>"])),
  edit: applyBareMode((ctx) => ctx.writeLines(["edit: missing operand", "<br>"])),
  cat: applyBareMode((ctx) => ctx.writeLines(["cat: missing operand", "<br>"])),
  cd: applyBareMode((ctx) => ctx.writeLines(["cd: missing operand", "<br>"])),
  pwd: applyBareMode((ctx) => {
    const path = ctx.currentPath.length === 0 ? '/' : '/' + ctx.currentPath.join('/');
    ctx.writeLines([path, "<br>"]);
  }),
};

/** 命令是否需要参数的配置表 */
type CommandConfig = {
  needsArg: boolean;
  handler: (arg: string, ctx: CommandContext) => void;
};

/** 需要参数的命令配置 */
const argsCommands: Record<string, CommandConfig> = {
  'cd': { needsArg: true, handler: changeDirectory },
  'cat': { needsArg: true, handler: readFile },
  'mkdir': { needsArg: true, handler: createDirectory },
  'touch': { needsArg: true, handler: createFile },
  'edit': { needsArg: true, handler: editFile },
  'rm -rf': { needsArg: true, handler: handleRmRf },
};

export function handleCommand(input: string, ctx: CommandContext) {
  // 检查是否是带参数的命令
  for (const [cmdName, config] of Object.entries(argsCommands)) {
    const hasArg = input.startsWith(cmdName + ' ');
    if (hasArg) {
      const endIndex = cmdName.length + 1;
      const arg = input.substring(endIndex).trim();
      config.handler(arg, ctx);
      return;
    }
  }

  // 查找精确匹配的命令
  const handler = commands[input];
  if (handler) {
    handler(ctx);
  } else {
    // 命令不存在
    ctx.writeLines(DEFAULT);
  }
}