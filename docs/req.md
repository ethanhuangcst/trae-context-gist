# samectx 需求文档

## 项目概述

**samectx** 是一个上下文管理工具，用于在使用 TRAE、Cursor、Claude Code 等 AI 工具时，整理对话上下文并保存到本地目录，支持多用户协作。

## 技术方案

采用 **SKILL + npm 双方案**：
- **SKILL (skill-samectx)**：智能提示器，在适当时机提醒用户同步
- **npm (npm-samectx)**：功能执行器，提供实际的同步功能

### 多用户协作方案

采用 **用户子目录 + Git 同步**：
- 每个用户的笔记保存在独立子目录：`samectx-notes/{username}/`
- 笔记目录提交到 Git，支持跨设备同步
- 通过用户子目录实现隔离，避免冲突

**目录结构**：
```
project-a/
└── samectx-notes/           # 提交到 Git
    ├── ethan/               # 用户 ethan 的笔记
    │   ├── context_2026-03-23.md
    │   └── ...
    ├── alice/               # 用户 alice 的笔记
    │   ├── context_2026-03-23.md
    │   └── ...
    └── bob/                 # 用户 bob 的笔记
        ├── context_2026-03-23.md
        └── ...
```

---

## 用户故事与验收标准

### US-1: 上下文保存

#### 用户故事

```
作为一个 AI 工具用户
我想要保存当前项目的对话上下文到本地目录
以便在需要时回顾和恢复工作上下文
```

#### 验收标准

```gherkin
Scenario: 成功保存上下文到本地目录
  Given 用户 "ethan" 在项目目录 "project-a" 中
  When 用户执行命令 "samectx sync"
  Then 对话上下文被保存到本地 "samectx-notes/ethan/" 目录
  And 笔记文件名包含时间戳
  And 显示成功消息 "上下文已成功保存到 samectx-notes/ethan/<filename>"
  And 成功消息包含文件路径和文件大小

Scenario: 保存失败时显示错误消息
  Given 用户 "ethan" 在项目目录 "project-a" 中
  And "samectx-notes/" 目录权限不足或磁盘空间不足
  When 用户执行命令 "samectx sync"
  Then 显示错误消息 "保存失败：<错误原因>"
  And 错误消息包含具体的失败原因
  And 提示用户检查目录权限或磁盘空间

Scenario: 笔记目录不存在时自动创建
  Given 用户 "ethan" 在项目目录 "project-a" 中
  And "samectx-notes/" 目录不存在
  When 用户执行命令 "samectx sync"
  Then 自动创建 "samectx-notes/ethan/" 目录
  And 对话上下文被保存到新创建的用户专属目录
  And 显示成功消息包含创建目录的信息
```

---

### US-2: 多项目支持

#### 用户故事

```
作为一个在多个项目间切换的用户
我想要为不同项目分别管理上下文笔记
以便保持项目间的上下文隔离
```

#### 验收标准

```gherkin
Scenario: 自动识别当前项目名称
  Given 用户 "ethan" 在项目目录 "/path/to/project-a" 中
  When 用户执行命令 "samectx sync"
  Then 项目名称被识别为 "project-a"
  And 笔记保存在 "/path/to/project-a/samectx-notes/ethan/"
  And 显示成功消息包含项目名称和用户名

Scenario: 使用 -p 参数指定项目名称
  Given 用户 "ethan" 在任意目录中
  When 用户执行命令 "samectx sync --project my-project"
  Then 项目名称被设置为 "my-project"
  And 笔记保存在当前目录的 "samectx-notes/ethan/" 中
  And 笔记文件名包含项目名称 "my-project"

Scenario: 使用 -d 参数指定笔记目录
  Given 用户 "ethan" 想要自定义笔记存储位置
  When 用户执行命令 "samectx sync --dir /custom/notes/path"
  Then 笔记被保存到 "/custom/notes/path/ethan/" 目录
  And 项目名称仍从当前目录提取

Scenario: 项目名称包含特殊字符时自动清理
  Given 用户 "ethan" 在项目目录 "/path/to/my-project@2024" 中
  When 用户执行命令 "samectx sync"
  Then 项目名称被清理为 "my-project_2024"
  And 非字母数字字符被替换为下划线
  And 笔记保存在 "/path/to/my-project_2024/samectx-notes/ethan/"
```

---

### US-3: 多用户协作

#### 用户故事

