# 后端开发规约

本文档旨在为 `usei-reader` 项目的后端服务提供一套统一的开发约定和最佳实践。遵循这些指南有助于确保代码的一致性、高质量和可维护性。

## 1. 项目结构与技术栈

- **语言**: JavaScript (ECMAScript)
- **运行时**: Node.js (>=18.17.0)
- **模块系统**: ES Modules (ESM)
- **框架**: Express.js
- **ORM**: Prisma
- **测试框架**: Jest

## 2. ES Modules (ESM) 最佳实践

本项目已配置为使用原生 ES Modules (`package.json` 中 `"type": "module"`)。请务必遵循以下关键约定：

### 2.1. 文件导入必须包含扩展名

在导入本地文件时，**必须**包含文件扩展名（`.js`）。ESM 不会自动解析文件扩展名。

```javascript
// ❌ 错误
import { userService } from './services/user';

// ✅ 正确
import { userService } from './services/user.js';
```

### 2.2. `__dirname` 和 `__filename` 的替代方案

在 ES Modules 中，`__dirname` 和 `__filename` 这两个全局变量是不可用的。如需获取当前文件的目录路径，请使用 `import.meta.url`。

```javascript
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 现在你可以像在 CommonJS 中一样使用 __dirname
const filePath = join(__dirname, '../data/some-file.json');
```

### 2.3. 导入 JSON 文件

导入 JSON 文件时，需要使用导入断言（`assert`）。

```javascript
// ✅ 正确
import config from './config.json' assert { type: 'json' };
```

## 3. 使用 Jest 进行测试

项目的测试环境已配置为支持原生 ES Modules。

- **测试命令**: `npm test`
- **核心配置**: `package.json` 中的 `jest` 配置项通过 `"transform": {}` 禁用了代码转译，让 Jest 直接在 Node.js 环境中运行原生 ESM 测试代码。

在编写测试时，所有 ESM 的规则（例如，导入时包含文件扩展名）同样适用。
