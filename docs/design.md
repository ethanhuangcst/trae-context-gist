# samectx 技术设计文档

## 技术架构

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  CLI     │  │  SKILL   │  │  Config  │  │  Init   │ │
│  │ Commands │  │  Trigger │  │  Wizard  │  │  Setup  │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                  Core Layer (src/index.js)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Config  │  │  Local   │  │ Context │ │
│  │  Manager │  │  Storage │  │ Analyzer│ │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                 External Services                        │
│  ┌──────────┐  ┌──────────┐                            │
│  │  Local   │  │  File    │                            │
│  │  FS      │  │  System  │                            │
│  └──────────┘  └──────────┘                            │
└─────────────────────────────────────────────────────────┘
```

### 双方案架构

```
┌─────────────────┐
│   TRAE SKILL    │  智能提示器
│  (skill-samectx)│  - 检测用户需求
│                 │  - 提供命令提示
└────────┬────────┘
         │ 提示用户
         ↓
┌─────────────────┐
│   npm Package   │  功能执行器
│  (npm-samectx)  │  - 执行保存命令
│                 │  - 管理本地文件
│                 │  - 支持多用户协作
└─────────────────┘
```

### 多用户协作架构

```
┌─────────────────────────────────────┐
│         Git Repository              │
│  project-a/                         │
│  └── samectx-notes/                 │
│      ├── ethan/                     │
│      │   └── context_*.md           │
│      ├── alice/                     │
│      │   └── context_*.md           │
│      └── bob/                       │
│          └── context_*.md           │
└─────────────────────────────────────┘
         ↑                    ↓
    git pull              git push
         ↓                    ↑
┌─────────────────────────────────────┐
│         用户本地环境                │
│  - 自动识别用户名                   │
│  - 创建用户专属目录                 │
│  - 笔记提交到 Git                   │
│  - 支持跨设备同步                   │
└─────────────────────────────────────┘
```

---

## 核心模块设计

### 1. CLI 模块 (bin/samectx)

**职责**：命令行入口，解析用户输入

**技术栈**：
- `commander`: 命令行参数解析
- `chalk`: 终端输出美化

**命令设计**：

```javascript
samectx sync [options]    // 保存上下文
  -p, --project <name>    // 指定项目名称
  -d, --dir <path>        // 指定笔记目录

samectx list [options]    // 列出笔记
  -p, --project <name>    // 筛选项目

samectx config [options]  // 配置管理
  -d, --dir <path>        // 设置默认笔记目录
  -s, --show              // 显示配置

samectx init              // 初始化项目
```

### 2. 核心模块 (src/index.js)

**职责**：核心业务逻辑实现

**主要功能**：

#### 2.1 配置管理

```javascript
// 配置目录
~/.samectx/
└── config.json          // 全局配置