```
作为一个在团队中协作的用户
我想要我的笔记与其他协作者的笔记隔离
以便避免冲突和保护个人工作上下文
```

#### 验收标准

```gherkin
Scenario: 自动创建用户子目录
  Given 用户 "ethan" 在项目目录中
  And "samectx-notes/" 目录不存在
  When 用户执行命令 "samectx sync"
  Then 创建 "samectx-notes/ethan/" 目录
  And 笔记保存在用户专属目录中
  And 显示成功消息包含用户名

Scenario: 不同用户的笔记隔离
  Given 用户 "ethan" 已保存笔记到 "samectx-notes/ethan/"
  And 用户 "alice" 在同一项目中
  When 用户 "alice" 执行命令 "samectx sync"
  Then 创建 "samectx-notes/alice/" 目录
  And alice 的笔记保存在独立目录中
  And 不会与 ethan 的笔记冲突

Scenario: 笔记提交到 Git
  Given 用户保存了笔记
  When 用户执行 "git status"
  Then 显示 "samectx-notes/{username}/" 目录下的新文件
  And 用户可以提交笔记到 Git
  And 笔记可以通过 Git 同步到其他设备

Scenario: 跨设备同步笔记
  Given 用户在设备 A 保存了笔记并提交到 Git
  When 用户在设备 B 拉取 Git 更新
  Then 笔记同步到设备 B
  And 用户可以在设备 B 继续工作

Scenario: 配置文件用户名优先级最高
  Given 用户已配置用户名 "custom-name"
  And 配置文件 "~/.samectx/config.json" 包含 "username": "custom-name"
  When 用户执行命令 "samectx sync"
  Then 使用配置文件中 "custom-name" 作为用户名
  And 创建 "samectx-notes/custom-name/" 目录

Scenario: Git 配置用户名作为默认
  Given 用户未配置配置文件用户名
  And 用户已配置 Git 用户名 "gituser"
  When 用户执行命令 "samectx sync"
  Then 使用 Git 配置中的 "gituser" 作为用户名
  And 显示提示信息建议保存到配置文件
  And 创建 "samectx-notes/gituser/" 目录

Scenario: 环境变量用户名
  Given 用户未配置配置文件用户名
  And 用户未配置 Git 用户名
  And 用户设置环境变量 "SAMECTX_USER=envuser"
  When 用户执行命令 "samectx sync"
  Then 使用环境变量中的 "envuser" 作为用户名
  And 创建 "samectx-notes/envuser/" 目录

Scenario: 系统用户名作为兜底
  Given 用户未配置任何用户名
  When 用户执行命令 "samectx sync"
  Then 使用系统用户名作为默认
  And 显示警告提示建议配置 Git 用户名
  And 创建 "samectx-notes/{sysuser}/" 目录

Scenario: 用户名包含特殊字符时自动清理
  Given 用户名包含特殊字符 "ethan@work"
  When 系统识别用户名
  Then 用户名被清理为 "ethan_work"
  And 非字母数字字符被替换为下划线
  And 创建清理后的用户子目录

Scenario: 使用 config 命令设置用户名
  Given 用户想要永久设置用户名
  When 用户执行命令 "samectx config --username ethan"
  Then 用户名被保存到 "~/.samectx/config.json"
  And 显示成功消息 "用户名已设置为 ethan"
  And 后续同步命令将使用该用户名
```

---

### US-4: SKILL 智能提示
---

### US-4: SKILL 智能提示

#### 用户故事

```
作为一个 TRAE 用户
我想要在需要同步上下文时收到智能提示
以便不会忘记同步操作
```

#### 验收标准

```gherkin
Scenario: 检测到同步需求时触发 SKILL
  Given 用户在 TRAE 中工作
  And 用户提到 "同步上下文" 或 "多设备" 或 "跨设备"
  When SKILL skill-samectx 被触发
  Then 显示安装引导（如果 samectx 未安装）
  Or 显示同步提示（如果 samectx 已安装）
  And 提示包含具体的命令示例

Scenario: 首次使用时显示安装引导
  Given 用户首次触发 SKILL
  And samectx npm 包未安装
  When SKILL 显示 install.md 内容
  Then 包含安装命令 "npm install -g samectx"
  And 包含基本使用命令
  And 包含快速开始指南

Scenario: 已安装时显示同步提示
  Given samectx npm 包已安装
  And 用户触发 SKILL
  When SKILL 显示 sync.md 内容
  Then 提示用户执行 "samectx sync"
  And 提示使用 "-p" 参数指定项目名称
  And 提示使用 "-d" 参数指定笔记目录
  And 包含故障排除信息
```

