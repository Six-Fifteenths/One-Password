import { CommandContext } from "./registry";
import { HINTS } from "./hints";

/**
 * hint 命令实现
 * 用法：
 *  - `hint <target>`          显示目标的全部 3 条提示（若存在）
 *  - `hint <target> <1|2|3>`  显示目标的指定编号提示
 */
export const provideHint = (arg: string, ctx: CommandContext) => {
  if (!arg || arg.trim().length === 0) {
    ctx.writeLines(["hint: missing operand", "<br>"]);
    return;
  }

  const parts = arg.trim().split(/\s+/);
  const target = parts[0];
  const indexPart = parts[1];

  const hints = HINTS[target];
  if (!hints) {
    ctx.writeLines([`No hints found for '${target}'.`, "<br>"]);
    return;
  }

  if (indexPart) {
    const idx = parseInt(indexPart, 10);
    if (isNaN(idx) || idx < 1 || idx > hints.length) {
      ctx.writeLines([`Invalid hint number. Choose 1-${hints.length}.`, "<br>"]);
      return;
    }

    const line = `Hint ${idx}: ${hints[idx - 1]}`;
    ctx.writeLines([line, "<br>"]);
    return;
  }

  // 未指定编号：一次性展示全部提示（按序）
  const out: string[] = ["<br>"];
  for (let i = 0; i < hints.length; i++) {
    out.push(`Hint ${i + 1}: ${hints[i]}`);
  }
  out.push("<br>");
  ctx.writeLines(out);
};
