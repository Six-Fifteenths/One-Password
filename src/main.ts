import command from '../config.json' with { type: 'json' };
import { handleCommand, CommandContext } from "./commands/registry";

/** DOM 元素引用和应用状态管理 */

// mutWriteLines 用于动态插入输出内容，会在 clear 命令时被替换
let mutWriteLines = document.getElementById("write-lines");
let historyIdx = 0; // 命令历史导航索引
let userInput : string; // 当前用户输入
let currentPath : string[] = []; // 虚拟文件系统中的当前路径（相对于 home），如 ['root', 'a']
let isOutputting = false; // 输出锁：true 时表示程序正在输出内容，禁止用户输入
let commandQueue : string[] = []; // 多行命令队列
let isProcessingQueue = false; // 是否正在处理命令队列

// WRITELINESCOPY 在 clear 命令时用于重置终端内容
const WRITELINESCOPY = mutWriteLines;
const TERMINAL = document.getElementById("terminal");
const USERINPUT = document.getElementById("user-input") as HTMLInputElement;
const PRE_HOST = document.getElementById("pre-host");
const PRE_USER = document.getElementById("pre-user");
const HOST = document.getElementById("host");
const USER = document.getElementById("user");
const PROMPT = document.getElementById("prompt");
const HISTORY : string[] = [];


/** 滚动终端到最底部，显示最新的输出内容 */
const scrollToBottom = () => {
  const MAIN = document.getElementById("main");
  if(!MAIN) return

  MAIN.scrollTop = MAIN.scrollHeight;
}

/** 清空终端内容 */
function clearTerminal() {
  setTimeout(() => {
    if (!TERMINAL || !WRITELINESCOPY) return;
    TERMINAL.innerHTML = "";
    TERMINAL.appendChild(WRITELINESCOPY);
    mutWriteLines = WRITELINESCOPY;
  });
}

/** 处理用户在输入框中的所有按键事件 */
function userInputHandler(e : KeyboardEvent) {
  const key = e.key;

  switch(key) {
    case "Enter":
      enterKey();
      e.preventDefault();
      break;
    case "Escape":
      // escape key logic (if any)
      break;
    case "ArrowUp":
      arrowKeys("ArrowUp");
      e.preventDefault();
      break;
    case "ArrowDown":
      arrowKeys("ArrowDown");
      e.preventDefault();
      break;
    case "Tab":
      tabKey();
      e.preventDefault();
      break;
  }
}

/** 处理 Enter 键：执行命令并更新终端 */
function enterKey() {
  // 检查输出锁：如果正在输出，禁止处理新的输入
  if (isOutputting) {
    return;
  }

  if (!mutWriteLines || !PROMPT) return
  const resetInput = "";
  userInput = USERINPUT.value;

  // 检测多行命令
  const lines = userInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length > 1) {
    // 多行命令：加入队列
    commandQueue = lines;
    isProcessingQueue = true;
    HISTORY.push(userInput);
    historyIdx = HISTORY.length;
    
    // 显示所有命令行
    lines.forEach(line => {
    const newUserInput = `<span class='output'>${line}</span>`;
      const div = document.createElement("div");
      div.innerHTML = `<span id="prompt">${PROMPT.innerHTML}</span> ${newUserInput}`;
      if (mutWriteLines && mutWriteLines.parentNode) {
        mutWriteLines.parentNode.insertBefore(div, mutWriteLines);
      }
    });
    
    USERINPUT.value = resetInput;
    userInput = resetInput;
    scrollToBottom();
    
    // 开始执行队列中的命令
    processCommandQueue();
  } else {
    // 单行命令：原来的逻辑
    const newUserInput = `<span class='output'>${userInput}</span>`;

    HISTORY.push(userInput);
    historyIdx = HISTORY.length

    //if clear then early return
    if (userInput === 'clear') {
      commandHandler(userInput.toLowerCase().trim());
      USERINPUT.value = resetInput;
      userInput = resetInput;
      return
    }

    const div = document.createElement("div");
    div.innerHTML = `<span id="prompt">${PROMPT.innerHTML}</span> ${newUserInput}`;

    if (mutWriteLines.parentNode) {
      mutWriteLines.parentNode.insertBefore(div, mutWriteLines);
    }

    if (userInput.trim().length !== 0) {
      commandHandler(userInput.toLowerCase().trim());
    }
    
    USERINPUT.value = resetInput;
    userInput = resetInput;
    scrollToBottom();
  }
}

