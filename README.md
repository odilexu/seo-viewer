# Schema Markup Viewer

一个 Chrome 浏览器扩展，用于查看当前页面的结构化数据（Schema.org markup）。

## 功能特性

- ✅ 自动提取页面中的 JSON-LD、Microdata、RDFa 格式的结构化数据
- ✅ JSON 格式化展示，带语法高亮（金色 Key、暖棕 Boolean、橙色数字、深绿字符串）
- ✅ 可折叠/展开每个 Schema 块
- ✅ 暖金米色主题（DeepLumen 风格），护眼舒适
- ✅ 一键复制单个或全部 Schema 数据
- ✅ 智能识别常见 Schema 类型并显示图标
- ✅ 中文字体优先（微软雅黑 / 苹方），西文使用等宽字体

## 安装方法

### 1. 打开 Chrome 扩展管理页面

在 Chrome 地址栏输入：
```
chrome://extensions/
```

### 2. 启用开发者模式

在页面右上角，打开「开发者模式」开关

### 3. 加载扩展

点击「加载已解压的扩展程序」按钮，选择 `schema-viewer` 文件夹

### 4. 完成！

扩展图标（金色 `{}` 米色圆角方块）会出现在 Chrome 工具栏中

## 使用方法

1. 访问任意网页（例如：电商网站、新闻网站、博客等）
2. 点击浏览器工具栏中的扩展图标
3. 扩展会自动提取并显示页面中的结构化数据
4. 点击 Schema 块的标题可以折叠/展开
5. 点击「复制」按钮可以复制单个 Schema 的 JSON 数据
6. 点击「复制全部」可以复制所有 Schema 数据

## 支持的 Schema 格式

| 格式 | 说明 |
|------|------|
| JSON-LD | 最常见的格式，通过 `<script type="application/ld+json">` 标签嵌入 |
| Microdata | 通过 `itemscope`、`itemprop` 等属性标记 |
| RDFa | 通过 `typeof`、`property` 等属性标记 |

## 常见 Schema 类型

扩展会智能识别以下类型并显示对应图标：

- 📄 Article / NewsArticle / BlogPosting
- 🛍️ Product
- 💰 Offer
- 👤 Person
- 🏢 Organization
- 🏪 LocalBusiness / Restaurant
- 📅 Event
- 🎬 Movie
- 📚 Book
- 🍳 Recipe
- ⭐ Review
- ❓ FAQPage
- 📋 HowTo
- 🧭 BreadcrumbList
- 🌐 WebPage / WebSite
- 🎥 VideoObject
- 🖼️ ImageObject

## 配色方案

| 角色 | 色值 |
|------|------|
| 页面背景 | `#f7f3ec` 暖米色 |
| 卡片背景 | `#ffffff` + `#e6e0d8` 边框 |
| 强调色 | `#be8e3e` 琥珀金（按钮、标签、JSON Key、头部顶线） |
| 主文字 | `#272422` 暖黑棕 |
| 次级文字 | `#8c857f` 暖灰 |
| JSON 布尔 | `#725e42` 暖棕 |
| JSON 数字 | `#ce6b2a` 橙色 |
| JSON 字符串 | `#4a7d4a` 深绿 |
| JSON null | `#9e9e9e` 灰色 |

## 文件结构

```
schema-viewer/
├── manifest.json        # 扩展配置（Manifest V3）
├── popup.html           # 弹窗页面
├── popup.js             # 弹窗逻辑（提取和渲染 Schema）
├── styles.css           # 暖金米色风格样式
├── icon16.png           # 16×16 图标（工具栏）
├── icon32.png           # 32×32 图标
├── icon48.png           # 48×48 图标
├── icon64.png           # 64×64 图标
├── icon128.png          # 128×128 图标
├── icon256.png          # 256×256 图标
├── design-icons.js      # 图标生成脚本（Node.js，无需外部依赖）
└── README.md            # 本文件
```

## 技术栈

- Chrome Extensions Manifest V3
- Vanilla JavaScript（无框架依赖）
- CSS3 自定义属性 + 过渡动画（暖金主题）
- 图标纯 Node.js 生成（无 canvas 依赖，手动像素绘制）

## 测试网站

可以访问以下网站测试扩展效果：

- https://developers.google.com/search/docs/appearance/structured-data （Google 官方文档）
- 任意电商商品详情页（如京东、淘宝）
- 新闻网站文章页（如 BBC、CNN）
- 食谱网站（如 AllRecipes）
- 电影网站（如 IMDb）

## 许可证

MIT License
