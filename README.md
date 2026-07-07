# SEO Inspector

> 原名 Schema Markup Viewer — 页面 SEO 诊断 Chrome 扩展

一键查看当前页面的三大 SEO 要素：

## 功能

1. **Content** — Title、Description、H1 概览
2. **Indexability** — Canonical URL（Raw HTML / Rendered 对比）、Robots Meta Tag、Hreflangs
3. **Schema Markup** — JSON-LD / Microdata / RDFa 结构化数据查看、折叠、复制

## 安装

```bash
# 1. 打开 Chrome 扩展管理
chrome://extensions/

# 2. 开启"开发者模式"
# 3. "加载已解压的扩展程序" → 选中本项目目录
```

## 配色

| 角色 | 色值 |
|------|------|
| 页面背景 | `#f7f3ec` 暖米色 |
| 卡片背景 | `#ffffff` 白色 |
| 主色/强调 | `#be8e3e` 琥珀金 |
| 主色深色 | `#9a6a30` 深琥珀 |
| 主色淡色 | `#e8d5b0` 浅金色 |
| 正文 | `#272422` 近黑暖棕 |
| 辅助文字 | `#8c857f` 暖灰 |
| 边框 | `#e6e0d8` 暖灰边 |
| JSON 键 | `#be8e3e` 琥珀金 |
| JSON 字符串 | `#4a8c5e` 暖绿 |
| JSON 数字 | `#c96b2e` 暖橙 |
| JSON 布尔 | `#7c5f4a` 暖棕 |
| JSON null | `#b8b2ac` 浅灰 |

## 文件结构

```
seo-inspector/
├── manifest.json      # Chrome 扩展清单
├── popup.html         # 交互界面
├── popup.js           # 核心逻辑
├── styles.css         # DeepLumen 暖金风格样式
├── design-icons.js    # 图标像素生成脚本
├── icon16.png … 256px # 6 尺寸扩展图标
├── icon.svg           # SVG 源文件
└── README.md
```

## License

MIT
