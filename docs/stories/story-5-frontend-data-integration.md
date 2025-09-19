---
story: "前端数据流重构与集成"
epic: "前端现代化与后端集成"
status: "Done"
version: 1.0
---

# 故事五：前端数据流重构与集成

## 1. 用户故事

> **作为一名** 前端开发者,
> **我想要** 重构所有的数据获取逻辑，以使用新的、经过认证的后端 API,
> **以便于** 应用能够安全地与现代化的后端进行通信。

## 2. 验收标准 (Acceptance Criteria)

1.  **[AC1]** 必须扩展 `client/src/utils/api.js`，添加用于获取、上传、删除书籍，以及管理进度和高亮的所有函数。
2.  **[AC2]** 所有发送到受保护端点（`progress`, `highlights`）的请求，都必须在请求头中包含 `Authorization: Bearer <token>`。Token 应从 `authStore` 中获取。
3.  **[AC3]** `Dashboard.js` 组件必须调用新的 API client 函数来获取书籍列表。
4.  **[AC4]** `Reader.js` 组件必须调用新的 API client 函数来获取和保存阅读进度及高亮。
5.  **[AC5]** `BookDetails.js` 组件必须调用新的 API client 函数来删除书籍。
6.  **[AC6]** 所有旧的、直接使用 `fetch` 的代码都必须被移除。
7.  **[AC7]** 应用在重构后，所有核心功能（加载书籍、阅读、保存进度、高亮、删除书籍）必须能正常工作。

## 3. 任务 / 子任务 (Tasks / Subtasks)

- `[x]` **Task 1: 扩展 API Client (AC1, AC2)**
    - `[x]` Subtask 1.1: 在 `api.js` 中创建一个私有函数，用于从 `authStore` 获取 token 并构造认证请求头。
    - `[x]` Subtask 1.2: 实现 `getBooks`, `uploadBook`, `deleteBook` 函数。
    - `[x]` Subtask 1.3: 实现 `getProgress`, `saveProgress` 函数（需要认证头）。
    - `[x]` Subtask 1.4: 实现 `getHighlights`, `addHighlight`, `deleteHighlight` 函数（需要认证头）。
- `[x]` **Task 2: 重构组件数据流 (AC3, AC4, AC5, AC6)**
    - `[x]` Subtask 2.1: 重构 `Dashboard.js`，使用 `api.getBooks`。
    - `[x]` Subtask 2.2: 重构 `Reader.js`，使用 `api.getProgress`, `api.saveProgress`, `api.getHighlights`, `api.addHighlight`, `api.deleteHighlight`。
    - `[x]` Subtask 2.3: 重构 `BookDetails.js`，使用 `api.deleteBook`。
- `[x]` **Task 3: 清理 (AC6)**
    - `[x]` Subtask 3.1: 审查整个 `client` 目录，确保没有遗留的 `fetch` 调用。

## 4. 开发说明 (Dev Notes)

*   **认证头**: 所有需要认证的 API 调用，都需要从 `authStore.getState().token` 获取 JWT，并将其放入 `Authorization` 请求头。
*   **API 端点列表**:
    *   `GET /api/books`
    *   `POST /api/books/upload`
    *   `DELETE /api/books/:uuid`
    *   `GET /api/books/:uuid/view`
    *   `GET /api/progress/:bookId` (受保护)
    *   `POST /api/progress/:bookId` (受保护)
    *   `GET /api/highlights/:bookId` (受保护)
    *   `POST /api/highlights` (受保护)
    *   `DELETE /api/highlights/:id` (受保护)
*   **状态管理**: 组件应继续使用 Zustand store 来管理从 API 获取的数据和 UI 状态。

## 5. 变更日志 (Change Log)

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2025-08-28 | 1.0 | 初始草稿 | Bob (sm) |