// 配置文件结构
{
  "defaultNotesDir": "/path/to/notes",
  "version": "1.0.0"
}
```

#### 2.2 项目识别

```javascript
function extractProjectName(customName) {
  if (customName) {
    return customName.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  const cwd = process.cwd();  // 当前工作目录
  let projectName = path.basename(cwd);
  return projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
}
```

**识别逻辑**：
1. 优先使用 `-p` 参数指定的项目名称
2. 否则从 `process.cwd()` 提取当前目录名
3. 清理特殊字符，只保留字母、数字、下划线、连字符

#### 2.3 笔记目录管理

```javascript
function getProjectNotesDir(customDir) {
  // 1. 确定基础目录
  let baseDir;
  if (customDir) {
    // 优先使用 -d 参数指定的目录
    baseDir = path.isAbsolute(customDir) 
      ? customDir 
      : path.join(process.cwd(), customDir);
  } else if (process.env.LOCAL_NOTES_DIR) {
    // 其次使用环境变量
    baseDir = path.isAbsolute(process.env.LOCAL_NOTES_DIR)
      ? process.env.LOCAL_NOTES_DIR
      : path.join(process.cwd(), process.env.LOCAL_NOTES_DIR);
  } else {
    // 默认：当前目录下的 samectx-notes/
    baseDir = path.join(process.cwd(), 'samectx-notes');
  }
  
  // 2. 添加用户子目录
  const username = os.userInfo().username;
  return path.join(baseDir, username);
}
```

**目录层级**：
```
project-a/
└── samectx-notes/           # 基础目录
    └── ethan/               # 用户子目录
        ├── context_2026-03-23T10-30.md
        └── ...
```

**用户名识别优先级**：
1. 系统用户名：`os.userInfo().username`
2. 环境变量：`process.env.USER` 或 `process.env.USERNAME`
3. Git 配置：`git config user.name`（备选方案）

#### 2.4 上下文分析

```javascript
function analyzeContext(conversationHistory) {
  const keyPoints = [];
  const tasks = [];
  const decisions = [];
  
  // 尝试解析 JSON 格式
  try {
    const jsonData = JSON.parse(conversationHistory);
    // 提取任务、关键点、决策
  } catch (e) {
    // 解析文本格式
  }
  
  return {
    summary: `对话包含 ${tasks.length} 个任务、${keyPoints.length} 个关键点和 ${decisions.length} 个决策`,
    keyPoints,
    tasks,
    decisions,
    rawContent: conversationHistory,
    timestamp: new Date().toISOString(),
    metadata: {
      version: '1.0.0',
      tool: 'samectx',
      format: 'json' | 'text'
    }
  };
}
```

#### 2.5 本地文件保存

```javascript
async function saveToLocal(content, fileName, notesDir) {
  // 1. 确保目录存在
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }
  
  // 2. 生成文件路径
  const filePath = path.join(notesDir, fileName);
  
  // 3. 写入文件
  await fs.promises.writeFile(filePath, content, 'utf8');
  
  // 4. 获取文件大小
  const stats = await fs.promises.stat(filePath);
  
  return {
    success: true,
    path: filePath,
    size: stats.size
  };
}
```

### 3. CLI 实现模块 (src/cli.js)

**职责**：命令行交互逻辑

**主要功能**：

```javascript
async function sync(options) {
  // 1. 显示进度
  console.log(chalk.blue('📦 正在保存上下文...'));
  
  // 2. 调用核心功能
  const result = await core.sync(options);
  
  // 3. 显示结果
  if (result.success) {
    console.log(chalk.green('✅ 保存成功！'));
    console.log(`   项目名称: ${result.projectName}`);
    console.log(`   本地路径: ${result.localPath}`);
    console.log(`   文件大小: ${result.fileSize} bytes`);
  } else {
    console.log(chalk.red(`❌ 保存失败: ${result.error}`));
    console.log(chalk.yellow(`   建议: ${result.suggestion}`));
  }
}
```

---

## 数据流

### 保存流程

```
用户执行命令
    ↓
CLI 解析参数
    ↓
提取项目名称
    ↓
分析上下文
    ↓
保存到本地
    ↓
返回结果
```

### 详细流程图

```
┌─────────────┐
│ samectx sync│
└──────┬──────┘
       │
       ↓
