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

# 或使用 npx(无需安装)
npx samectx --help
```

## 快速开始

```bash
# 1. 初始化项目
samectx init

# 2. 保存上下文
samectx sync

# 3. 查看笔记列表
samectx list
```

## 命令

### `sync` (别名: `s`) - 保存上下文

```bash
samectx sync [options]
# 或简写
samectx s

选项:
  -p, --project <name>  指定项目名称(默认从当前目录提取)
  -d, --dir <path>      指定笔记存储目录
```

### `list` (别名: `l`) - 列出笔记

```bash
samectx list [options]
# 或简写
samectx l

选项:
  -p, --project <name>  筛选指定项目的笔记
```

### `config` (别名: `c`) - 配置

```bash
samectx config [options]
# 或简写
samectx c

选项:
  -d, --dir <path>      设置默认笔记目录
  -s, --show            显示当前配置
```

### `init` (别名: `i`) - 初始化项目

```bash
samectx init
# 或简写
samectx i
```

## 目录结构

```
~/.samectx/                    # 全局配置目录
└── config.json                # 全局配置文件

your-project/
└── samectx-notes/             # 笔记目录（提交到 Git）
    ├── ethan/                 # 用户 ethan 的笔记
    │   ├── context_2026-03-23T10-30.md
    │   └── ...
    ├── alice/                 # 用户 alice 的笔记
    │   ├── context_2026-03-23T11-45.md
    │   └── ...
    └── bob/                   # 用户 bob 的笔记
        ├── context_2026-03-23T14-20.md
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

## 跨工具支持

| 工具 | 使用方式 |
|------|---------|
| TRAE CN | `npx samectx sync` |
| Cursor | `npx samectx sync` |
| Claude Code | `npx samectx sync` |
| 终端 | `samectx sync` |

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
| 用户名识别错误 | 检查系统用户名或设置环境变量 USER |
| 笔记位置错误 | 检查当前工作目录或使用 `-d` 参数 |
| Git 冲突 | 手动解决冲突，保留各自的笔记文件 |
| 权限问题 | 检查目录权限或使用 `sudo` |

## 用户名识别

npm-samectx 通过以下方式识别用户身份：

1. **系统用户名**（优先）：`os.userInfo().username`
2. **环境变量**：`process.env.USER` 或 `process.env.USERNAME`
3. **Git 配置**（备选）：`git config user.name`

**自定义用户名**：
```bash
# macOS/Linux
export USER=your-username
samectx sync

# 或在命令中临时设置
USER=your-username samectx sync
```

---

**GitHub**: https://github.com/ethanhuangcst/npm-samectx
