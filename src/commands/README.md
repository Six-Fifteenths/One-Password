# commands 模块说明

本目录下的代码负责构建一个虚拟文件系统，并为用户命令提供实现。它把系统分成两类：

- 普通文件系统逻辑：路径解析、目录浏览、文件读写、创建删除等。对应文件：`filesystem.ts` 和 `fileOperations.ts`。
- 特殊规则引擎：用于在特定文件事件发生时触发额外效果。对应文件：`specialFiles.ts` 和 `specialRules.ts`。

这个 README 旨在让不熟悉技术的人也能理解：这些文件分别做什么、它们如何协作、以及如果你想扩展功能应当在哪里做修改。

---

## 一、整体运行架构

### 1. 虚拟文件系统是什么？

这个项目没有直接操作电脑里的真实文件，而是用内存中的“虚拟文件系统”模拟文件和目录结构。它包含两部分数据：

- `fileSystem`：表示目录树结构、文件夹和文件的层级关系。
- `fileContents`：保存每个文件的文字内容。

因此，当用户输入命令时，应用程序依次读取这些内存结构来模拟真实文件系统行为。

### 2. 两类功能如何协作？

- `filesystem.ts` 提供基本的路径解析和文件系统访问函数。
- `fileOperations.ts` 负责把这些底层函数组合成用户可以输入的命令，比如 `cd`、`ls`、`cat`、`mkdir`、`touch`、`rm -rf`。
- `specialFiles.ts` 定义一个条件/动作引擎，在文件被读取、创建、删除、写入时触发特殊规则。
- `specialRules.ts` 保存具体的规则配置数据。

当用户执行命令时，如果命令修改或读取文件，`fileOperations.ts` 会调用 `specialFiles.ts` 中的钩子，后者再检查 `specialRules.ts` 是否有匹配的规则需要执行。

---

## 二、`filesystem.ts` 详细说明

`filesystem.ts` 是文件系统的“底层引擎”。它的核心职责是：

- 解析用户输入的路径
- 验证目录和文件是否存在
- 访问目录内容
- 读取和写入文件内容
- 创建和删除文件/目录

### 1. 关键函数

#### `parsePath(inputPath: string, currentPath: string[]): string[] | null`

作用：把用户输入的路径转换成一个标准的路径数组。

参数：
- `inputPath`：用户实际输入的路径文本，例如 `foo/bar`、`/root/folder`、`~/docs`、`..`。
- `currentPath`：当前所在目录的路径数组，表示当前工作目录。

返回值：
- 如果路径合法，返回一个数组，如 `['test','example1']`。
- 如果路径无效，返回 `null`。

支持范围：
- 绝对路径：以 `/` 开头，例如 `/test/example1`
- home 路径：以 `~` 开头，例如 `~/example1`
- 相对路径：普通文本，例如 `example1/gratitude`
- 上级目录：`..`
- 当前目录：`.` 会被忽略

#### `getPathContent(path: string[])`

作用：获取一个目录的可见内容。

参数：
- `path`：目标目录的路径数组。

返回值：
- 如果目录存在且可访问，返回目录中可见项目的列表对象。
- 否则返回 `null`。

行为说明：
- 会检查目录路径本身是否可访问。
- 会过滤掉以 `__` 开头的隐藏项。
- 还会检查目录下每个项目是否可以被列出（是否 `listable`）。

#### `resolvePath(inputPath: string, currentPath: string[])`

作用：把用户输入的路径细化成“目标目录”+“文件名”，并检查它是否存在。

返回值是一个对象：
- `targetPath`：文件所在目录的路径数组。
- `fileName`：目标文件或文件夹名。
- `exists`：目标项是否存在。
- `isDirectory`：目标项是否为文件夹。

如果路径无效，返回 `null`。

#### `isValidDirectory(path: string[])`

作用：验证给定路径是否是一个有效且可访问的目录。

如果目录不存在、路径包含不可访问段，或者不是目录，则返回 `false`。

#### `deleteFileOrFolder(targetPath: string[], fileName: string)`

作用：删除指定目录中的文件或文件夹。

关键点：
- 如果删除的是文件，它也会从 `fileContents` 中移除该文件内容。
- 删除后会触发 `runDeleteRule`，让特殊规则引擎有机会响应这次删除事件。

#### `createDirectoryImpl(targetPath: string[], newDirName: string)`

