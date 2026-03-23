# samectx 功能规格说明

## 文档信息

- **版本**: 2.0.0
- **日期**: 2026-03-23
- **作者**: ethanhuangcst
- **状态**: 待审核

---

## 1. 概述

### 1.1 项目背景

samectx 是一个上下文管理工具，用于在使用 TRAE、Cursor、Claude Code 等 AI 工具时，整理对话上下文并保存到本地目录。

### 1.2 最新功能改变

从版本 1.x 升级到 2.0，主要改变如下：

#### 1.2.1 架构改变

| 维度 | 旧方案 (1.x) | 新方案 (2.0) |
|------|-------------|-------------|
| 同步方式 | GitHub Gist | 本地文件 + Git |
| 用户隔离 | 无 | 用户子目录 |
| Token 配置 | 必需 | 不需要 |
| 跨设备同步 | Gist 云端 | Git 仓库 |
| 多用户协作 | 不支持 | 支持 |

#### 1.2.2 核心理念

**上下文即代码**：
- 上下文是项目开发的重要辅助资料
- 应该被看作代码的一部分
- 通过 Git 进行版本管理和协作

#### 1.2.3 简化方案

**移除的功能**：
- ❌ GitHub Gist 同步
- ❌ GitHub Token 配置
- ❌ Gist 映射管理

**新增的功能**：
- ✅ 用户子目录隔离
- ✅ Git 同步支持
- ✅ 多用户协作
- ✅ 用户身份识别

---

## 2. 功能规格

### 2.1 核心功能

#### 2.1.1 上下文保存 (US-1)

**功能描述**：将对话上下文保存到本地目录

**目录结构**：
```
project-a/
└── samectx-notes/           # 笔记目录（提交到 Git）
    └── {username}/          # 用户专属子目录
        └── context_{timestamp}.md
```

**验收标准**：
- ✅ 自动创建用户子目录
- ✅ 笔记文件名包含时间戳
- ✅ 显示成功消息，包含文件路径和大小

#### 2.1.2 多用户协作 (US-3)

**功能描述**：支持多用户在同一项目中协作，笔记隔离

**用户身份识别**：
1. **系统用户名**（优先）：`os.userInfo().username`
2. **环境变量**：`process.env.USER` 或 `process.env.USERNAME`
3. **Git 配置**（备选）：`git config user.name`

**验收标准**：
- ✅ 自动创建用户子目录
- ✅ 不同用户的笔记隔离
- ✅ 笔记提交到 Git
- ✅ 支持跨设备同步

#### 2.1.3 Git 同步

**功能描述**：通过 Git 实现跨设备同步

**工作流程**：
```
设备 A:
  samectx sync
  git add samectx-notes/
  git commit -m "Update context"
  git push

设备 B:
  git pull
  samectx list
```

**验收标准**：
- ✅ 笔记目录提交到 Git
- ✅ 支持跨设备同步
- ✅ Git 历史记录保留

### 2.2 命令规格

#### 2.2.1 sync 命令

**语法**：
```bash
samectx sync [options]
samectx s [options]
```

**选项**：
- `-p, --project <name>`: 指定项目名称
- `-d, --dir <path>`: 指定笔记目录

**行为**：
1. 识别用户身份
2. 确定项目名称
3. 创建用户子目录（如不存在）
4. 保存上下文到 `samectx-notes/{username}/`
5. 显示成功消息

#### 2.2.2 list 命令

**语法**：
```bash
samectx list [options]
samectx l [options]
```

**选项**：
- `-p, --project <name>`: 筛选项目

**行为**：
1. 扫描 `samectx-notes/{username}/` 目录
2. 显示笔记列表
3. 包含文件名、时间戳、摘要

#### 2.2.3 config 命令

**语法**：
```bash
samectx config [options]
samectx c [options]
```

**选项**：
- `-d, --dir <path>`: 设置默认笔记目录
- `-s, --show`: 显示配置

**行为**：
1. 保存配置到 `~/.samectx/config.json`
2. 显示当前配置

#### 2.2.4 init 命令

**语法**：
```bash
samectx init
samectx i
```

**行为**：
1. 创建 `samectx-notes/` 目录
2. 创建 `.env.example` 文件
3. 显示下一步提示

---

## 3. 技术规格

### 3.1 目录结构

#### 3.1.1 项目目录

```
project-a/
└── samectx-notes/           # 笔记目录（提交到 Git）
    ├── ethan/               # 用户 ethan 的笔记
    │   ├── context_2026-03-23T10-30.md
    │   └── ...
    ├── alice/               # 用户 alice 的笔记
    │   ├── context_2026-03-23T11-45.md
    │   └── ...
    └── bob/                 # 用户 bob 的笔记
        ├── context_2026-03-23T14-20.md
        └── ...
```

#### 3.1.2 全局配置

```
~/.samectx/
└── config.json              # 全局配置文件
```

**配置文件格式**：
```json
{
  "defaultNotesDir": "/path/to/notes",
  "version": "2.0.0"
}
```

### 3.2 用户身份识别

**优先级**：
1. 系统用户名：`os.userInfo().username`
2. 环境变量：`process.env.USER` 或 `process.env.USERNAME`
3. Git 配置：`git config user.name`