---

### US-5: 项目识别与切换

#### 用户故事

```
作为一个在多个项目间工作的用户
我想要在不同项目中正确识别和同步上下文
以便每个项目的上下文保持独立
```

#### 验收标准

```gherkin
Scenario: 在项目目录中执行命令（推荐方式）
  Given 用户 "ethan" 在项目 "project-a" 的根目录中
  When 用户执行命令 "samectx sync"
  Then 项目名称自动识别为 "project-a"
  And 笔记保存到 "./samectx-notes/ethan/" 目录
  And 显示成功消息包含项目名称 "project-a" 和用户名 "ethan"

Scenario: 在全局终端中指定项目名称
  Given 用户 "ethan" 在全局终端中（不在项目目录）
  When 用户执行命令 "samectx sync --project project-a"
  Then 项目名称设置为 "project-a"
  And 笔记保存到当前目录的 "samectx-notes/ethan/" 目录
  And 显示成功消息包含项目名称 "project-a"

Scenario: 切换项目后正确识别新项目
  Given 用户 "ethan" 之前在 "project-a" 中同步过上下文
  When 用户切换到 "project-b" 目录
  And 用户执行命令 "samectx sync"
  Then 项目名称识别为 "project-b"
  And 笔记保存到 "project-b/samectx-notes/ethan/" 目录
  And 不会与 "project-a" 的笔记混淆

Scenario: 查看特定项目的笔记列表
  Given 存在多个项目的笔记
  When 用户执行命令 "samectx list --project project-a"
  Then 只显示 "project-a" 的笔记
  And 不显示其他项目的笔记
```

---

### US-6: 配置管理

#### 用户故事

```
作为一个用户
我想要配置默认的笔记保存位置
以便统一管理所有项目的上下文笔记
```

#### 验收标准

```gherkin
Scenario: 配置默认笔记目录
  Given 用户想要设置统一的笔记存储位置
  When 用户执行命令 "samectx config --dir /path/to/notes"
  Then 默认笔记目录被保存到 "~/.samectx/config.json"
  And 显示成功消息 "默认笔记目录已设置为 /path/to/notes"

Scenario: 查看当前配置
  Given 用户已配置默认笔记目录
  When 用户执行命令 "samectx config --show"
  Then 显示配置文件路径
  And 显示默认笔记目录
  And 显示其他配置项

Scenario: 配置文件不存在时自动创建
  Given 用户首次使用 samectx
  And "~/.samectx/" 目录不存在
  When 用户执行配置命令
  Then 自动创建 "~/.samectx/" 目录
  And 自动创建 "config.json" 文件
  And 配置被正确保存
```

---

### US-7: 笔记管理

#### 用户故事

```
作为一个用户
我想要查看和管理同步的笔记
以便快速找到需要的上下文信息
```

#### 验收标准

```gherkin
Scenario: 列出所有笔记
  Given 存在多个笔记文件
  When 用户执行命令 "samectx list"
  Then 显示所有笔记的列表
  And 每个笔记显示文件名、项目名称、时间戳
  And 按时间倒序排列

Scenario: 显示所有笔记
  Given 存在多个笔记文件
  When 用户执行命令 "samectx list"
  Then 显示所有笔记的列表
  And 每个笔记显示文件名、项目名称、时间戳
  And 按时间倒序排列

Scenario: 筛选特定项目的笔记
  Given 存在多个项目的笔记
  When 用户执行命令 "samectx list --project project-a"
  Then 只显示 "project-a" 的笔记
  And 不显示其他项目的笔记

Scenario: 笔记包含摘要信息
  Given 笔记包含分析结果
  When 用户查看笔记列表
  Then 每个笔记显示摘要信息
  And 摘要包含任务数量、关键点数量、决策数量
```

---

### US-8: 项目初始化

#### 用户故事

```
作为一个新用户
我想要快速初始化项目配置
以便开始使用同步功能
```

#### 验收标准

