# trae-context-gist

trae-context-gist 是一个项目级技能，自动整理 TRAE CN 对话上下文，生成结构化笔记并同步到 GitHub Gist。

## 技能架构

```
~/.trae/skills/trae-context-gist/     # 全局技能目录
├── .env                              # GitHub Token（全局共享）
├── index.js                          # 技能代码
├── gist-mapping.json                 # 项目-Gist 映射（待实现）
└── ...

your-project/.trae/
├── config.json                       # 项目配置
├── skills/trae-context-gist -> ~/.trae/skills/trae-context-gist  # 符号链接
└── notes/your-project/               # 本地笔记（按项目存储）
    └── context_2026-03-20.json
```

**设计优势**：
- 配置文件存放在全局目录：一次更新，所有项目生效
- Token 全局共享：只需配置一次
- 每个项目的笔记隔离：每个项目的笔记存储在项目目录

## 依赖

| 依赖 | 说明 |
|------|------|
| Node.js | 运行技能代码 |
| GitHub Token | 需要 `gist` 权限 |

> ⚠️ **Token 失效日期**：创建 Token 时默认 30 天失效，建议设置为 1 年或更长。

## 快速部署

```bash
# 在项目目录执行
curl -fsSL https://raw.githubusercontent.com/ethanhuangcst/trae-context-gist/main/setup.sh | bash
```

脚本会自动：
1. 安装全局技能到 `~/.trae/skills/trae-context-gist`
2. 引导配置 GitHub Token
3. 创建项目符号链接

## 使用

在 TRAE 中输入：
```
整理上下文
```

## 笔记组织

### 本地存储
```
your-project/.trae/notes/project-name/
├── context_2026-03-20T05-23.json
└── context_2026-03-20T06-15.json
```

### Gist 组织（方案 A - 待实现）
```
Gist: "TRAE CN - pen-lite"
├── context_2026-03-20T05-23.json
├── context_2026-03-20T06-15.json
└── context_2026-03-21T10-00.json

Gist: "TRAE CN - trae-context-gist"
├── context_2026-03-19T08-30.json
└── context_2026-03-20T03-00.json
```

每个项目一个 Gist，历史笔记聚合在同一 Gist 中。

## 更新

```bash
cd ~/.trae/skills/trae-context-gist && git pull origin main
```

## 获取 GitHub Token

1. 访问 https://github.com/settings/tokens/new
2. Note: `trae-context-gist`
3. Expiration: 选择 `Custom` → 设置 1 年后
4. Select scopes: ✅ `gist`
5. 点击 Generate token，复制保存

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| Token 未配置 | 检查 `~/.trae/skills/trae-context-gist/.env` |
| 笔记位置错误 | 确保 `.trae` 目录存在于项目根目录 |
| Gist 上传失败 | 检查 Token 权限和有效期；本地笔记仍可用 |

---

**GitHub**: https://github.com/ethanhuangcst/trae-context-gist