/** Tab 键自动补全：根据已输入内容匹配命令 */
function tabKey() {
  // Tab 补全已禁用
}

/** 处理命令队列：逐个执行多行命令 */
function processCommandQueue() {
  if (!isProcessingQueue || commandQueue.length === 0) {
    isProcessingQueue = false;
    commandQueue = [];
    return;
  }

  // 如果前一个命令还在输出，等待
  if (isOutputting) {
    setTimeout(() => processCommandQueue(), 100);
    return;
  }

  // 执行队列中的第一个命令
  const cmd = commandQueue.shift();
  if (cmd) {
    commandHandler(cmd.toLowerCase().trim());
    
    // 继续处理队列
    setTimeout(() => processCommandQueue(), 100);
  } else {
    isProcessingQueue = false;
  }
}

/** 处理上下箭头键：在命令历史中导航 */
function arrowKeys(e : string) {
  switch(e){
    case "ArrowDown":
      if (historyIdx < HISTORY.length) {
        historyIdx++;
        USERINPUT.value = HISTORY[historyIdx] || "";
      }
      break;
    case "ArrowUp":
      if (historyIdx > 0) {
        historyIdx--;
        USERINPUT.value = HISTORY[historyIdx];
      }
      break;
  }
}

/** 解析命令并创建执行上下文，将其传递给命令注册表 */
function commandHandler(input : string) {
  const ctx: CommandContext = {
    writeLines,
    clearTerminal: () => {
      setTimeout(() => {
        if(!TERMINAL || !WRITELINESCOPY) return;
        TERMINAL.innerHTML = "";
        TERMINAL.appendChild(WRITELINESCOPY);
        mutWriteLines = WRITELINESCOPY;
      });
    },
    triggerBareMode,
    easterEggStyles,
    disableInput,
    USERINPUT,
    currentPath,
    setCurrentPath: (path: string[]) => { currentPath = path; },
    getHistory: () => HISTORY,
  };

  handleCommand(input, ctx);
}

/** 将消息数组逐行输出到终端，每行有延迟效果 */
function writeLines(message : string[]) {
  // 设置输出锁
  isOutputting = true;
  
  // 禁用输入框
  if (USERINPUT) USERINPUT.disabled = true;
  
  message.forEach((item, idx) => {
    displayText(item, idx);
  });
  
  // 计算最后一个 setTimeout 的总延迟时间，在那之后释放输出锁
  if (message.length > 0) {
    const lastDelay = 40 * (message.length - 1) + 50; // 多加 50ms 的余量确保所有操作完成
    setTimeout(() => {
      isOutputting = false;
      
      // 重新启用输入框并将焦点返回给用户
      if (USERINPUT) {
        USERINPUT.disabled = false;
        USERINPUT.focus();
      }
    }, lastDelay);
  } else {
    isOutputting = false;
    if (USERINPUT) {
      USERINPUT.disabled = false;
      USERINPUT.focus();
    }
  }
}

/** 单个文本输出：创建 p 元素并插入 DOM，添加延迟动画 */
function displayText(item : string, idx : number) {
  setTimeout(() => {
    if(!mutWriteLines) return;
    const p = document.createElement("p");
    p.innerHTML = item;
    mutWriteLines.parentNode!.insertBefore(p, mutWriteLines);
    scrollToBottom();
  }, 40 * idx);
}