**实现代码**：
```javascript
function getUsername() {
  // 优先级1：系统用户名
  try {
    return os.userInfo().username;
  } catch (e) {}
  
  // 优先级2：环境变量
  if (process.env.USER) return process.env.USER;
  if (process.env.USERNAME) return process.env.USERNAME;
  
  // 优先级3：Git 配置
  try {
    return execSync('git config user.name', { encoding: 'utf8' }).trim();
  } catch (e) {}
  
  // 默认值
  return 'default';
}
```

### 3.3 文件命名

**格式**：`context_{timestamp}.md`

**示例**：`context_2026-03-23T10-30-00-000Z.md`

**时间戳格式**：ISO 8601

### 3.4 依赖

**生产依赖**：
- `chalk`: ^4.1.2
- `commander`: ^11.0.0

**Node.js 版本**：>= 14.0.0

---

## 4. 用户故事

### 4.1 US-1: 上下文保存

**用户故事**：
```
作为一个 AI 工具用户
我想要保存当前项目的对话上下文到本地目录
以便在需要时回顾和恢复工作上下文
```

**验收标准**：
- ✅ 成功保存上下文到用户子目录
- ✅ 保存失败时显示错误消息
- ✅ 笔记目录不存在时自动创建

### 4.2 US-2: 多项目支持

**用户故事**：
```
作为一个在多个项目间切换的用户
我想要为不同项目分别管理上下文笔记
以便保持项目间的上下文隔离
```

**验收标准**：
- ✅ 自动识别当前项目名称
- ✅ 使用 -p 参数指定项目名称
- ✅ 使用 -d 参数指定笔记目录
- ✅ 项目名称包含特殊字符时自动清理

### 4.3 US-3: 多用户协作

**用户故事**：
```
作为一个在团队中协作的用户
我想要我的笔记与其他协作者的笔记隔离
以便避免冲突和保护个人工作上下文
```

**验收标准**：
- ✅ 自动创建用户子目录
- ✅ 不同用户的笔记隔离
- ✅ 笔记提交到 Git
- ✅ 跨设备同步笔记
- ✅ **自动识别用户身份**

---

## 5. 非功能性需求

### 5.1 性能要求

- 本地保存操作在 1 秒内完成
- 支持大文件（最大 10MB）

### 5.2 安全要求

- 笔记文件存储在本地文件系统中
- 笔记不会被上传到外部服务器
- 笔记文件权限设置为仅用户可读写

### 5.3 兼容性要求

- 支持 Windows、macOS、Linux
- 支持 Node.js 14.0.0 或更高版本

---

## 6. 隐私与安全

### 6.1 隐私提醒

**重要**：笔记将提交到 Git 仓库

1. **可见性**：所有协作者都可以看到你的笔记
2. **历史记录**：笔记会保留在 Git 历史中
3. **敏感信息**：请勿在笔记中包含敏感信息（密码、密钥等）
4. **个人内容**：个人临时想法、实验性内容建议使用其他工具

### 6.2 建议

- 只保存项目相关的上下文信息
- 定期清理过时的笔记
- 敏感信息使用环境变量或专用密钥管理工具

---

## 7. 迁移指南

### 7.1 从 1.x 迁移到 2.0

**步骤**：

1. **更新 npm 包**：
   ```bash
   npm update -g samectx
   ```

2. **迁移笔记目录**：
   ```bash
   # 旧目录结构
   samectx-notes/
   └── context_*.md
   
   # 新目录结构
   samectx-notes/
   └── {username}/
       └── context_*.md
   ```

3. **删除 Gist 配置**：
   ```bash
   rm ~/.samectx/gist-mapping.json
   ```

4. **提交到 Git**：
   ```bash
   git add samectx-notes/
   git commit -m "Migrate to samectx 2.0"
   ```

### 7.2 配置迁移

**旧配置 (1.x)**：
```json
{
  "githubToken": "ghp_xxxxx",
  "gistMapping": {}
}
```

**新配置 (2.0)**：
```json
{
  "defaultNotesDir": "/path/to/notes",
  "version": "2.0.0"
}
```

---

## 8. 未来规划

### 8.1 短期目标

- ✅ 完成核心功能实现
- ✅ 完成文档更新
- ✅ 发布 npm 包

### 8.2 中期目标

- 增加笔记搜索功能
- 支持笔记编辑和删除
- 提供笔记统计和分析

### 8.3 长期目标

- 支持更多 AI 工具
- 提供图形界面
- 支持团队协作功能

---

## 9. 附录

### 9.1 相关文档

- [需求文档](./req.md)
- [技术设计文档](./design.md)
- [README](../README.md)

### 9.2 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| 2.0.0 | 2026-03-23 | 移除 Gist 同步，添加多用户协作 | ethanhuangcst |
| 1.0.0 | 2026-03-23 | 初始版本 | ethanhuangcst |

---

## 10. 审核清单

- [ ] 功能规格是否完整？
- [ ] 用户故事是否清晰？
- [ ] 验收标准是否明确？
- [ ] 技术规格是否详细？
- [ ] 隐私提醒是否充分？
- [ ] 迁移指南是否清晰？
- [ ] 文档是否一致？
