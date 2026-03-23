# samectx 项目演进历史与上下文

## 项目概述

**samectx** 是一个上下文同步工具，用于在多台设备使用 TRAE、Cursor、Claude Code 等 AI 工具时，整理对话上下文并同步到 GitHub Gist。

## 项目演进历程

### 阶段一：SKILL 方案（最初设计）

#### 设计思路
最初采用 TRAE SKILL 方案，通过静态 `.md` 文件实现上下文同步功能。

#### 实现方式
- 创建 SKILL 配置文件 `skill.json`
- 编写 `.md` 文件作为 SKILL 内容
- 通过 SKILL 触发机制自动执行

#### 核心代码位置
- 根目录 `index.js`：SKILL 主实现
- `skill.json`：SKILL 配置
- `.md` 文件：SKILL 内容

#### 遇到的问题
**关键限制**：SKILL 方案只支持通过静态 `.md` 文件触发同步行为，**无法通过执行脚本触发同步行为**。

具体表现：
1. SKILL 只能读取和展示 `.md` 文件内容
2. 无法在 SKILL 中执行 Node.js 脚本
3. 无法直接调用 GitHub API 上传 Gist
4. 无法实现真正的自动化同步

#### 失败原因分析
- TRAE SKILL 的设计理念是"提示型"而非"执行型"
- SKILL 的主要作用是提供信息和建议，而非直接执行操作
- 安全考虑：TRAE 限制了 SKILL 的执行权限

### 阶段二：npm 方案（第一次重构）

#### 设计思路
放弃 SKILL 方案，转为开发独立的 npm 包，通过命令行工具实现同步功能。

#### 实现方式
- 创建 npm 包 `samectx`
- 提供 CLI 命令：`samectx sync`、`samectx list`、`samectx config`
- 用户手动执行命令触发同步

#### 核心代码位置
- `bin/samectx`：CLI 入口
- `src/cli.js`：CLI 命令实现
- `src/index.js`：核心功能实现
- `package.json`：npm 配置

#### 优势
1. ✅ 可以执行任意 Node.js 代码
2. ✅ 可以调用 GitHub API
3. ✅ 功能完整，实现真正的同步
4. ✅ 可以独立使用，不依赖 TRAE

#### 遇到的问题
**用户体验问题**：需要用户每次手动输入命令触发同步行为，无法做到与 SKILL 一样的智能效果。

具体表现：
1. 用户需要记住命令：`samectx sync`
2. 用户需要主动触发，容易忘记
3. 缺少智能提示和引导
4. 新用户学习成本高

### 阶段三：双方案（最终方案）

#### 设计思路
结合 SKILL 和 npm 的优势，采用"SKILL + npm 双方案"：
- **SKILL**：作为智能提示器，在适当时机提醒用户同步
- **npm**：作为功能执行器，提供实际的同步功能

#### 架构设计

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
│  (npm-samectx)  │  - 执行同步命令
│                 │  - 调用 GitHub API
└─────────────────┘
```

#### 工作流程
```
用户操作 
  → SKILL 识别场景 
  → 展示 .md 内容（包含 npm 命令提示） 
  → 用户执行 npm 命令 
  → 完成同步
```

#### 优势
1. ✅ **智能提示**：SKILL 在适当时机提醒用户同步
2. ✅ **降低记忆负担**：用户不需要记住命令
3. ✅ **功能完整**：npm 包提供完整功能
4. ✅ **渐进式引导**：新用户通过 SKILL 引导，熟练用户直接用 npm
5. ✅ **独立使用**：npm 包可独立使用，不强制依赖 SKILL

#### 实现细节

**SKILL 部分（skill-samectx）**：
- `skills/install.md`：首次使用时的安装引导
- `skills/sync.md`：同步提示和命令示例
- `skills/config.md`：配置帮助
- `skills/init.md`：初始化指导
- `skill.json`：定义触发条件和元数据

**npm 部分（npm-samectx）**：
- `bin/samectx`：CLI 入口
- `src/cli.js`：命令实现
- `src/index.js`：核心功能
- `package.json`：npm 配置

#### 触发机制
SKILL 通过以下方式触发：
1. **关键词触发**：用户提到"同步上下文"、"多设备"、"跨设备"等
2. **场景触发**：用户提到需要在其他设备继续工作、项目切换等
3. **工具触发**：用户使用 TRAE CN、Cursor、Claude Code 等工具

### 阶段四：项目解耦（当前状态）

#### 背景
最初项目是耦合的，一套 Git 仓库包含 npm 代码和 SKILL 代码。

#### 解耦原因
1. **职责分离**：npm 和 SKILL 是两个独立的系统
2. **独立发布**：npm 包发布到 npmjs.com，SKILL 发布到 GitHub
3. **独立维护**：两者可以独立迭代和更新
4. **清晰边界**：避免混淆和依赖问题

#### 解耦方案
创建两个独立的 Git 仓库：

**仓库 1：npm-samectx**
- Git 仓库名：`npm-samectx`
- npm 包名：`samectx`
- 命令名：`samectx`
- 内容：npm 包代码
- 发布位置：npmjs.com
- GitHub：https://github.com/ethanhuangcst/npm-samectx

**仓库 2：skill-samectx**
- Git 仓库名：`skill-samectx`
- 内容：SKILL 代码和配置
- 发布位置：GitHub
- GitHub：https://github.com/ethanhuangcst/skill-samectx

#### 解耦后的关系
```
skill-samectx (SKILL)
    │
    │ 依赖
    ↓