```gherkin
Scenario: 初始化项目配置
  Given 用户 "ethan" 在新项目中
  When 用户执行命令 "samectx init"
  Then 创建 "samectx-notes/" 目录（如果不存在）
  And 创建 ".env.example" 文件（如果不存在）
  And 显示下一步操作提示

Scenario: 显示初始化后的下一步
  Given 用户执行了初始化命令
  When 初始化完成
  Then 提示开始同步的命令
  And 提示使用 Git 提交笔记
  And 提示跨设备同步方法

Scenario: 目录已存在时不报错
  Given "samectx-notes/" 目录已存在
  When 用户 "ethan" 执行命令 "samectx init"
  Then 显示 "笔记目录已存在"
  And 不创建重复目录
  And 继续执行其他初始化步骤
```

---

## 非功能性需求

### 性能要求

```gherkin
Scenario: 同步操作在合理时间内完成
  Given 对话上下文大小不超过 1MB
  When 用户执行同步命令
  Then 本地保存操作在 1 秒内完成
  And Gist 上传操作在 5 秒内完成（网络正常情况下）
```

### 安全要求

```gherkin
Scenario: 笔记文件安全存储
  Given 用户保存上下文笔记
  When 笔记被保存到本地目录
  Then 笔记文件存储在本地文件系统中
  And 笔记不会被上传到外部服务器
  And 笔记文件权限设置为仅用户可读写
  And 配置文件权限设置为仅用户可读写
```

### 兼容性要求

```gherkin
Scenario: 跨平台支持
  Given 用户在 Windows/macOS/Linux 系统上
  When 用户安装并使用 samectx
  Then 所有功能正常工作
  And 文件路径正确处理
  And 命令行参数正确解析

Scenario: Node.js 版本兼容
  Given 用户使用 Node.js 14.0.0 或更高版本
  When 用户运行 samectx
  Then 所有功能正常工作
  And 不使用 Node.js 14 不支持的特性
```

---

## 技术约束

### 依赖约束

- Node.js >= 14.0.0
- npm 包依赖：
  - chalk ^4.1.2
  - commander ^11.0.0
  - node-fetch ^2.7.0

### 存储约束

- 本地笔记存储在项目目录下的 `samectx-notes/`
- 全局配置存储在 `~/.samectx/`
- 单个笔记文件大小限制：10MB
- 笔记文件格式：Markdown (.md)

---

## 术语表

| 术语 | 定义 |
|------|------|
| 上下文 | AI 工具中的对话历史，包括任务、关键点、决策等信息 |
| 保存 | 将对话上下文保存到本地文件的过程 |
| 项目 | 用户当前工作的代码仓库或工作目录 |
| 笔记 | 保存后存储的结构化上下文信息 |
| SKILL | TRAE 中的技能模块，用于提供智能提示 |
| AC | Acceptance Criteria，验收标准 |

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| 1.1.0 | 2026-03-23 | 移除 Gist 同步功能，专注于本地保存；添加成功/失败消息确认 | ethanhuangcst |
| 1.0.0 | 2026-03-23 | 初始版本，包含核心用户故事和验收标准 | ethanhuangcst |

---

## 附录：命令参考

### 同步命令

```bash
# 基本同步
samectx sync

# 指定项目名称（推荐用于跨项目场景）
samectx sync --project project-a
samectx sync -p project-a

# 指定笔记目录
samectx sync --dir /path/to/notes
samectx sync -d /path/to/notes

# 简写形式
samectx s
```

### 列表命令

```bash
# 列出所有笔记
samectx list

# 筛选特定项目
samectx list --project project-a

# 只显示本地笔记
samectx list --local

# 简写形式
samectx l
```

### 配置命令

```bash
# 配置默认笔记目录
samectx config --dir /path/to/notes

# 查看配置
samectx config --show

# 简写形式
samectx c
```

### 初始化命令

```bash
# 初始化项目
samectx init

# 简写形式
samectx i
```

---

## 附录：SKILL 触发关键词

SKILL `skill-samectx` 会在以下关键词出现时触发：

- 保存上下文
- 上下文保存
- 备份上下文
- 上下文备份
- 导出上下文
- 保存对话
- 备份对话

---

## 附录：故障排除

### 常见问题

1. **项目名称识别错误**
   - 确保在项目目录中执行命令
   - 或使用 `-p` 参数明确指定项目名称

2. **笔记保存失败**
   - 检查目录权限
   - 检查磁盘空间
   - 使用 `-d` 参数指定其他目录

3. **笔记位置错误**
   - 检查当前工作目录
   - 使用 `-d` 参数指定目录
   - 查看配置文件中的默认目录设置
