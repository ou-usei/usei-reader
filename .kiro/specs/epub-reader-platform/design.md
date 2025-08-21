# 设计文档

## 概述

epub阅读平台是一个基于Web的全栈应用，旨在为用户提供跨设备的epub阅读体验。系统采用前后端分离架构，前端使用React构建响应式用户界面，后端使用Node.js + Express提供RESTful API服务，数据库使用PostgreSQL存储用户数据和书籍元信息。

核心功能包括epub文件解析与渲染、跨设备阅读进度同步、文本摘录管理、用户认证和书籍库管理。系统设计注重可扩展性和性能，支持未来功能扩展。

## 架构

### 系统架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (React)   │    │  后端 (Express)  │    │ 数据库 (PostgreSQL)│
│                 │    │                 │    │                 │
│ - epub.js渲染器  │◄──►│ - RESTful API   │◄──►│ - 用户数据       │
│ - 进度同步       │    │ - 文件处理      │    │ - 书籍元信息     │
│ - 摘录管理       │    │ - 用户认证      │    │ - 阅读进度       │
│ - 响应式UI      │    │ - 会话管理      │    │ - 摘录数据       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ 文件存储 (本地)  │
                    │                 │
                    │ - epub文件      │
                    │ - 封面图片      │
                    └─────────────────┘
```

### 技术栈选择

**前端技术栈：**
- React 18 - 现代化的用户界面框架
- epub.js - 专业的epub解析和渲染库
- Tailwind CSS - 实用优先的CSS框架
- Axios - HTTP客户端库
- React Router - 前端路由管理

**后端技术栈：**
- Node.js - JavaScript运行时环境
- Express.js - 轻量级Web框架
- Prisma - 现代化的ORM工具
- PostgreSQL - 关系型数据库
- Multer - 文件上传中间件
- bcrypt - 密码加密库
- jsonwebtoken - JWT认证

## 组件和接口

### 前端组件架构

```
App
├── AuthProvider (认证上下文)
├── Router
    ├── LoginPage (登录页面)
    ├── RegisterPage (注册页面)
    ├── Dashboard (主面板)
    │   ├── BookLibrary (书籍库)
    │   │   ├── BookCard (书籍卡片)
    │   │   ├── BookUpload (上传组件)
    │   │   └── BookSearch (搜索组件)
    │   ├── Reader (阅读器)
    │   │   ├── EpubRenderer (epub渲染器)
    │   │   ├── NavigationControls (导航控件)
    │   │   ├── ProgressBar (进度条)
    │   │   └── SettingsPanel (设置面板)
    │   └── ExcerptManager (摘录管理)
    │       ├── ExcerptList (摘录列表)
    │       ├── ExcerptCard (摘录卡片)
    │       └── ExcerptSearch (摘录搜索)
    └── NotFound (404页面)
```

### 后端API接口设计

**认证相关接口：**
```
POST /api/auth/register - 用户注册
POST /api/auth/login - 用户登录
POST /api/auth/logout - 用户登出
GET /api/auth/profile - 获取用户信息
PUT /api/auth/profile - 更新用户信息
```

**书籍管理接口：**
```
GET /api/books - 获取用户书籍列表
POST /api/books - 上传新书籍
GET /api/books/:id - 获取书籍详情
DELETE /api/books/:id - 删除书籍
GET /api/books/:id/content - 获取书籍内容
GET /api/books/:id/cover - 获取书籍封面
```

**阅读进度接口：**
```
GET /api/books/:id/progress - 获取阅读进度
PUT /api/books/:id/progress - 更新阅读进度
```

**摘录管理接口：**
```
GET /api/excerpts - 获取用户所有摘录
POST /api/excerpts - 创建新摘录
GET /api/excerpts/:id - 获取摘录详情
PUT /api/excerpts/:id - 更新摘录
DELETE /api/excerpts/:id - 删除摘录
GET /api/books/:id/excerpts - 获取特定书籍的摘录
```

### epub.js集成方案

基于研究，epub.js是最成熟的JavaScript epub渲染库，具有以下特点：
- 支持EPUB2和EPUB3格式
- 提供多种渲染模式（分页、滚动）
- 内置导航和进度管理
- 支持主题和样式自定义
- 提供文本选择和标注功能

**集成实现：**
```javascript
// 初始化epub.js
const book = ePub(epubUrl);
const rendition = book.renderTo("reader-container", {
  width: "100%",
  height: "100%",
  flow: "paginated"
});