npm-samectx (npm Package)
```

- SKILL 依赖 npm 包
- npm 包独立存在，不依赖 SKILL
- 用户可以只使用 npm 包，不使用 SKILL

## 技术决策记录

### 决策 1：为什么选择 GitHub Gist？
- **免费**：GitHub Gist 免费
- **易用**：无需额外配置，只需 GitHub Token
- **可靠**：GitHub 服务稳定
- **隐私**：支持私有 Gist
- **版本控制**：自动保存历史版本

### 决策 2：为什么使用 Node.js？
- **跨平台**：支持 Windows、macOS、Linux
- **生态丰富**：npm 生态系统成熟
- **易于分发**：通过 npm 全局安装
- **开发效率**：JavaScript 开发效率高

### 决策 3：为什么采用双方案？
- **用户体验**：SKILL 提供智能提示，降低使用门槛
- **功能完整**：npm 提供完整功能，满足高级用户需求
- **灵活性**：用户可以选择使用方式
- **可维护性**：两者独立维护，互不影响

### 决策 4：为什么解耦？
- **职责清晰**：SKILL = 提示器，npm = 执行器
- **独立演进**：两者可以独立迭代
- **发布灵活**：可以独立发布和更新
- **用户选择**：用户可以只使用其中一个

## 项目结构

### npm-samectx 仓库结构
```
npm-samectx/
├── bin/
│   └── samectx          # CLI 入口
├── src/
│   ├── cli.js           # CLI 命令实现
│   └── index.js         # 核心功能
├── .env.example         # 环境变量示例
├── .gitignore           # Git 忽略配置
├── README.md            # 项目文档
├── package.json         # npm 配置
└── package-lock.json    # 依赖锁定
```

### skill-samectx 仓库结构
```
skill-samectx/
├── skills/
│   ├── install.md       # 安装引导
│   ├── sync.md          # 同步提示
│   ├── config.md        # 配置帮助
│   └── init.md          # 初始化指导
├── .gitignore           # Git 忽略配置
├── README.md            # SKILL 文档
├── skill.json           # SKILL 配置
└── context.md           # 本文件
```

## 使用场景

### 场景 1：新用户首次使用
1. 用户在 TRAE 中提到"同步上下文"
2. SKILL 触发，显示 `install.md` 内容
3. 用户看到安装命令：`npm install -g samectx`
4. 用户执行安装
5. 用户配置 Token：`samectx config --token <token>`
6. 用户开始使用：`samectx sync`

### 场景 2：熟练用户日常使用
1. 用户直接执行：`samectx sync`
2. 上下文同步到 Gist
3. 在其他设备上执行：`samectx list` 查看笔记

### 场景 3：跨设备协作
1. 在设备 A 上工作，执行：`samectx sync`
2. 切换到设备 B，执行：`samectx list`
3. 查看同步的上下文，继续工作

## 未来规划

### 短期目标
1. ✅ 完成 npm 包发布
2. ✅ 完成 SKILL 发布
3. ✅ 编写完整文档
4. ✅ 测试双方案协作

### 中期目标
1. 增加更多触发场景
2. 优化 SKILL 提示内容
3. 增加 npm 包功能（如：搜索、删除、编辑）
4. 支持更多 AI 工具

### 长期目标
1. 支持更多存储后端（如：Git、S3）
2. 提供图形界面
3. 支持团队协作
4. 集成到更多 AI 工具

## 关键经验教训

### 1. 技术选型要考虑实际能力
- SKILL 方案失败的原因是没有充分了解 SKILL 的能力限制
- 应该先验证技术可行性，再投入大量开发

### 2. 用户体验至关重要
- npm 方案功能完整，但用户体验不佳
- 技术方案要平衡功能和易用性

### 3. 架构设计要灵活
- 双方案设计提供了更好的灵活性
- 解耦设计让系统更易维护

### 4. 文档和上下文很重要
- 完整的上下文记录有助于后续维护
- 清晰的文档降低学习成本

## 相关资源

### npm 包
- **GitHub**：https://github.com/ethanhuangcst/npm-samectx
- **npm**：https://www.npmjs.com/package/samectx

### SKILL
- **GitHub**：https://github.com/ethanhuangcst/skill-samectx

### TRAE 文档
- TRAE SKILL 开发指南
- TRAE SKILL 最佳实践

## 联系方式

- **作者**：ethanhuangcst
- **GitHub**：https://github.com/ethanhuangcst

---

**最后更新**：2026-03-23
**版本**：1.0.0
