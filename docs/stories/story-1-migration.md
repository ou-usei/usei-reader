---
story: "数据库与认证服务迁移"
epic: "核心系统重构与现代化"
status: "Done"
version: 1.0
---

# 故事1：数据库与认证服务迁移

## 1. 用户故事

> **作为一名** 应用开发者,
> **我想要** 将数据和认证从 Supabase 迁移到一个自托管的、基于 JWT 的健robust系统中,
> **以便于** 提升应用的安全性、可控性，并为未来的功能拓展（如家庭共享）扫清障碍。

## 2. 故事上下文

*   **集成于:** 现有的 Express 后端服务。
*   **技术栈:** Node.js, Express, PostgreSQL, Prisma, JWT, bcrypt。
*   **遵循模式:** 这将为后端建立一个新的数据访问和认证模式。
*   **接触点:** 需要修改或替换现有的数据库连接逻辑 (`db.js`) 和用户处理逻辑 (`users.json`)。

## 3. 验收标准 (Acceptance Criteria)

### 功能需求

1.  **[AC1]** 数据库中必须包含 `User`, `Book`, `BookFile`, `ReadingProgress`, `Highlight` 表，其结构与 `schema.prisma` 文件定义一致。
2.  **[AC2]** 一个一次性的迁移脚本 (`scripts/migrate-from-supabase.js`) 成功执行后，所有 Supabase 中的现有数据都必须完整地存在于新的 PostgreSQL 数据库中。
3.  **[AC3]** 用户可以通过 `POST /api/auth/register` 端点成功创建一个新账户，其密码在数据库中必须是以 bcrypt 哈希的形式存储。
4.  **[AC4]** 已注册的用户可以通过 `POST /api/auth/login` 端点进行登录，并在成功后获得一个有效的 JWT 令牌。
5.  **[AC5]** 旧的 `GET /api/users` 端点和 `users.json` 文件必须被彻底移除。

### 集成与质量要求

6.  **[AC6]** 项目的 `.env.example` 文件中必须包含 `DATABASE_URL` 和 `JWT_SECRET` 变量。
7.  **[AC7]** 所有与数据库的交互都必须通过 Prisma Client 进行。
8.  **[AC8]** 现有的所有其他 API 端点（如获取书籍、上传等）在迁移后必须保持功能正常（尽管此时它们可能还未受保护）。

## 4. 技术说明 (Technical Notes)

*   **集成方法:**
    *   使用 Prisma 作为 ORM，全面替换现有的原生 `pg` 查询和 Supabase 客户端。
    *   新的认证路由 (`auth.routes.js`) 将被集成到主 `app.js` 文件中。
*   **需遵循的模式参考:**
    *   数据库模式定义遵循 `schema.prisma` 文件。
    *   密码哈希必须使用 `bcrypt` 库。
    *   令牌生成必须使用 `jsonwebtoken` 库。
*   **关键约束:**
    *   迁移脚本必须是幂等的，或者在设计上只能安全地运行一次，以防止数据重复。
    *   在完成数据验证之前，不得删除旧的 Supabase 数据库。

## 5. 风险和兼容性检查

*   **主要风险:** 在从 Supabase 迁移数据的过程中，发生数据丢失或损坏。
*   **缓解措施:** 严格遵循架构师设计的迁移流程：先编写脚本，然后在开发环境中反复演练，最后再对生产数据执行，并进行数据验证。
*   **回滚计划:** 在确认新系统稳定运行之前，暂时保留 Supabase 数据库。如果出现严重问题，可以通过修改数据库连接字符串将后端服务切回 Supabase。

## 6. 完成的定义 (Definition of Done)

*   `[x]` 所有验收标准 (AC1-AC8) 均已满足。
*   `[x]` 数据已成功从 Supabase 迁移到自托管的 PostgreSQL 数据库，并经过验证。
*   `[x]` 新的认证 API (`/register`, `/login`) 已通过 Postman 或类似工具手动测试通过。
*   `[x]` 现有功能经过了手动的回归测试，确认可以正常工作。
*   `[x]` 所有与 Supabase 相关的旧代码和依赖都已被移除。
*   `[x]` 代码已提交到版本控制系统。
