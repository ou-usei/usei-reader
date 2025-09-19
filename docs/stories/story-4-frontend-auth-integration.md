---
story: "前端认证流程集成"
epic: "前端现代化与后端集成"
status: "Done"
version: 1.0
---

# 故事四：前端认证流程集成

## 1. 用户故事

> **作为一名** 前端开发者,
> **我想要** 将 React 应用与新的自托管 JWT 认证服务集成,
> **以便于** 用户可以安全地在应用中注册和登录。

## 2. 验收标准 (Acceptance Criteria)

1.  **[AC1]** 必须创建一个新的 API client 或 service (`client/src/utils/api.js`) 来封装所有与后端的交互。
2.  **[AC2]** 登录/注册表单的提交操作必须调用新的后端端点 (`POST /api/users/register` 和 `POST /api/users/login`)。
3.  **[AC3]** 登录成功后，从后端返回的 JWT 必须被安全地存储在客户端（例如，`localStorage`）。
4.  **[AC4]** 用户的认证状态（已登录/未登录）必须被存储在全局状态管理器（Zustand）中。
5.  **[AC5]** 应用加载时，必须检查 `localStorage` 中是否存在有效的 JWT，如果存在，则自动将用户设置为登录状态。
6.  **[AC6]** 必须实现一个登出功能，该功能会清除 `localStorage` 中的 JWT 和 Zustand 中的用户状态。
7.  **[AC7]** 旧的、基于 `users.json` 的临时用户选择逻辑必须被完全移除。

## 3. 任务 / 子任务 (Tasks / Subtasks)

- `[x]` **Task 1: 创建 API Client (AC1)**
    - `[x]` Subtask 1.1: 创建 `client/src/utils/api.js` 文件。
    - `[x]` Subtask 1.2: 在其中实现 `registerUser` 和 `loginUser` 函数，用于调用后端 API。
- `[x]` **Task 2: 重构认证流程 (AC2, AC3, AC4, AC6, AC7)**
    - `[x]` Subtask 2.1: 修改登录/注册组件，使其调用新的 API client 函数。
    - `[x]` Subtask 2.2: 在 Zustand store (`client/src/stores/authStore.js`) 中添加 `login` 和 `logout` action。
    - `[x]` Subtask 2.3: `login` action 必须在 API 调用成功后，将 JWT 存入 `localStorage` 并更新 store 状态。
    - `[x]` Subtask 2.4: `logout` action 必须清除 `localStorage` 和 store 状态。
    - `[x]` Subtask 2.5: 移除所有旧的用户选择下拉菜单及其相关逻辑。
- `[x]` **Task 3: 实现持久化登录 (AC5)**
    - `[x]` Subtask 3.1: 在 `App.js` 的顶层 `useEffect` hook 中，添加一个初始化逻辑。
    - `[x]` Subtask 3.2: 该逻辑应在应用加载时检查 `localStorage`，如果找到 token，则验证它（可选，或直接信任）并更新 Zustand store，以恢复用户的登录状态。

## 4. 开发说明 (Dev Notes)

*   **API 端点**:
    *   `POST /api/users/register` - Body: `{ "email": "...", "password": "..." }`
    *   `POST /api/users/login` - Body: `{ "email": "...", "password": "..." }`
*   **JWT 处理**:
    *   Token 将由后端在 `login` 成功后返回。
    *   Token 应存储在 `localStorage` 中，键名建议为 `jwt_token`。
*   **状态管理**:
    *   使用 `client/src/stores/authStore.js` (Zustand) 来管理 `user` 和 `token` 的状态。
    *   Store 应包含 `user`, `token`, `login`, `logout` 等状态和方法。

## 5. 变更日志 (Change Log)

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2025-08-28 | 1.0 | 初始草稿 | Bob (sm) |
