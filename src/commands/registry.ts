import { BANNER } from "./banner";
import { DEFAULT } from "./default";
import { changeDirectory, readFile, listDirectory, createDirectory, createFile, editFile, handleRmRf } from "./fileOperations";
import { provideHint } from "./hint";

/** 命令执行上下文：包含所有命令需要访问的 DOM 元素和状态管理函数 */
export type CommandContext = {
  writeLines: (msg: string[]) => void;
  clearTerminal: () => void;
  triggerBareMode: (message: string[]) => void;
  easterEggStyles: () => void;
  disableInput: () => void;
  USERINPUT: HTMLInputElement | null;
  currentPath: string[];
  setCurrentPath: (path: string[]) => void;
  getHistory: () => string[];
};

/** 命令处理函数类型 */
type CommandHandler = (ctx: CommandContext) => void;

/** 命令处理器映射表 */
const commands: Record<string, CommandHandler> = {
  clear: (ctx) => ctx.clearTerminal(),
  banner: (ctx) => ctx.writeLines(BANNER),
  'rm -rf': (ctx) => ctx.writeLines(["rm: missing operand", "<br>"]),
  ls: (ctx) => listDirectory(ctx),
  mkdir: (ctx) => ctx.writeLines(["mkdir: missing operand", "<br>"]),
  touch: (ctx) => ctx.writeLines(["touch: missing operand", "<br>"]),
  edit: (ctx) => ctx.writeLines(["edit: missing operand", "<br>"]),
  cat: (ctx) => ctx.writeLines(["cat: missing operand", "<br>"]),
  cd: (ctx) => ctx.writeLines(["cd: missing operand", "<br>"]),
  pwd: (ctx) => {
    const path = ctx.currentPath.length === 0 ? '/' : '/' + ctx.currentPath.join('/');
    ctx.writeLines([path, "<br>"]);
  },
  copy: (ctx) => {
    const history = ctx.getHistory().filter((line) => line.trim() !== 'copy');
    const text = history.join('\n');

    if (text.length === 0) {
      ctx.writeLines(["copy: no command history available", "<br>"]);
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => ctx.writeLines(["copy: command history copied to clipboard", "<br>"]))
        .catch(() => ctx.writeLines(["copy: unable to write to clipboard", "<br>"]));
    } else {
      ctx.writeLines(["copy: clipboard API not available", "<br>"]);
    }
  },
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
  'hint': { needsArg: true, handler: provideHint },
};

export function handleCommand(input: string, ctx: CommandContext) {
  // 检查是否是带参数的命令
  for (const [cmdName, config] of Object.entries(argsCommands)) {
    if (input === cmdName) {
      config.handler("", ctx);
      return;
    }

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