作用：在指定目录中创建一个新文件夹。

如果目录已存在则返回 `false`。

创建成功后，它会触发 `runCreateRule`。

#### `createFileImpl(targetPath: string[], newFileName: string)`

作用：在指定目录中创建一个新文件，并在 `fileContents` 中保存一条空内容。

如果文件已存在则返回 `false`。

创建成功后，它会触发 `runCreateRule`。

#### `getFileContent(targetPath: string[], fileName: string)`

作用：读取指定文件的文本内容。

返回 `null` 表示文件不存在。

#### `setFileContent(targetPath: string[], fileName: string, content: string)`

作用：把文本写入指定文件。

写入成功后会触发 `runWriteRule`。

---

## 三、`fileOperations.ts` 详细说明

这个文件把底层函数组合成“用户命令”。它对应的是命令行中可以直接使用的行为。

### 1. 当前实现的命令

#### `changeDirectory(pathInput: string, ctx: CommandContext)`

对应命令：`cd`

作用：切换当前工作目录。

参数：
- `pathInput`：用户输入的目标路径。
- `ctx`：命令上下文，包含当前目录和输出写入函数。

行为说明：
- 如果输入为空，返回错误信息。
- `~` 或 `-` 会回到根目录。
- 先解析路径，再判断是否为有效目录。
- 合法时更新当前目录，否则显示“不存在目录”。

#### `readFile(filePath: string, ctx: CommandContext)`

对应命令：`cat`

作用：读取文件并输出文本。

参数：
- `filePath`：目标文件路径。
- `ctx`：命令上下文。

行为说明：
- 解析路径并确保目标存在且是文件。
- 先调用 `runReadRule` 检查是否有特殊规则覆盖内容。
- 如果特殊规则返回覆盖文本，则显示覆盖文本；否则显示实际文件内容。

#### `listDirectory(ctx: CommandContext)`

对应命令：`ls`

作用：列出当前目录内容。

行为说明：
- 从当前目录读取目录内容。
- 如果目录不存在，显示错误。
- 列表中排除隐藏项 `__*`。
- 同时检查每个子项是否允许列出。

#### `createDirectory(dirName: string, ctx: CommandContext)`

对应命令：`mkdir`

作用：创建目录。

参数：
- `dirName`：要创建的目录路径。

行为说明：
- 解析路径并确认父目录存在。
- 如果目标已存在，返回“已存在”错误。
- 成功后使用 `createDirectoryImpl` 创建目录并触发特殊规则。

#### `createFile(filePath: string, ctx: CommandContext)`

对应命令：`touch`

作用：创建新文件。

参数：
- `filePath`：要创建的文件路径。

行为说明：
- 解析路径确认文件父目录有效。
- 调用 `createFileImpl` 创建文件，若成功触发规则。

#### `editFile(filePath: string, ctx: CommandContext)`

对应命令：`edit`

作用：编辑已存在文件内容。

行为说明：
- 解析路径并检查目标存在且是文件。
- 读取当前内容，弹出提示框让用户输入新内容。
- 将输入保存到文件并触发写入规则。

#### `handleRmRf(pathToDelete: string, ctx: CommandContext)`

对应命令：`rm -rf`

作用：删除一个文件或目录，或者删除当前目录下所有文件。

行为说明：
- 如果目标是 `*` 且当前目录为根目录，会触发特殊的 bare mode 结局。
- 如果目标是 `*`，会删除当前目录下所有可见项目。
- 否则解析路径并删除目标文件或目录。
- 删除后会触发 `runDeleteRule`。

#### `copy` 

对应命令：`copy`

作用：将当前会话中用户输入过的所有命令复制到系统剪贴板。

行为说明：
- 不需要参数。
- 读取命令历史记录数组。
- 如果没有历史数据，会显示 `copy: no command history available`。
- 如果剪贴板可用，会将历史文本写入剪贴板并显示成功提示。
- 如果浏览器不支持剪贴板 API，则显示 `copy: clipboard API not available`。

---

## 四、特殊规则引擎概述

特殊规则引擎用于处理“某个文件发生特定事件时，要做额外的事情”。它让文件系统变得可编程，支持隐藏文件、解谜线索、内容覆盖、动态文件夹生成等行为。

### 1. 两个文件各自作用

#### `specialFiles.ts`

