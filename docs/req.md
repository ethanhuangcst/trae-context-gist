# samectx 需求文档

## 项目概述

**samectx** 是一个上下文管理工具，用于在使用 TRAE、Cursor、Claude Code 等 AI 工具时，整理对话上下文并保存到本地目录，支持多用户协作。

## 技术方案

采用 **SKILL + npm 双方案**：
- **SKILL (skill-samectx)**：分析对话，提取关键信息，生成命令
- **npm (npm-samectx)**：接收参数，保存结构化笔记

### 多用户协作方案

采用 **用户子目录 + Git 同步**：
- 每个用户的笔记保存在独立子目录：`samectx-notes/{username}/`
- 笔记目录提交到 Git，支持跨设备同步
- 通过用户子目录实现隔离，避免冲突

---

## 用户故事与验收标准

### US-1: 上下文保存

```gherkin
Scenario: 成功保存上下文到本地目录
  Given 用户 "ethan" 在项目目录 "project-a" 中
  When 用户执行命令 "samectx sync"
  Then 对话上下文被保存到本地 "samectx-notes/ethan/" 目录
  And 笔记文件名包含时间戳
  And 显示成功消息包含文件路径和文件大小

Scenario: 保存失败时显示错误消息
  Given 用户 "ethan" 在项目目录 "project-a" 中
  And "samectx-notes/" 目录权限不足或磁盘空间不足
  When 用户执行命令 "samectx sync"
  Then 显示错误消息 "保存失败：<错误原因>"
  And 提示用户检查目录权限或磁盘空间
```

---

### US-2: 多项目支持

```gherkin
Scenario: 自动识别当前项目名称
  Given 用户 "ethan" 在项目目录 "/path/to/project-a" 中
  When 用户执行命令 "samectx sync"
  Then 项目名称被识别为 "project-a"
  And 笔记保存在 "/path/to/project-a/samectx-notes/ethan/"

Scenario: 使用 -p 参数指定项目名称
  Given 用户 "ethan" 在任意目录中
  When 用户执行命令 "samectx sync --project my-project"
  Then 项目名称被设置为 "my-project"

Scenario: 使用 -d 参数指定笔记目录
  Given 用户 "ethan" 想要自定义笔记存储位置
  When 用户执行命令 "samectx sync --dir /custom/notes/path"
  Then 笔记被保存到 "/custom/notes/path/ethan/" 目录
```

---

### US-3: 多用户协作

```gherkin
Scenario: 自动创建用户子目录
  Given 用户 "ethan" 在项目目录中
  When 用户执行命令 "samectx sync"
  Then 创建 "samectx-notes/ethan/" 目录
  And 显示成功消息包含用户名

Scenario: 不同用户的笔记隔离
  Given 用户 "ethan" 已保存笔记到 "samectx-notes/ethan/"
  When 用户 "alice" 执行命令 "samectx sync"
  Then 创建 "samectx-notes/alice/" 目录
  And 不会与 ethan 的笔记冲突

Scenario: 用户名识别优先级
  Given 用户名来源优先级为：配置文件 > Git 配置 > 环境变量 > 系统用户名
  When 用户执行命令 "samectx sync"
  Then 按优先级顺序识别用户名
  And 创建对应用户子目录
```

---

### US-4: SKILL 智能提示

```gherkin
Scenario: SKILL 分析对话并提取关键信息
  Given 用户在 TRAE 中进行对话
  And 对话中包含关键任务、关键点、关键决策
  When 用户触发 SKILL 同步功能
  Then SKILL 分析对话内容
  And 提取关键任务、关键点、关键决策
  And 生成包含参数的命令
```

---

### US-5: 配置管理

