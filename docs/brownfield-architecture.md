# Usei Reader 项目架构文档 (v2 - 目标架构)

## 1. 引言

本文档旨在详细描述 Usei Reader 项目重构后的目标状态，包括其技术栈、系统架构、代码结构和开发模式。本文档的目标是为 AI 和人类开发者提供一个清晰、准确的蓝图，指导后续的重构和开发工作。

### 1.1. 文档范围

本文档涵盖了项目的整体目标架构，包括前端、后端以及它们之间的交互。

### 1.2. 变更日志

| 日期 | 版本 | 描述 | 作者 |
| :--- | :--- | :--- | :--- |
| 2025年8月28日 | 2.0 | 目标架构定义，为系统重构提供蓝图 | Architect |
| 2025年8月28日 | 1.0 | 初始版本，基于对现有代码库的分析 | Architect |

## 2. 快速参考 - 关键文件和入口点

*   **后端入口**: `server/app.js` - Express 应用的入口，负责集成中间件和路由。
*   **前端入口**: `client/src/index.js` 和 `client/src/App.js` - React 应用的启动文件和根组件。
*   **ORM 与数据库模式**: `server/prisma/schema.prisma` - 数据模型的唯一真实来源。
*   **对象存储配置**: `server/src/config/r2-client.js` (目标位置)
*   **核心前端组件**: `client/src/components/Reader.js` - 实现 EPUB 阅读功能的核心组件。
*   **根脚本定义**: `package.json` - 包含 `setup`, `dev` 等关键的顶层命令。

## 3. 高层架构

### 3.1. 技术摘要

Usei Reader 是一个前后端分离的 Web 应用。

*   **前端**是一个基于 React 的单页面应用（SPA），负责用户界面和交互。
*   **后端**是一个基于 Node.js 和 Express 的 RESTful API 服务，采用**分层架构**（路由、服务、数据访问），负责处理业务逻辑。
*   **数据库**采用**自托管的 PostgreSQL**，并通过 **Prisma ORM** 进行访问和管理。此方案将替换项目初期使用的 Supabase 服务。
*   **文件存储**采用与 S3 兼容的对象存储服务（如 Cloudflare R2）。
*   **认证**采用基于 **JWT** 的自托管方案。

### 3.2. 技术栈（目标架构）

| 类别 | 技术 | 版本/说明 |
| :--- | :--- | :--- |
| **前端** | | |
| 框架 | React | v18.2.0 |
| UI 库 | Tailwind CSS | v3.4.1 |
| 状态管理 | Zustand | v5.0.8 |
| EPUB 渲染 | epub.js | v0.3.93 |
| **后端** | | |
| 运行时 | Node.js | >=18.17.0 (ES Modules) |
| 框架 | Express | v4.19.2 |
| ORM | Prisma | 用于类型安全的数据库访问和迁移 |
| 认证 | JWT (jsonwebtoken), bcrypt | |
| **数据库** | | |
| 类型 | PostgreSQL | 自托管实例 |
| **开发与测试** | | |
| 测试框架 | Jest, Supertest | 用于后端 API 集成测试 |

### 3.3. 仓库结构

*   **类型**: Monorepo 风格的 Polyrepo。
*   **包管理器**: npm

## 4. 源码树和模块组织

### 4.1. 项目结构（目标）

```text
usei-reader/
├── client/
│   └── ...
├── server/
│   ├── prisma/             # Prisma schema 和迁移文件
│   │   └── schema.prisma
│   ├── src/
│   │   ├── routes/         # API 路由层
│   │   ├── services/       # 业务逻辑层
│   │   ├── dal/            # 数据访问层 (使用 Prisma Client)
│   │   ├── middleware/     # Express 中间件 (例如，认证)
│   │   └── config/         # 应用配置 (数据库, R2, etc.)
│   ├── tests/              # Jest 测试文件
│   ├── app.js              # Express 应用入口和中间件集成
│   └── package.json
└── ...
```

## 5. 数据模型和 API

### 5.1. 数据模型

*   **数据模型将由 Prisma 进行管理**，定义在 `server/prisma/schema.prisma` 文件中。
*   模型将包括 `User`, `Book`, `BookFile`, `ReadingProgress`, `Highlight` 等，并明确定义它们之间的关系。`User` 模型将包含一个 `passwordHash` 字段。

### 5.2. API 规格

*   **认证 API**:
    *   `POST /api/auth/register`: 用户注册。
    *   `POST /api/auth/login`: 用户登录，成功后返回 JWT。
*   **其他 API** 保持不变，但将受到 JWT 认证中间件的保护。

## 6. 技术债和已知问题

*   **[已解决] 用户系统**: 基于 `users.json` 的临时系统将被一个安全的、自托管的认证服务所取代。
*   **[已解决] 文档不一致**: 本文档已更新以反映目标架构。
*   **[待办] 配置管理**: 敏感信息通过 `.env` 文件管理，生产环境中需要更安全的密钥管理方案。
*   **[待办] 错误处理**: 在分层重构时可以引入一个统一的错误处理中间件。

## 7. 开发与部署

### 7.1. 本地开发设置

*   新增一步：运行 `npx prisma migrate dev` 来确保数据库 schema 是最新的。

## 8. 测试

*   **目标测试策略**:
    *   **后端**: 使用 `Jest` 和 `Supertest` 为所有 API 端点编写集成测试。
    *   **前端**: 使用 `React Testing Library` 为关键的交互式组件编写单元/组件测试。
    *   **目标**: 建立一个 CI/CD 流程，在每次代码提交时自动运行所有测试。