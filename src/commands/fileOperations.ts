/**
 * 文件系统相关命令的实现模块
 * 包含：cd、cat、ls、pwd、mkdir、touch、edit、rm -rf
 */

import { CommandContext } from "./registry";
import { parsePath, resolvePath, getPathContent, isValidDirectory, deleteFileOrFolder, createDirectoryImpl, createFileImpl, getFileContent, setFileContent } from "./filesystem";

/**
 * 改变目录命令：在虚拟文件系统中导航目录
 * 支持绝对路径、相对路径、home 路径、.. 返回上级、多级路径
 */
export const changeDirectory = (pathInput: string, ctx: CommandContext) => {
  if (ctx.getBareMode()) {
    return;
  }

  if (!pathInput || pathInput.trim().length === 0) {
    ctx.writeLines(["cd: missing operand", "<br>"]);
    return;
  }

  if (pathInput === '~' || pathInput === '-') {
    ctx.setCurrentPath([]);
    ctx.writeLines(["", "<br>"]);
    return;
  }

  const newPath = parsePath(pathInput.trim(), ctx.currentPath);
  
  if (newPath === null || !isValidDirectory(newPath)) {
    ctx.writeLines(["cd: no such directory", "<br>"]);
    return;
  }

  ctx.setCurrentPath(newPath);
};

/**
 * 读取文件内容命令
 */
export const readFile = (filePath: string, ctx: CommandContext) => {
  if (ctx.getBareMode()) {
    return;
  }

  if (!filePath || filePath.trim().length === 0) {
    ctx.writeLines(["cat: missing operand", "<br>"]);
    return;
  }

  filePath = filePath.trim();
  const resolution = resolvePath(filePath, ctx.currentPath);

  if (!resolution || !resolution.exists || resolution.isDirectory) {
    ctx.writeLines(["cat: no such file", "<br>"]);
    return;
  }

  const txt = getFileContent(resolution.targetPath, resolution.fileName);

  if (txt !== null) {
    const lines = txt.split(/\r?\n/);
    ctx.writeLines([...lines, "<br>"]);
  }
};

/**
 * 列出目录内容
 */
export const listDirectory = (ctx: CommandContext) => {
  const content = getPathContent(ctx.currentPath);
  if (!content) {
    ctx.writeLines(["ls: cannot access directory: No such file or directory", "<br>"]);
    return;
  }

  const SPACE = "&nbsp;";
  const items: string[] = ["<br>"];
  
  Object.entries(content)
    .filter(([name]) => !name.startsWith('__'))
    .forEach(([name, item]: [string, any]) => {
      const type = item.type === 'folder' ? '[FOLDER]' : '[FILE]';
      const padding = SPACE.repeat(Math.max(1, 20 - name.length));
      const line = `${name}${padding}${type}`;
      items.push(line);
    });

  items.push("<br>");
  ctx.writeLines(items);
};

/**
 * 创建目录
 */
export const createDirectory = (dirName: string, ctx: CommandContext) => {
  if (ctx.getBareMode()) {
    return;
  }

  if (!dirName) {
    ctx.writeLines(["mkdir: missing operand", "<br>"]);
    return;
  }

  const resolution = resolvePath(dirName, ctx.currentPath);

  if (!resolution) {
    ctx.writeLines([`mkdir: cannot create directory '${dirName}': No such file or directory`, "<br>"]);
    return;
  }

  if (resolution.exists) {
    ctx.writeLines([`mkdir: cannot create directory '${resolution.fileName}': File exists`, "<br>"]);
    return;
  }

  createDirectoryImpl(resolution.targetPath, resolution.fileName);
  ctx.writeLines(["", "<br>"]);
};

/**
 * 创建文件
 */
