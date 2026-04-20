/**
 * 动态生成虚拟文件系统结构
 * 使用 import.meta.glob 在构建时读取 src/root 文件夹的实际结构
 */

// 使用 import.meta.glob 读取 src/root 下的所有文件，并以原始文本形式导入（as: 'raw'）
const modules = import.meta.glob('/src/root/**/*', { eager: true, as: 'raw' }) as Record<string, string>;

/**
 * 从 import.meta.glob 的结果构建嵌套的文件系统对象
 * @returns 文件系统结构对象
 */
export function buildFileSystem() {
  const filesystem: any = {
    root: {
      type: 'folder',
      description: 'Home directory',
      children: {}
    }
  };
  // 存储文件的原始文本内容，键为相对于 src/root 的路径，如 "a/readme.md"
  const fileContents: Record<string, string> = {};

  // 获取所有路径并按层级组织，同时收集文件内容
  Object.keys(modules).forEach((path) => {
    // 提取相对于 /src/root 的路径
    const relativePath = path.replace('/src/root/', '').split('/').filter(p => p);
    
    if (relativePath.length === 0) return;

    // 导航到正确的位置并创建文件夹结构
    let current = filesystem.root.children;
    
    for (let i = 0; i < relativePath.length; i++) {
      const segment = relativePath[i];
      const isLast = i === relativePath.length - 1;
      
      if (!current[segment]) {
        const isFile = isLast && !path.endsWith('/');
        current[segment] = {
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : {}
        };

        // 如果是文件，保存其原始内容到 fileContents
        if (isFile) {
          const key = relativePath.join('/');
          // modules[path] 已经是原始文本（as: 'raw'）
          fileContents[key] = (modules as any)[path] as string;
        }
      }
      
      if (!isLast) {
        current = current[segment].children || (current[segment].children = {});
      }
    }
  });

  // 将文件内容附加到 filesystem 对象，方便外部访问
  (filesystem as any).__fileContents = fileContents;

  return filesystem;
}

// 导出构建好的文件系统
export const fileSystem = buildFileSystem();
// 另一种导出方式：单独导出 fileContents 以便调用方直接读取文件文本
export const fileContents: Record<string, string> = (fileSystem as any).__fileContents || {};
