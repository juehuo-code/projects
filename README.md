# projects

课程与个人项目合集。

## 目录

| 项目 | 技术栈 | 说明 |
|------|--------|------|
| `first-game/` | Python + tkinter | 接星星小游戏，方向键移动、接星星得分；`StarCatcher.exe` 为 PyInstaller 打包版 |
| `实验室管理系统/` | 原生 HTML/CSS/JS | 设备采购/入库/维修/报废全流程管理，数据存 localStorage，双击 `index.html` 即可运行（默认账号 admin / admin123） |
| `患者监护系统/` | 原生 HTML/CSS/JS | 患者信息与监护数据静态页面 |
| `算法可视化平台/` | 原生 HTML/CSS/JS | 快排、汉诺塔、哈夫曼树、Dijkstra 四类算法的动画演示，双击 `index.html` 即可运行 |
| `智能小车项目/` | 方案与设计 | 智能小车系统方案 PPT（完整工程 zip 122 MB，超出 GitHub 单文件 100 MB 限制，未上传） |
| `红脉智联项目/` | PHP + MySQL + Vite | 红色文化平台，含后端 API 与前端页面；`red-pulse-good` / `red-pulse-matter` 两个版本 |

## 说明

- 仓库已通过 `.gitignore` 排除 `node_modules/`、`dist/`、`*.zip`。带 Vite 前端的项目恢复方式：
  ```bash
  cd frontend
  npm install
  npm run build
  ```
- `红脉智联项目/*/api/config.php` 中的数据库密码、Token 密钥、豆包 API Key 均已替换为占位符，部署前请填写自己的值。
- 静态项目（实验室管理系统、患者监护系统、算法可视化平台、first-game）无需安装依赖，直接打开即可体验。