/** 应用 baremode 样式：将界面变成黑色 VT323 终端风格 */
function easterEggStyles() {
  const bars = document.getElementById("bars");
  const body = document.body;
  const main = document.getElementById("main");
  const span = document.getElementsByTagName("span");

  if (!bars) return
  bars.innerHTML = "";
  bars.remove()

  if (main) main.style.border = "none";

  body.style.backgroundColor = "black";
  body.style.fontFamily = "VT323, monospace";
  body.style.fontSize = "20px";
  body.style.color = "white";

  for (let i = 0; i < span.length; i++) {
    span[i].style.color = "white";
  }

  USERINPUT.style.backgroundColor = "black";
  USERINPUT.style.color = "white";
  USERINPUT.style.fontFamily = "VT323, monospace";
  USERINPUT.style.fontSize = "20px";
  if (PROMPT) PROMPT.style.color = "white";
}

/** 禁用用户输入 */
function disableInput() {
  if (USERINPUT) {
    USERINPUT.disabled = true;
    USERINPUT.style.pointerEvents = "none";
  }
}

/** 触发 baremode 结局：显示结局文字并禁止输入 */
function triggerBareMode(message: string[]) {
  clearTerminal();
  if (USERINPUT) {
    USERINPUT.classList.add('bareMode');
  }
  easterEggStyles();
  setTimeout(() => {
    writeLines(message);
  }, 200);
  setTimeout(() => {
    disableInput();
  }, 800);
}

/** 初始化所有事件监听器和页面加载时的横幅显示 */
const initEventListeners = () => {
  if(HOST) {
    HOST.innerText= command.hostname;
  }

  if(USER) {
    USER.innerText = command.username;
  }

  if(PRE_HOST) {
    PRE_HOST.innerText= command.hostname;
  }

  if(PRE_USER) {
    PRE_USER.innerText = command.username;
  }

  // 页面加载完成时显示横幅并聚焦输入框
  window.addEventListener('load', () => {
    const ctx: CommandContext = {
      writeLines,
      clearTerminal: () => {
        setTimeout(() => {
          if(!TERMINAL || !WRITELINESCOPY) return;
          TERMINAL.innerHTML = "";
          TERMINAL.appendChild(WRITELINESCOPY);
          mutWriteLines = WRITELINESCOPY;
        });
      },
      triggerBareMode,
      easterEggStyles,
      disableInput,
      USERINPUT,
      currentPath,
      setCurrentPath: (path: string[]) => { currentPath = path; },
      getHistory: () => HISTORY,
    };
    handleCommand('banner', ctx);
    
    USERINPUT.focus();
  });

  USERINPUT.addEventListener('keypress', userInputHandler);
  USERINPUT.addEventListener('keydown', userInputHandler);
  
  // 处理粘贴事件：如果粘贴的是多行文本，自动执行多行命令
  USERINPUT.addEventListener('paste', (e: ClipboardEvent) => {
    if (!PROMPT || !USERINPUT) return;
    
    const pastedText = e.clipboardData?.getData('text') || '';
    
    // 检测是否包含换行符
    if (pastedText.includes('\n')) {
      e.preventDefault();
      // 多行文本：立即处理
      const lines = pastedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      if (lines.length > 0) {
        commandQueue = lines;
        isProcessingQueue = true;
        HISTORY.push(pastedText);
        historyIdx = HISTORY.length;
        
        // 显示所有命令行
        lines.forEach(line => {
          const newUserInput = `<span class='output'>${line}</span>`;
          const div = document.createElement("div");
          div.innerHTML = `<span id="prompt">${PROMPT!.innerHTML}</span> ${newUserInput}`;
          if (mutWriteLines && mutWriteLines.parentNode) {
            mutWriteLines.parentNode.insertBefore(div, mutWriteLines);
          }
        });
        
        USERINPUT.value = '';
        scrollToBottom();
        
        // 开始执行队列中的命令
        processCommandQueue();
      }
    }
  });


  console.log("Are you witnessing?");
  console.log("visitor@Undered:$ ~ crack \\escr");

}

initEventListeners();