// 显示内容并监听事件
rendition.display().then(() => {
  // 监听位置变化
  rendition.on("relocated", (location) => {
    updateProgress(location);
  });
  
  // 监听文本选择
  rendition.on("selected", (cfiRange, contents) => {
    showExcerptDialog(cfiRange, contents);
  });
});
```

## 数据模型

### 数据库表结构

**用户表 (users):**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**书籍表 (books):**
```sql
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(300),
  isbn VARCHAR(20),
  file_path VARCHAR(500) NOT NULL,
  cover_path VARCHAR(500),
  file_size BIGINT,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB -- 存储epub元数据
);
```

**阅读进度表 (reading_progress):**
```sql
CREATE TABLE reading_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  current_cfi VARCHAR(500), -- EPUB CFI位置
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, book_id)
);
```

**摘录表 (excerpts):**
```sql
CREATE TABLE excerpts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  cfi_range VARCHAR(500), -- CFI范围
  note TEXT, -- 用户笔记
  tags TEXT[], -- 标签数组
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Prisma Schema

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  passwordHash String @map("password_hash")
  username  String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  books     Book[]
  progress  ReadingProgress[]
  excerpts  Excerpt[]
  
  @@map("users")
}

model Book {
  id         Int      @id @default(autoincrement())
  userId     Int      @map("user_id")
  title      String
  author     String?
  isbn       String?
  filePath   String   @map("file_path")
  coverPath  String?  @map("cover_path")
  fileSize   BigInt?  @map("file_size")
  uploadDate DateTime @default(now()) @map("upload_date")
  metadata   Json?
  
  user     User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  progress ReadingProgress[]
  excerpts Excerpt[]
  
  @@map("books")
}

model ReadingProgress {
  id                 Int      @id @default(autoincrement())
  userId             Int      @map("user_id")
  bookId             Int      @map("book_id")
  currentCfi         String?  @map("current_cfi")
  progressPercentage Decimal? @default(0) @map("progress_percentage") @db.Decimal(5, 2)
  lastReadAt         DateTime @default(now()) @map("last_read_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)
  
  @@unique([userId, bookId])
  @@map("reading_progress")
}

model Excerpt {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  bookId    Int      @map("book_id")
  content   String
  cfiRange  String?  @map("cfi_range")
  note      String?
  tags      String[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)
  
  @@map("excerpts")
}
```

## 错误处理

### 前端错误处理策略

**网络错误处理：**
- 实现全局axios拦截器处理HTTP错误
- 提供用户友好的错误提示
- 支持离线模式和重试机制

**epub解析错误：**
- 验证文件格式和完整性
- 提供详细的错误信息
- 支持部分损坏文件的降级处理

### 后端错误处理

**统一错误响应格式：**
```javascript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "用户友好的错误信息",
    "details": "详细的技术错误信息"
  }
}
```

**错误类型分类：**
- 认证错误 (401)
- 权限错误 (403)
- 资源不存在 (404)
- 验证错误 (400)
- 服务器错误 (500)

## 测试策略

### 前端测试

**单元测试：**
- 使用Jest和React Testing Library
- 测试组件渲染和用户交互
- 测试工具函数和hooks

**集成测试：**
- 测试epub.js集成
- 测试API调用和数据流
- 测试路由和导航

### 后端测试

**单元测试：**
- 测试API端点
- 测试数据库操作
- 测试业务逻辑函数

**集成测试：**
- 测试完整的API流程
- 测试数据库事务
- 测试文件上传和处理

**端到端测试：**
- 使用Playwright测试完整用户流程
- 测试跨浏览器兼容性
- 测试响应式设计

### 性能测试

**前端性能：**
- 测试大文件epub的加载性能
- 测试渲染性能和内存使用
- 测试移动设备性能

**后端性能：**
- 测试API响应时间
- 测试并发用户处理能力
- 测试文件上传性能

## 安全考虑

### 认证和授权
- JWT token认证机制
- 密码加密存储 (bcrypt)
- 会话超时管理
- CORS配置

### 文件安全
- 文件类型验证
- 文件大小限制
- 恶意文件扫描
- 安全的文件存储路径

### 数据保护
- SQL注入防护 (Prisma ORM)
- XSS攻击防护
- CSRF保护
- 敏感数据加密

## 部署和扩展

### 部署架构
- 前端：静态文件部署 (Nginx)
- 后端：Node.js应用服务器
- 数据库：PostgreSQL
- 文件存储：本地存储 (可扩展至云存储)

### 扩展性设计
- 微服务架构准备
- 数据库分片支持
- CDN集成准备
- 负载均衡支持

### 监控和日志
- 应用性能监控
- 错误日志收集
- 用户行为分析
- 系统健康检查