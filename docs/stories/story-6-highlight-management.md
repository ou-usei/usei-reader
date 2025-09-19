---
story: "高亮管理与笔记功能"
epic: "前端现代化与后端集成"
status: "Done"
version: 1.0
---

# 故事六：高亮管理与笔记功能

## 1. 用户故事

> **作为一名** 用户,
> **我想要** 在创建高亮时能附带添加一条笔记，并且能在一个集中的地方查看我所有的高亮,
> **以便于** 我可以轻松地回顾和管理我的学习笔记。

## 2. 验收标准 (Acceptance Criteria)

1.  **[AC1]** **数据库与 API 扩展**:
    -   `Highlight` 数据库模型必须添加一个可选的 `note` 字段 (文本类型)。
    -   `POST /api/highlights` 端点必须能接受并保存 `note` 字段。
    -   `GET /api/highlights/:bookId` 端点必须返回包含 `note` 字段的高亮数据。
2.  **[AC2]** **桌面端高亮流程**:
    -   当用户在桌面浏览器上选中文本时，出现的 `SelectionMenu` 组件必须包含一个新的“添加笔记”或类似功能的按钮。
    -   点击该按钮后，应弹出一个简单的对话框或输入框，允许用户输入笔记。
    -   保存后，高亮和笔记都将被发送到后端。
3.  **[AC3]** **iPad 端高亮流程**:
    -   `HighlightDialog` 组件必须添加一个新的文本区域，用于输入笔记。
    -   当用户通过此对话框创建高亮时，输入的笔记也必须一同被保存。
4.  **[AC4]** **高亮展示 (阅读器内)**:
    -   阅读器界面需要一个新的可切换的侧边栏或面板。
    -   此面板将列出当前书籍的所有高亮。每个列表项应显示高亮的文本内容和关联的笔记。
    -   点击列表中的某个高亮项，阅读器应跳转到该高亮在书中的位置。
5.  **[AC5]** **高亮展示 (书籍详情页)**:
    -   `BookDetails` 页面必须进行扩展，以包含一个新的区域，专门用于展示该书籍的所有高亮。
    -   此区域应以列表形式清晰地展示高亮的文本和笔记。

## 3. 任务 / 子任务 (Tasks / Subtasks)

- `[x]` **Task 1: 后端增强 (AC1)**
    - `[x]` Subtask 1.1: 更新 `prisma/schema.prisma`，为 `Highlight` 模型添加 `note` 字段。
    - `[x]` Subtask 1.2: 创建并运行数据库迁移。
    - `[x]` Subtask 1.3: 更新 `POST /api/highlights` 的 DAL 和服务层逻辑，以处理 `note` 数据。
    - `[x]` Subtask 1.4: 确保 `GET /api/highlights/:bookId` 的查询包含了新的 `note` 字段。
- `[x]` **Task 2: 前端组件更新 (AC2, AC3)**
    - `[x]` Subtask 2.1: 创建一个新的 `NoteDialog` 组件，用于在桌面端输入笔记。
    - `[x]` Subtask 2.2: 修改 `SelectionMenu.js`，添加一个按钮来触发 `NoteDialog`。
    - `[x]` Subtask 2.3: 修改 `HighlightDialog.js` (iPad)，添加一个 `<textarea>` 用于笔记输入。
    - `[x]` Subtask 2.4: 更新 `readerStore.js` 中的 `addHighlight` action，使其可以发送包含 `note` 的数据。
- `[x]` **Task 3: 在阅读器中展示高亮 (AC4)**
    - `[x]` Subtask 3.1: 在 `Reader.js` 中添加一个新的状态来控制高亮侧边栏的可见性。
    - `[x]` Subtask 3.2: 创建一个新的 `HighlightsPanel.js` 组件，用于渲染高亮列表。
    - `[x]` Subtask 3.3: 在 `Reader.js` 中集成 `HighlightsPanel`，并实现跳转到高亮位置的功能。
- `[x]` **Task 4: 在书籍详情页展示高亮 (AC5)**
    - `[x]` Subtask 4.1: 修改 `BookDetails.js`，在组件挂载时从 `readerStore` 或直接通过 API 获取高亮数据。
    - `[x]` Subtask 4.2: 在 `BookDetails.js` 的渲染逻辑中添加高亮列表。

## 4. 开发说明 (Dev Notes)

*   **用户体验**: 保持笔记输入的流程尽可能简洁。对于桌面用户，弹出的对话框不应过于干扰。
*   **状态管理**: `readerStore` 将是管理高亮数据（包括笔记）的中心。确保在添加、删除或更新高亮时，store 的状态能正确同步。
*   **代码复用**: 考虑在 `HighlightsPanel.js` (阅读器内) 和 `BookDetails.js` 之间复用高亮列表的渲染逻辑，可以为此创建一个共享的 `HighlightList` 组件。

## 5. 变更日志 (Change Log)

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2025-08-28 | 1.0 | 初始草稿 | John (pm) |