这是引擎本身，它定义了：
- 规则数据需要的类型
- 规则的触发时机
- 条件评估逻辑
- 动作执行逻辑
- 触发规则的接口函数

它不保存具体规则，而是给规则提供运行环境。

#### `specialRules.ts`

这是具体规则的存放地。你可以把它看作“规则数据库”。

里面定义了一个 `SPECIAL_RULES` 数组，每一条规则包含：
- `trigger`：触发时机，例如 `read`、`create`、`delete`、`write`
- `path`：哪个文件或目录发生事件时触发
- `conditions`：触发前的检查条件
- `actions`：满足条件后执行的动作

---

## 五、`specialFiles.ts` 的运行原理

### 1. 规则触发入口

引擎提供四个入口：

- `runReadRule(path: string[])`
- `runCreateRule(path: string[])`
- `runDeleteRule(path: string[])`
- `runWriteRule(path: string[], newContent: string)`

这些函数通常在以下时刻被调用：

- 文件读取前：`runReadRule`
- 文件或文件夹创建后：`runCreateRule`
- 文件或文件夹删除后：`runDeleteRule`
- 文件写入后：`runWriteRule`

在你的代码中，`fileOperations.ts` 的读取命令和 `filesystem.ts` 的创建/删除/写入函数会调用这些函数。

### 2. 规则匹配逻辑

当某个事件发生时，引擎会：

1. 根据触发类型筛选出对应规则（例如只检查 `write` 规则）。
2. 比较规则中的 `path` 和事件路径。
   - `read` 规则要求精确匹配读到的文件路径。
   - `create`、`delete`、`write` 规则会匹配当前事件路径以及其子路径，这样文件夹内的变更也可以触发父路径规则。
3. 如果规则路径匹配，再检查规则的 `conditions` 是否成立。
4. 条件通过后执行规则中的 `actions`。

### 3. 规则条件类型

规则可以在执行前检查各种状态：

- `fileExists`：某个文件是否存在。
- `folderExists`：某个文件夹是否存在。
- `fileContentEquals`：某个文件内容是否等于给定文本。
- `flagTrue` / `flagFalse`：检查引擎内部保存的布尔标志。
- `not`：取反条件。
- `any`：多个条件中只要一个成立。
- `all`：多个条件全部成立。
- `fileGroup`：一组条件全部成立（和 `all` 类似，但更适合表达“多个文件一起满足”）。

这些条件组合起来，就可以描述复杂的触发规则。

### 4. 规则动作类型

规则通过下面几种动作改变系统行为：

- `setVisibility`：控制某个路径是否可见。
- `setAccessibility`：控制某个路径是否可访问。
- `setListability`：控制某个目录的内容是否可列出。
- `setFlag`：设置一个内部布尔标志，用于后续规则判断。
- `overrideContent`：让 `cat` 读取文件时返回替代文本。
- `replaceTree`：用新的虚拟目录树替换某个目录及其所有内容。

### 5. 特殊效果如何生效

#### 可见性、可访问性、可列出性
这些效果保存在 `specialState.effects` 中，规则执行后会记录到指定路径。

- `visible`：控制目录项是否直接显示在列表中。
- `accessible`：控制路径是否可以访问。不允许访问时，无法进入目录或打开文件。
- `listable`：控制目录是否可列出，但不一定会完全隐藏该项。

`filesystem.ts` 中的 `getPathContent`、`resolvePath`、`isValidDirectory` 等函数会调用检查逻辑，确保这些规则影响实际命令行为。

#### 覆盖读取内容
当你读取一个文件时：
- 先执行 `runReadRule`
- 如果规则产生了 `overrideContent`，就返回这个文本
- 否则返回真实文件内容

这意味着某些文件的内容可以在特定条件下被“替换”为谜题提示、答案或隐藏文本。

#### 文件树替换
`replaceTree` 允许规则在运行时构建新目录结构。这是实现动态关卡或谜题变化的关键。

规则执行时会：
- 删除目标路径下原有的目录/文件
- 用规则定义的新树创建新的文件夹和文件


---

## 六、命令和参数总结

下面按命令列出输入、含义和结果。

### `cd <path>`

- 输入：`path` 可以是绝对路径、相对路径、`~`、`..`。
- 含义：切换当前工作目录。
- 失败条件：目录不存在、路径无效、路径不可访问。

