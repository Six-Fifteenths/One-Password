/**
 * 虚拟文件系统核心模块
 * 负责路径解析、目录导航、文件操作等底层逻辑
 */

import { fileSystem, fileContents } from "../dirStructure";

/**
 * 解析和规范化路径
 * @param inputPath - 用户输入的路径（支持绝对路径、相对路径、home路径）
 * @param currentPath - 当前路径数组
 * @returns 规范化后的路径数组，或 null 如果路径无效
 */
export const parsePath = (inputPath: string, currentPath: string[]): string[] | null => {
  const parts = inputPath.split('/').filter(p => p && p !== '.');
  let newPath: string[];

  if (inputPath.startsWith('/')) {
    newPath = parts;
  } else if (inputPath.startsWith('~')) {
    newPath = inputPath === '~' ? [] : parts.slice(1);
  } else {
    newPath = [...currentPath];
    for (const part of parts) {
      if (part === '..') {
        if (newPath.length > 0) newPath.pop();
      } else {
        newPath.push(part);
      }
    }
  }

  return newPath;
};

/**
 * 获取虚拟文件系统中指定路径的内容
 * @param path - 目录路径数组，由根目录开始
 * @returns 该路径下的内容对象，或 null 如果路径不存在
 */
export const getPathContent = (path: string[]) => {
  let current = fileSystem.root.children;
  
  for (const dir of path) {
    if (current[dir]?.children !== undefined) {
      current = current[dir].children;
    } else {
      return null;
    }
  }
  
  return current;
};

/** 路径解析结果 */
export type PathResolution = {
  targetPath: string[];
  fileName: string;
  exists: boolean;
  isDirectory: boolean;
};

/**
 * 完整路径解析：分离目录和文件名，验证目录和文件状态
 * @param inputPath - 输入路径
 * @param currentPath - 当前路径
 * @returns 解析结果，包含 targetPath、fileName、exists、isDirectory
 */
export const resolvePath = (inputPath: string, currentPath: string[]): PathResolution | null => {
  const lastSlashIndex = inputPath.lastIndexOf('/');
  let targetPath: string[];
  let fileName: string;

  if (lastSlashIndex === -1) {
    targetPath = [...currentPath];
    fileName = inputPath;
  } else {
    const pathPart = inputPath.substring(0, lastSlashIndex);
    fileName = inputPath.substring(lastSlashIndex + 1);
    const parsedPath = parsePath(pathPart, currentPath);
    if (parsedPath === null) return null;
    targetPath = parsedPath;
  }

  // 验证目录存在
  let content = fileSystem.root.children;
  for (const dir of targetPath) {
    if (content[dir]?.children !== undefined) {
      content = content[dir].children;
    } else {
      return null;
    }
  }

  // 检查文件/目录是否存在
  const exists = !!content[fileName];
  const isDirectory = exists && content[fileName].type === 'folder';

  return { targetPath, fileName, exists, isDirectory };
};

/**
 * 验证路径是否为有效目录
 */
export const isValidDirectory = (path: string[]): boolean => {
  let content = fileSystem.root.children;
  
  for (const dir of path) {
    if (content[dir]?.children !== undefined) {
      content = content[dir].children;
    } else {
      return false;
    }
  }
  
  return true;
};

/**
 * 删除文件或目录
 */
export const deleteFileOrFolder = (targetPath: string[], fileName: string): void => {
  let content = fileSystem.root.children;
  
  for (const dir of targetPath) {
    if (content[dir]?.children !== undefined) {
      content = content[dir].children;
    } else {
      return;
    }
  }

  if (content[fileName]) {
    // 如果是文件，也从 fileContents 中删除
    if (content[fileName].type === 'file') {
      const relativeParts = targetPath.concat(fileName);
      const key = relativeParts.join('/');
      delete fileContents[key];
    }
    delete content[fileName];
  }
};

/**
 * 创建新目录
 */
export const createDirectoryImpl = (targetPath: string[], newDirName: string): boolean => {
  let content = fileSystem.root.children;
  
  for (const dir of targetPath) {
    if (content[dir]?.children !== undefined) {
      content = content[dir].children;
    } else {
      return false;
    }
  }

  if (content[newDirName]) {
    return false; // 已存在
  }

  content[newDirName] = { type: 'folder', children: {} };
  return true;
};

/**
 * 创建新文件
 */
export const createFileImpl = (targetPath: string[], newFileName: string): boolean => {
  let content = fileSystem.root.children;
  
  for (const dir of targetPath) {
    if (content[dir]?.children !== undefined) {
      content = content[dir].children;
    } else {
      return false;
    }
  }

  if (content[newFileName]) {
    return false; // 文件已存在（不报错，返回 false）
  }

  content[newFileName] = { type: 'file' };
  const relativeParts = targetPath.concat(newFileName);
  const key = relativeParts.join('/');
  fileContents[key] = '';
  return true;
};

/**
 * 获取文件内容
 */
export const getFileContent = (targetPath: string[], fileName: string): string | null => {
  const relativeParts = targetPath.concat(fileName);
  const key = relativeParts.join('/');
  const content = fileContents[key];
  return content !== undefined ? content : null;
};

/**
 * 更新文件内容
 */
export const setFileContent = (targetPath: string[], fileName: string, content: string): void => {
  const relativeParts = targetPath.concat(fileName);
  const key = relativeParts.join('/');
  fileContents[key] = content;
};
