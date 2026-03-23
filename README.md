# samectx

Context management tool - 整理对话上下文并保存到本地目录，支持多用户协作

用于在使用 TRAE、Cursor、Claude Code 等 AI 工具时，整理对话上下文并保存到工程本地目录，支持多用户协作和跨设备同步。

## 核心理念：上下文即代码

**为什么上下文应该被看作代码的一部分？**

1. **开发决策记录**：记录架构决策、技术选型、重要约定
2. **知识传承**：帮助新成员快速了解项目背景和决策原因
3. **团队协作**：共享开发上下文，提高协作效率
4. **项目资产**：上下文是项目开发的重要辅助资料

**多用户协作方案**：
- 每个用户的笔记保存在独立子目录：`samectx-notes/{username}/`
- 笔记目录提交到 Git，支持跨设备同步
- 通过用户子目录实现隔离，避免冲突

## 安装

```bash
# 全局安装
npm install -g samectx

# 或使用 npx（无需安装）
npx samectx --help
```

## 命令参考

### `samectx init` (别名: `i`)

初始化项目配置，创建用户专属笔记目录。

```bash
samectx init
samectx i
```

**输出示例**：
```
🚀 初始化项目配置...

   用户名: ethan
   笔记目录: /path/to/project/samectx-notes/ethan
   ✅ 已创建用户专属笔记目录

✅ 初始化完成！

下一步:
   1. 同步上下文: samectx sync
   2. 查看笔记: samectx list
   3. 提交到 Git: git add samectx-notes/ && git commit -m "Add context notes"
```

---

### `samectx sync` (别名: `s`)

保存当前项目的对话上下文到本地目录。

```bash
samectx sync [options]
samectx s [options]
```

**参数列表**：

| 参数 | 简写 | 类型 | 说明 |
|------|------|------|------|
| `--project <name>` | `-p` | string | 指定项目名称（默认从当前目录提取） |
| `--dir <path>` | `-d` | string | 指定笔记存储目录 |
| `--tasks <list>` | `-t` | string | 关键任务列表（分号 `;` 分隔） |
| `--keypoints <list>` | `-k` | string | 关键点列表（分号 `;` 分隔） |
| `--decisions <list>` | `-D` | string | 关键决策列表（分号 `;` 分隔） |
| `--content <text>` | `-c` | string | 完整对话内容（自动分析提取） |

**使用示例**：

```bash
# 基本同步（创建基本记录）
samectx sync

# 指定项目名称
samectx sync -p my-project

# 传入关键信息（SKILL 生成的命令）
samectx sync --tasks "实现用户登录功能;修复登录页面样式" --keypoints "使用JWT进行认证" --decisions "选择bcrypt加密密码"

# 传入完整对话内容
samectx sync --content "用户要求实现登录功能，我们讨论了JWT和Session两种方案..."

# 组合使用
samectx sync -p my-project -d ./notes --tasks "任务1;任务2"
```

**输出示例**：
```
📦 正在保存上下文...
✅ 上下文已成功保存！
   项目名称: npm-samectx
   用户名: ethan
   本地路径: /path/to/project/samectx-notes/ethan/context_xxx.json
   文件大小: 1234 bytes
   📋 关键信息:
      任务: 3 个
      关键点: 2 个
      决策: 1 个
```

---

### `samectx list` (别名: `l`)

列出所有笔记。

```bash
samectx list [options]
samectx l [options]
```

**参数列表**：

| 参数 | 简写 | 类型 | 说明 |
|------|------|------|------|
| `--project <name>` | `-p` | string | 筛选指定项目的笔记 |

**使用示例**：

```bash
# 列出所有笔记
samectx list

# 筛选特定项目
samectx list -p my-project
```

**输出示例**：
```
📋 笔记列表:

1. context_2026-03-23T10-30-00-000Z.json
   项目: npm-samectx
   用户: ethan
   时间: 2026-03-23T10:30:00.000Z
   摘要: 对话包含 3 个任务、2 个关键点和 1 个决策
   关键信息: 3 任务, 2 关键点, 1 决策

共 1 条笔记
```

---

### `samectx config` (别名: `c`)

配置管理。

```bash
samectx config [options]
samectx c [options]
```

**参数列表**：

| 参数 | 简写 | 类型 | 说明 |
|------|------|------|------|
| `--username <name>` | `-u` | string | 设置用户名 |
| `--dir <path>` | `-d` | string | 设置默认笔记目录 |
| `--show` | `-s` | - | 显示当前配置 |

**使用示例**：

```bash
# 设置用户名
samectx config --username ethan

# 设置默认笔记目录
samectx config --dir /path/to/notes

# 显示当前配置
samectx config --show
```

**输出示例**：
```
📋 当前配置:

   配置目录: /Users/ethan/.samectx
   用户名: ethan
   默认笔记目录: /Users/ethan/projects/notes
```