### `cat <file>`

- 输入：目标文件路径。
- 含义：读取文件内容并显示。
- 特别说明：如果存在匹配 `read` 规则，内容可能被规则覆盖。

### `ls`

- 输入：无参数。
- 含义：列出当前目录可见文件和文件夹。
- 说明：隐式过滤掉隐藏项，且目录项必须同时满足 `listable`。

### `mkdir <path>`

- 输入：目标目录路径。
- 含义：在指定位置创建新目录。
- 失败条件：目标父目录不存在、目标已存在。
- 触发：`create` 规则。

### `touch <file>`

- 输入：目标文件路径。
- 含义：创建新文件并初始化为空内容。
- 失败条件：父目录不存在、目标已存在。
- 触发：`create` 规则。

### `edit <file>`

- 输入：目标已存在文件路径。
- 含义：修改文件内容。
- 失败条件：目标不存在或是目录。
- 触发：`write` 规则。

### `rm -rf <target>`

- 输入：目标路径或 `*`。
- 含义：删除文件/目录；`*` 删除当前目录下所有可见项目。
- 失败条件：目标不存在。
- 触发：`delete` 规则。
- 特殊彩蛋：根目录下执行 `rm -rf *` 会触发 bare mode 结局。

---

## 七、如何编辑和维护特殊规则

如果你想添加新的特殊规则，请修改 `src/commands/specialRules.ts`：

1. 每条规则是一个对象，放在 `SPECIAL_RULES` 数组里。
2. 规则必须包含：
   - `trigger`：`read`、`create`、`delete` 或 `write`
   - `path`：触发时检查的目标路径
   - `actions`：要执行的动作列表
3. `conditions` 是可选项，用于控制规则是否生效。

### 例子：

```ts
{
  trigger: "read",
  path: "test/example2/another",
  conditions: [
    { type: "fileContentEquals", path: "test/example2/maybeafile/qwerty", content: "123456" },
  ],
  actions: [
    { type: "overrideContent", path: "test/example2/another", content: "zxcvbn" },
  ],
}
```

这条规则的意思是：
- 当有人读取 `test/example2/another` 时
- 如果 `test/example2/maybeafile/qwerty` 的内容是 `123456`
- 那么返回 `zxcvbn` 作为读取结果，而不是文件真实内容。

---

## 八、如何理解“路径”

系统中所有路径都统一表示为一个“数组”，例如：

- `test/example1/gratitude/great` -> `['test', 'example1', 'gratitude', 'great']`
- 根目录 -> `[]`

规则和命令都基于这种标准路径进行比较。

---

## 九、非技术人员的快速理解

如果你不懂代码，可以把这个系统想象成一个可以被编程的“文件迷宫”：

- `filesystem.ts` 是迷宫地图和门锁逻辑。
- `fileOperations.ts` 是你在迷宫里可以走的动作，例如 `cd`、`ls`、`cat`。
- `specialFiles.ts` 是迷宫里的机关控制器，当你触发某个机关时，它会改变迷宫状态。
- `specialRules.ts` 是机关的说明书，里面写着“哪次动作会触发哪个机关，以及机关触发后会发生什么”。

你只要记住：
- 普通命令是基础行为。
- 特殊规则是“如果满足条件，就做额外动作”。
- 规则写在 `specialRules.ts`，引擎会自动执行。

---

## 十、推荐的维护方式

- 改命令行为：编辑 `filesystem.ts` 或 `fileOperations.ts`。
- 改规则内容：编辑 `specialRules.ts`。
- 改规则执行方式：编辑 `specialFiles.ts`。

如果你希望扩展新的命令，比如 `mv`、`cp`，先在 `filesystem.ts` 添加底层路径处理，再在 `fileOperations.ts` 添加命令入口。

如果你希望新增规则类型，例如新的条件或动作，则需要更新 `specialFiles.ts` 的 `RuleCondition`、`RuleAction` 类型定义，以及对应的评估/执行代码。

---

## 十一、文件列表一览

- `filesystem.ts`：虚拟文件系统底层。
- `fileOperations.ts`：用户命令实现。
- `specialFiles.ts`：特殊规则引擎，实现条件检查和动作执行。
- `specialRules.ts`：具体规则数据。

希望这个 README 能帮助你清楚理解当前代码结构，并方便你继续维护和扩展。