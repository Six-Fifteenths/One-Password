import command from '../../config.json' with {type: 'json'};

/** 
 * 生成欢迎横幅
 * 从 config.json 的 ascii 数组读取 ASCII 艺术，转换空格为 HTML 实体
 * @returns 格式化的横幅行数组
 */
const createBanner = () : string[] => {
  const banner : string[] = [];
  banner.push("<br>")
  
  // 遍历 ASCII 艺术数组并转换空格
  command.ascii.forEach((ele) => {
    let bannerString = "";
    // 将空格转换为 &nbsp; 以保持排列
    for (let i = 0; i < ele.length; i++) {
      if (ele[i] === " ") {
        bannerString += "&nbsp;";
      } else {
        bannerString += ele[i];
      }
    }
    
    let eleToPush = `<pre>${bannerString}</pre>`;
    banner.push(eleToPush);
  });  
  banner.push("<br>");
  banner.push("<span style='color: #ffff00;'>SuperiArmy Message:</span> Type <span class='command'>'cat about'</span> .");
  banner.push("<br>");
  return banner;
}

// 导出预生成的横幅内容
export const BANNER = createBanner();
