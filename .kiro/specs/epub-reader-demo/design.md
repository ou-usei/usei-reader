# Demo版本设计文档

## 概述

epub阅读器demo是一个简化的单页应用，专注于验证核心阅读功能。系统采用前后端分离的简单架构，前端使用React + epub.js，后端使用Express提供基本的文件服务和数据存储，使用SQLite作为轻量级数据库解决方案。

## 架构

### 简化系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (React)   │    │  后端 (Express)  │    │   SQLite数据库   │
│                 │    │                 │    │                 │
│ - epub.js渲染器  │◄──►│ - 文件API       │◄──►│ - 书籍信息       │
│ - 本地进度缓存   │    │ - 简单数据API   │    │ - 阅读进度       │
│ - 摘录管理       │    │ - 静态文件服务  │    │ - 摘录数据       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   本地文件存储   │
                    │                 │
                    │ - epub文件      │
                    │ - 上传目录      │
                    └─────────────────┘
```

### 技术栈选择

**前端 (简化版)：**
- React 18 - 用户界面框架
- epub.js - epub解析和渲染
- 原生CSS - 简单样式，无需复杂框架
- Fetch API - HTTP请求

**后端 (简化版)：**
- Node.js + Express - 轻量级服务器
- SQLite3 - 文件数据库，无需安装
- Multer - 文件上传处理
- CORS - 跨域支持

## 组件和接口

### 前端组件架构 (简化版)

```
App
├── BookUpload (文件上传)
├── BookList (书籍列表)
├── Reader (阅读器)
│   ├── EpubViewer (epub显示)
│   ├── Navigation (导航控件)
│   └── ExcerptPanel (摘录面板)
└── ExcerptList (摘录列表)
```

### API接口设计 (简化版)

```
POST /api/upload - 上传epub文件
GET /api/books - 获取书籍列表
GET /api/books/:id - 获取书籍详情
GET /api/books/:id/file - 下载epub文件
GET /api/progress/:bookId - 获取阅读进度
POST /api/progress/:bookId - 保存阅读进度
GET /api/excerpts/:bookId - 获取书籍摘录
POST /api/excerpts - 创建摘录
```

## 数据模型

### SQLite表结构 (简化版)

```sql
-- 书籍表
CREATE TABLE books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 阅读进度表
CREATE TABLE reading_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER,
  current_cfi TEXT,
  progress_percentage REAL DEFAULT 0,
  last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books (id)
);

-- 摘录表
CREATE TABLE excerpts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER,
  content TEXT NOT NULL,
  cfi_range TEXT,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books (id)
);
```

## 项目结构

```
epub-reader-demo/
├── client/                 # 前端代码
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── BookUpload.js
│   │   │   ├── BookList.js
│   │   │   ├── Reader.js
│   │   │   └── ExcerptList.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                 # 后端代码
│   ├── routes/
│   │   ├── books.js
│   │   ├── progress.js
│   │   └── excerpts.js
│   ├── database/
│   │   └── db.js
│   ├── uploads/           # 上传文件目录
│   ├── app.js
│   └── package.json
├── README.md
└── package.json           # 根目录脚本
```

## 开发和部署

### 开发环境设置

**启动脚本配置：**
```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "cd server && npm run dev",
    "client": "cd client && npm start",
    "setup": "npm install && cd client && npm install && cd ../server && npm install"
  }
}
```

**服务器配置：**
- 后端端口：3001
- 前端端口：3000
- 支持局域网访问：0.0.0.0绑定
- CORS配置：允许所有来源

### 局域网访问配置

```javascript
// server/app.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); // 允许跨域访问

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Network access: http://[your-ip]:${PORT}`);
});
```

## 核心功能实现

### epub.js集成 (简化版)

```javascript
// 基本的epub渲染器
class EpubReader {
  constructor(container, epubUrl) {
    this.book = ePub(epubUrl);
    this.rendition = this.book.renderTo(container, {
      width: "100%",
      height: "100%",
      flow: "paginated"
    });
  }

  async display() {
    await this.rendition.display();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 进度保存
    this.rendition.on("relocated", (location) => {
      this.saveProgress(location);
    });

    // 文本选择
    this.rendition.on("selected", (cfiRange, contents) => {
      this.showExcerptDialog(cfiRange, contents);
    });
  }
}
```

### 数据持久化策略

**本地存储 + 服务器同步：**
- 使用localStorage缓存阅读进度
- 定期同步到服务器SQLite数据库
- 离线优先，在线同步的策略

## 测试和验证

### 功能验证清单

- [ ] 文件上传和epub解析
- [ ] 基本阅读和翻页功能
- [ ] 阅读进度保存和恢复
- [ ] 文本选择和摘录创建
- [ ] 跨设备访问和数据同步
- [ ] 移动端基本适配

### 性能目标

- 启动时间：< 5秒
- 文件上传：支持最大50MB的epub文件
- 页面响应：< 1秒翻页响应时间
- 内存使用：< 200MB浏览器内存占用

## 核心问题与解决方案

### 中文文件名编码问题

在开发过程中，遇到了上传和下载包含中文字符（如 `复杂.epub`）的文件时失败的问题。根本原因在于浏览器上传文件时编码方式不统一，以及传统下载方式对非ASCII字符的兼容性不佳。

最终采用前后端结合的方案彻底解决此问题：

**后端文件处理策略：**
1.  **分离存储与显示名称：** 采用“内外有别”的策略。文件在服务器硬盘上以唯一的、安全的ASCII字符串（如 `book-timestamp.epub`）存储。而在数据库中，则同时保存这个**安全存储路径** (`file_path`) 和经过UTF-8转码后的**原始中文文件名** (`filename`)。
2.  **可靠的文件定位：** 所有服务端的文件操作，均使用`file_path`字段来定位，避免了在文件系统中直接处理不可靠的原始文件名。
3.  **精确的下载指令：** 下载API (`/api/books/:id/file`) 在响应头 `Content-Disposition` 中指定使用数据库中保存的原始中文文件名，告知浏览器文件应保存的名称。

**前端下载实现：**
1.  **放弃传统`<a>`标签下载：** 废弃了直接创建`<a>`标签并设置`href`指向API地址的方式，因其`download`属性在处理中文名时存在兼容性问题。
2.  **采用`fetch` + `Blob`现代下载流：** 通过`fetch`请求文件API，将返回的二进制数据流转换为`Blob`对象。随后，为该`Blob`创建一个临时的本地URL (`Object URL`)，并将其赋给`<a>`标签的`href`属性来触发下载。此方法将文件获取与下载触发两个环节解耦，表现更稳定可靠。