---

## SKILL 集成

### 概述

samectx 支持与 TRAE SKILL 协作，实现智能上下文管理：

- **SKILL 职责**：分析对话内容，提取关键信息，生成命令
- **npm 职责**：接收参数，保存结构化笔记

### SKILL 调用方法

在 SKILL 中，分析对话后生成带参数的 `samectx sync` 命令：

```markdown
## 同步上下文

我已分析了当前对话，提取了以下关键信息：

**关键任务**：
1. 实现用户登录功能
2. 修复登录页面样式

**关键点**：
- 使用 JWT 进行认证

**关键决策**：
- 选择 bcrypt 加密密码

请执行以下命令保存上下文：

\`\`\`bash
samectx sync --tasks "实现用户登录功能;修复登录页面样式" --keypoints "使用JWT进行认证" --decisions "选择bcrypt加密密码"
\`\`\`
```

### SKILL 最佳实践

#### 1. 智能提取关键信息

SKILL 应自动识别对话中的：
- **关键任务**：待办事项、开发任务、计划
- **关键点**：重要发现、注意事项、技术要点
- **关键决策**：技术选型、架构决策、方案选择

#### 2. 使用分号分隔多个项目

```bash
# 正确 ✅
samectx sync --tasks "任务1;任务2;任务3"

# 错误 ❌
samectx sync --tasks "任务1, 任务2, 任务3"
```

#### 3. 简洁明了的命令

生成的命令应该易于理解和执行：

```bash
# 推荐 ✅
samectx sync --tasks "实现登录" --decisions "使用JWT"

# 不推荐 ❌ - 过于复杂
samectx sync --tasks "第一步：分析需求；第二步：设计方案；第三步：实现功能"
```

#### 4. 明确提示用户执行

```markdown
请执行以下命令保存上下文：

\`\`\`bash
samectx sync --tasks "..." --keypoints "..." --decisions "..."
\`\`\`
```

### SKILL 示例模板

```markdown
# 同步上下文

## 当前对话摘要

{简要描述对话内容}

## 提取的关键信息

### 关键任务
1. {任务1}
2. {任务2}

### 关键点
- {关键点1}
- {关键点2}

### 关键决策
- {决策1}

## 执行命令

请复制并执行以下命令：

\`\`\`bash
samectx sync --tasks "{任务1};{任务2}" --keypoints "{关键点1};{关键点2}" --decisions "{决策1}"
\`\`\`
```

---

## 目录结构

```
~/.samectx/                    # 全局配置目录
└── config.json                # 全局配置文件

your-project/
└── samectx-notes/             # 笔记目录（提交到 Git）
    ├── ethan/                 # 用户 ethan 的笔记
    │   ├── context_xxx.json
    │   └── ...
    ├── alice/                 # 用户 alice 的笔记
    │   └── ...
    └── bob/                   # 用户 bob 的笔记
        └── ...
```

## 跨设备同步

### 方式 1：Git 同步（推荐）

```bash
# 设备 A：保存并提交
samectx sync
git add samectx-notes/
git commit -m "Update context notes"
git push

# 设备 B：拉取并继续工作
git pull
samectx list
```

### 方式 2：手动复制

```bash
# 使用 -d 参数指定同步目录
samectx sync --dir /path/to/sync/folder
```

## 用户名识别

npm-samectx 通过以下优先级识别用户身份：

1. **配置文件用户名**（最高优先级）：`~/.samectx/config.json` 中的 `username` 字段
2. **Git 配置用户名**：`git config user.name`
3. **环境变量**：`SAMECTX_USER`
4. **系统用户名**（兜底）：`os.userInfo().username`

**设置用户名**：
```bash
# 永久设置（推荐）
samectx config --username your-username

# 临时设置（环境变量）
SAMECTX_USER=your-username samectx sync
```

## ⚠️ 隐私提醒

**重要：笔记将提交到 Git 仓库**

1. **可见性**：所有协作者都可以看到你的笔记
2. **历史记录**：笔记会保留在 Git 历史中
3. **敏感信息**：请勿在笔记中包含敏感信息（密码、密钥等）
4. **个人内容**：个人临时想法、实验性内容建议使用其他工具

**建议**：
- 只保存项目相关的上下文信息
- 定期清理过时的笔记
- 敏感信息使用环境变量或专用密钥管理工具

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| 用户名识别错误 | 运行 `samectx config --username <name>` 设置用户名 |
| 笔记位置错误 | 检查当前工作目录或使用 `-d` 参数 |
| Git 冲突 | 手动解决冲突，保留各自的笔记文件 |
| 权限问题 | 检查目录权限或使用 `-d` 参数指定其他目录 |

---

**GitHub**: https://github.com/ethanhuangcst/npm-samectx