┌─────────────────┐
│ 解析参数         │
│ -p project-name │
│ -d notes-dir    │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ 提取项目名称     │
│ 1. -p 参数      │
│ 2. cwd 路径     │
│ 3. 清理字符     │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ 确定笔记目录     │
│ 1. -d 参数      │
│ 2. 环境变量     │
│ 3. 默认目录     │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ 分析上下文       │
│ - 提取任务       │
│ - 提取关键点     │
│ - 提取决策       │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ 保存到本地       │
│ samectx-notes/  │
│ context_xxx.md  │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ 返回结果         │
│ - 文件路径       │
│ - 文件大小       │
│ - 成功消息       │
└─────────────────┘
```

---

## npm 发布过程

### 1. 准备工作

#### 1.1 检查 package.json

```json
{
  "name": "samectx",
  "version": "1.0.0",
  "description": "Context management tool - 整理对话上下文并保存到本地目录",
  "main": "src/index.js",
  "bin": {
    "samectx": "./bin/samectx"
  },
  "files": [
    "bin",
    "src",
    ".env.example"
  ],
  "keywords": [
    "context",
    "notes",
    "save",
    "cli",
    "trae"
  ],
  "author": "ethanhuangcst",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/ethanhuangcst/npm-samectx"
  },
  "dependencies": {
    "chalk": "^4.1.2",
    "commander": "^11.0.0"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

**关键字段说明**：
- `name`: npm 包名，必须唯一
- `version`: 语义化版本号
- `bin`: 定义可执行命令
- `files`: 发布时包含的文件
- `main`: 模块入口文件

#### 1.2 创建 .npmignore（可选）

```
# 开发文件
docs/
*.md
!README.md

# 测试文件
test/
*.test.js

# 配置文件
.env
.env.local

# IDE
.vscode/
.idea/

# 其他
.git/
node_modules/
*.log
```

#### 1.3 更新 README.md

确保包含：
- 安装说明
- 使用示例
- API 文档
- 故障排除

### 2. 发布流程

#### 2.1 登录 npm

```bash
# 登录 npm 账号
npm login

# 输入用户名、密码、邮箱
Username: ethanhuangcst
Password: ********
Email: your-email@example.com

# 验证登录状态
npm whoami
```

#### 2.2 检查包名是否可用

```bash
# 检查包名是否已被占用
npm search samectx

# 或访问
https://www.npmjs.com/package/samectx
```

#### 2.3 版本管理

```bash
# 更新补丁版本 (1.0.0 -> 1.0.1)
npm version patch

# 更新次版本 (1.0.0 -> 1.1.0)
npm version minor

# 更新主版本 (1.0.0 -> 2.0.0)
npm version major
```

#### 2.4 发布

```bash
# 发布到 npm
npm publish

# 发布到指定 registry（如需）
npm publish --registry https://registry.npmjs.org/

# 发布 beta 版本
npm publish --tag beta
```

#### 2.5 验证发布

```bash
# 搜索发布的包
npm search samectx

# 查看包信息
npm info samectx

# 全局安装测试
npm install -g samectx

# 测试命令
samectx --version
samectx --help
```

### 3. 发布后维护

#### 3.1 更新包

```bash
# 1. 修改代码
# 2. 更新版本号
npm version patch

# 3. 发布
npm publish
```

#### 3.2 撤销发布（24小时内）

```bash
# 撤销指定版本
npm unpublish samectx@1.0.0

# 撤销整个包（谨慎使用）
npm unpublish samectx --force
```

#### 3.3 弃用版本

```bash
# 弃用指定版本
npm deprecate samectx@1.0.0 "This version has critical bugs"

# 弃用整个包
npm deprecate samectx "This package is no longer maintained"
```

---

## 目录结构

### npm-samectx 项目结构

```
npm-samectx/
├── bin/
│   └── samectx              # CLI 入口（可执行文件）
├── src/
│   ├── cli.js               # CLI 命令实现
│   └── index.js             # 核心功能实现
├── docs/
│   ├── req.md               # 需求文档
│   └── design.md            # 技术设计文档（本文件）
├── .env.example             # 环境变量示例
├── .gitignore               # Git 忽略配置
├── README.md                # 项目文档
├── package.json             # npm 配置
└── package-lock.json        # 依赖锁定
```

### 用户本地目录结构

```
~/.samectx/                  # 全局配置目录
└── config.json              # 全局配置文件

project-a/                   # 项目目录
└── samectx-notes/           # 笔记目录（提交到 Git）
    ├── ethan/               # 用户 ethan 的笔记
    │   ├── context_2026-03-23T10-30-00-000Z.md
    │   ├── context_2026-03-23T11-45-30-000Z.md
    │   └── ...
    ├── alice/               # 用户 alice 的笔记
    │   ├── context_2026-03-23T10-15-00-000Z.md
    │   └── ...
    └── bob/                 # 用户 bob 的笔记
        ├── context_2026-03-23T14-20-00-000Z.md
        └── ...
```

**说明**：
- 每个用户的笔记保存在独立子目录中
- 笔记目录提交到 Git，支持跨设备同步
- 通过用户子目录实现隔离，避免冲突

---

## 依赖说明

### 生产依赖

```json
{
  "chalk": "^4.1.2",        // 终端输出美化
  "commander": "^11.0.0"    // 命令行参数解析
}
```

**依赖选择原因**：

1. **chalk**
   - 提供丰富的终端颜色和样式
   - 版本 4.x 兼容 CommonJS
   - 轻量级，无依赖

2. **commander**
   - 完整的命令行解决方案
   - 支持子命令、选项、别名
   - 自动生成帮助文档

### 开发依赖

目前无开发依赖，建议添加：

```json
{
  "devDependencies": {
    "jest": "^29.0.0",           // 单元测试
    "eslint": "^8.0.0",          // 代码检查
    "prettier": "^3.0.0"         // 代码格式化
  }
}
```

### Node.js 版本要求

```json
{
  "engines": {
    "node": ">=14.0.0"
  }
}
```

**原因**：
- Node.js 14+ 支持 ES Modules
- 支持 `?.` 可选链操作符
- 支持 `??` 空值合并操作符
- 长期支持版本

---

## API 设计

### 内部 API

#### sync(options)

保存上下文到本地目录

```javascript
/**
 * @param {Object} options
 * @param {string} options.project - 项目名称（可选）
 * @param {string} options.dir - 笔记目录（可选）
 * @param {string} options.content - 对话内容（可选）
 * @returns {Promise<Object>} 保存结果
 */
async function sync(options) {
  return {
    success: boolean,
    projectName: string,
    localPath: string,
    fileSize: number,
    error: string | null,
    suggestion: string | null,
    analysis: {
      taskCount: number,
      keyPointCount: number,
      decisionCount: number
    }
  };
}
```

#### listNotes(options)

列出笔记

```javascript
/**
 * @param {Object} options
 * @param {string} options.project - 筛选项目（可选）
 * @returns {Array<Object>} 笔记列表
 */
function listNotes(options) {
  return [
    {
      fileName: string,
      localPath: string,
      projectName: string,
      timestamp: string,
      summary: string
    }
  ];
}
```

#### config(options)

配置管理

```javascript
/**
 * @param {Object} options
 * @param {string} options.dir - 默认笔记目录（可选）
 * @param {boolean} options.show - 显示配置（可选）
 */
async function config(options);
```

---

## 错误处理

### 错误类型

```javascript
// 目录权限错误
{
  success: false,
  error: '无法创建目录: permission denied',
  suggestion: '请检查目录权限或使用 -d 参数指定其他目录'
}

// 磁盘空间不足
{
  success: false,
  error: '磁盘空间不足',
  suggestion: '请清理磁盘空间或使用 -d 参数指定其他磁盘'
}

// 文件系统错误
{
  success: false,
  error: '文件写入失败: 文件系统只读',
  suggestion: '请检查文件系统状态或联系系统管理员'
}
```

### 错误处理策略

1. **友好提示**
   - 提供具体的错误原因
   - 提供解决方案建议
   - 提供相关文档链接

2. **日志记录**
   - 记录错误详情到本地
   - 不记录敏感信息

3. **自动恢复**
   - 目录不存在时自动创建
   - 提供配置文件默认值

---

## 性能优化

### 1. 文件写入优化

```javascript
// 使用异步写入
await fs.promises.writeFile(filePath, content, 'utf8');

// 大文件分块写入
if (content.length > 1024 * 1024) {
  const stream = fs.createWriteStream(filePath);
  stream.write(content);
  stream.end();
}
```

### 2. 目录检查优化

```javascript
// 缓存目录存在状态
const dirCache = new Set();

function ensureDir(dir) {
  if (dirCache.has(dir)) return;
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  dirCache.add(dir);
}
```

### 3. 文件大小限制

```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

if (content.length > MAX_FILE_SIZE) {
  // 截断内容或提示用户
  console.warn('内容过大，将截断保存');
  content = content.substring(0, MAX_FILE_SIZE);
}
```

---

## 测试策略

### 单元测试

```javascript
// 测试项目名称提取
test('extractProjectName with custom name', () => {
  expect(extractProjectName('my-project')).toBe('my-project');
});

test('extractProjectName from cwd', () => {
  process.cwd = jest.fn(() => '/path/to/project-a');
  expect(extractProjectName()).toBe('project-a');
});

// 测试上下文分析
test('analyzeContext with JSON', () => {
  const result = analyzeContext('{"tasks": ["task1"]}');
  expect(result.tasks).toContain('task1');
});

// 测试文件保存
test('saveToLocal creates file', async () => {
  const result = await saveToLocal('test content', 'test.md', '/tmp/notes');
  expect(result.success).toBe(true);
  expect(result.path).toContain('test.md');
});
```

### 集成测试

```javascript
// 测试完整保存流程
test('sync flow', async () => {
  const result = await sync({ project: 'test-project' });
  expect(result.success).toBe(true);
  expect(result.projectName).toBe('test-project');
  expect(result.localPath).toBeDefined();
});
```

### E2E 测试

```bash
# 测试 CLI 命令
samectx init
samectx config --dir /tmp/notes
samectx sync --project test-project
samectx list
```

---

## 部署清单

### 发布前检查

- [ ] 更新 package.json 版本号
- [ ] 更新 README.md 文档
- [ ] 运行测试（如有）
- [ ] 检查代码质量（eslint）
- [ ] 验证本地安装：`npm install -g .`
- [ ] 测试所有命令功能

### 发布步骤

- [ ] 登录 npm：`npm login`
- [ ] 发布：`npm publish`
- [ ] 验证发布：`npm info samectx`
- [ ] 测试安装：`npm install -g samectx`

### 发布后

- [ ] 创建 Git tag：`git tag v1.0.0`
- [ ] 推送 tag：`git push origin v1.0.0`
- [ ] 创建 GitHub Release
- [ ] 更新文档网站（如有）

---

## 维护指南

### 版本更新流程

1. 修改代码
2. 更新版本号：`npm version patch/minor/major`
3. 更新 CHANGELOG.md
4. 发布：`npm publish`
5. 创建 Git tag

### 依赖更新

```bash
# 检查过期依赖
npm outdated

# 更新依赖
npm update

# 更新主版本
npm install chalk@latest
```

### 安全审计

```bash
# 检查安全漏洞
npm audit

# 自动修复
npm audit fix
```

---

## 附录

### 相关链接

- **npm 包**: https://www.npmjs.com/package/samectx
- **GitHub 仓库**: https://github.com/ethanhuangcst/npm-samectx

### 技术栈

- **Runtime**: Node.js >= 14.0.0
- **Language**: JavaScript (CommonJS)
- **CLI Framework**: Commander.js
- **Terminal Styling**: chalk

### 许可证

MIT License

---

**文档版本**: 1.1.0  
**最后更新**: 2026-03-23  
**作者**: ethanhuangcst