export const createFile = (filePath: string, ctx: CommandContext) => {
  if (ctx.getBareMode()) {
    return;
  }

  if (!filePath) {
    ctx.writeLines(["touch: missing operand", "<br>"]);
    return;
  }

  const resolution = resolvePath(filePath, ctx.currentPath);

  if (!resolution) {
    ctx.writeLines([`touch: cannot create file '${filePath}': No such file or directory`, "<br>"]);
    return;
  }

  createFileImpl(resolution.targetPath, resolution.fileName);
  ctx.writeLines(["", "<br>"]);
};

/**
 * 编辑文件
 */
export const editFile = (filePath: string, ctx: CommandContext) => {
  if (ctx.getBareMode()) {
    return;
  }

  if (!filePath) {
    ctx.writeLines(["edit: missing operand", "<br>"]);
    return;
  }

  const resolution = resolvePath(filePath, ctx.currentPath);

  if (!resolution || !resolution.exists || resolution.isDirectory) {
    ctx.writeLines(["no such file", "<br>"]);
    return;
  }

  const currentContent = getFileContent(resolution.targetPath, resolution.fileName) || '';
  const newContent = prompt(`Edit file '${filePath}':\n\n[Current content]\n${currentContent}\n\n[Enter new content below (leave empty to keep original)]`, currentContent);
  
  if (newContent !== null) {
    setFileContent(resolution.targetPath, resolution.fileName, newContent);
    ctx.writeLines(["", "<br>"]);
  }
};

/**
 * 删除文件或目录（rm -rf 命令）
 * 包含特殊的 Easter egg：在根目录执行 rm -rf * 时激活 bareMode
 */
export const handleRmRf = (pathToDelete: string, ctx: CommandContext) => {
  if (!pathToDelete) {
    ctx.writeLines(["rm: missing operand", "<br>"]);
    return;
  }

  // 特殊彩蛋：在根目录执行 rm -rf * 时激活 bareMode
  if (pathToDelete === "*" && ctx.currentPath.length === 0 && !ctx.getBareMode()) {
    ctx.setBareMode(true);
    ctx.clearTerminal();
    
    if (ctx.USERINPUT) {
      ctx.USERINPUT.classList.add('bareMode');
    }
    
    ctx.easterEggStyles();
    setTimeout(() => {
      ctx.writeLines(["<br>", "The game has ended.", "<br>"]);
    }, 200);
    setTimeout(() => {
      ctx.disableInput();
    }, 800);
    return;
  }

  // bareMode 下禁止任何删除操作
  if (ctx.getBareMode()) {
    return;
  }

  // 处理通配符 *：删除当前目录下的所有文件和文件夹
  if (pathToDelete === "*") {
    const content = getPathContent(ctx.currentPath);
    if (!content) {
      ctx.writeLines(["rm: cannot access directory: No such file or directory", "<br>"]);
      return;
    }

    const itemNames = Object.keys(content).filter(name => !name.startsWith('__'));
    
    if (itemNames.length === 0) {
      ctx.writeLines(["rm: no files or directories to remove", "<br>"]);
      return;
    }

    itemNames.forEach(name => {
      deleteFileOrFolder(ctx.currentPath, name);
    });

    ctx.writeLines([`Deleted ${itemNames.length} item(s)`, "<br>"]);
    return;
  }

  const resolution = resolvePath(pathToDelete, ctx.currentPath);

  if (!resolution) {
    ctx.writeLines([`rm: cannot remove '${pathToDelete}': No such file or directory`, "<br>"]);
    return;
  }

  if (!resolution.exists) {
    ctx.writeLines([`rm: cannot remove '${pathToDelete}': No such file or directory`, "<br>"]);
    return;
  }

  const fileName = resolution.fileName;
  deleteFileOrFolder(resolution.targetPath, fileName);

  if (resolution.isDirectory) {
    ctx.writeLines([`Deleted folder: ${fileName}`, "<br>"]);
  } else {
    ctx.writeLines([`Deleted file: ${fileName}`, "<br>"]);
  }
};