```gherkin
Scenario: 配置用户名
  Given 用户想要永久设置用户名
  When 用户执行命令 "samectx config --username ethan"
  Then 用户名被保存到 "~/.samectx/config.json"
  And 后续同步命令将使用该用户名

Scenario: 配置默认笔记目录
  Given 用户想要设置统一的笔记存储位置
  When 用户执行命令 "samectx config --dir /path/to/notes"
  Then 默认笔记目录被保存到配置文件

Scenario: 查看当前配置
  Given 用户已配置
  When 用户执行命令 "samectx config --show"
  Then 显示配置文件路径、用户名、默认笔记目录
```

---

### US-6: 笔记管理

```gherkin
Scenario: 列出所有笔记
  Given 存在多个笔记文件
  When 用户执行命令 "samectx list"
  Then 显示所有笔记的列表
  And 每个笔记显示文件名、项目名称、时间戳、摘要
  And 按时间倒序排列

Scenario: 筛选特定项目的笔记
  Given 存在多个项目的笔记
  When 用户执行命令 "samectx list --project project-a"
  Then 只显示 "project-a" 的笔记
```

---

### US-7: 项目初始化

```gherkin
Scenario: 初始化项目配置
  Given 用户 "ethan" 在新项目中
  When 用户执行命令 "samectx init"
  Then 显示用户名和用户名来源
  And 创建 "samectx-notes/{username}/" 目录（如果不存在）
  And 显示下一步操作提示
```

---

### US-8: 关键信息记录

```gherkin
Scenario: npm-samectx 接收关键信息参数
  Given SKILL 生成了包含关键信息的命令
  When 用户执行命令 "samectx sync --tasks '任务1;任务2' --keypoints '关键点1' --decisions '决策1'"
  Then 笔记文件包含 tasks、keyPoints、decisions 数组
  And 显示成功消息包含任务数量、关键点数量、决策数量

Scenario: 无参数时提示用户
  Given 用户执行命令 "samectx sync"
  And 没有传入任何内容参数
  Then 创建基本笔记记录
  And 显示提示信息引导用户使用 SKILL 或传入参数
```

---

## 非功能性需求

### 性能要求

```gherkin
Scenario: 同步操作在合理时间内完成
  Given 对话上下文大小不超过 1MB
  When 用户执行同步命令
  Then 本地保存操作在 1 秒内完成
```

### 安全要求

```gherkin
Scenario: 笔记文件安全存储
  Given 用户保存上下文笔记
  When 笔记被保存到本地目录
  Then 笔记文件存储在本地文件系统中
  And 笔记不会被上传到外部服务器
```

### 兼容性要求

```gherkin
Scenario: 跨平台支持
  Given 用户在 Windows/macOS/Linux 系统上
  When 用户安装并使用 samectx
  Then 所有功能正常工作

Scenario: Node.js 版本兼容
  Given 用户使用 Node.js 14.0.0 或更高版本
  When 用户运行 samectx
  Then 所有功能正常工作
```

---

## 技术约束

### 依赖约束

- Node.js >= 14.0.0
- npm 包依赖：
  - chalk ^4.1.2
  - commander ^11.0.0

### 存储约束

- 本地笔记存储在项目目录下的 `samectx-notes/`
- 全局配置存储在 `~/.samectx/`
- 笔记文件格式：JSON (.json)

---

## 术语表

| 术语 | 定义 |
|------|------|
| 上下文 | AI 工具中的对话历史，包括任务、关键点、决策等信息 |
| 保存 | 将对话上下文保存到本地文件的过程 |
| 项目 | 用户当前工作的代码仓库或工作目录 |
| 笔记 | 保存后存储的结构化上下文信息 |
| SKILL | TRAE 中的技能模块，用于分析对话并生成命令 |

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| 1.2.0 | 2026-03-23 | 添加 US-8 关键信息记录，支持 SKILL + npm 协作模式 | ethanhuangcst |
| 1.1.0 | 2026-03-23 | 移除 Gist 同步功能，专注于本地保存 | ethanhuangcst |
| 1.0.0 | 2026-03-23 | 初始版本 | ethanhuangcst |
