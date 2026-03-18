# 技能更新指南

## 方法一：使用 Git 自动更新（推荐）

### 首次部署时使用 Git

如果您首次部署时使用了 Git 克隆方式，更新非常简单：

```bash
# 进入技能目录
cd /path/to/your/project/.trae/skills/trae-context-gist

# 拉取最新代码
git pull origin main
```

### 如果首次部署时没有使用 Git

可以重新克隆：

```bash
# 备份 .env 文件（包含您的 GitHub Token）
cp /path/to/your/project/.trae/skills/trae-context-gist/.env /tmp/.env.backup

# 删除旧的技能目录
rm -rf /path/to/your/project/.trae/skills/trae-context-gist

# 重新克隆
cd /path/to/your/project/.trae/skills/
git clone https://github.com/ethanhuangcst/trae-context-gist.git

# 恢复 .env 文件
cp /tmp/.env.backup trae-context-gist/.env
```

## 方法二：一键更新脚本

创建一个更新脚本 `update-skill.sh`：

```bash
#!/bin/bash

echo "🔄 更新 trae-context-gist 技能..."

# 检查是否在技能目录中
if [ ! -f "index.js" ]; then
    echo "❌ 请在技能目录中运行此脚本"
    echo "用法：cd /path/to/your/project/.trae/skills/trae-context-gist && ./update-skill.sh"
    exit 1
fi

# 备份 .env 文件
if [ -f ".env" ]; then
    cp .env .env.backup
    echo "✅ 已备份 .env 文件"
fi

# 检查是否是 Git 仓库
if [ -d ".git" ]; then
    echo "📥 使用 Git 更新..."
    git pull origin main
    echo "✅ 更新完成"
else
    echo "❌ 此目录不是 Git 仓库"
    echo "请重新克隆：https://github.com/ethanhuangcst/trae-context-gist.git"
    exit 1
fi

# 恢复 .env 文件
if [ -f ".env.backup" ]; then
    mv .env.backup .env
    echo "✅ 已恢复 .env 配置"
fi

echo ""
echo "🎉 技能更新完成！"
echo "💡 提示：在 TRAE 中输入 '整理上下文' 测试新功能"
```

使用方法：

```bash
# 赋予执行权限
chmod +x update-skill.sh

# 运行更新
./update-skill.sh
```

## 方法三：手动更新

### 1. 检查更新

访问 GitHub 仓库查看是否有新提交：
https://github.com/ethanhuangcst/trae-context-gist/commits/main

### 2. 下载最新代码

```bash
# 下载最新代码
cd /tmp
git clone https://github.com/ethanhuangcst/trae-context-gist.git latest-skill

# 或者下载 ZIP 文件并解压
curl -L https://github.com/ethanhuangcst/trae-context-gist/archive/main.zip -o skill.zip
unzip skill.zip
```

### 3. 复制文件

```bash
# 备份 .env
cp /path/to/your/project/.trae/skills/trae-context-gist/.env /tmp/.env.backup

# 复制新文件（排除 .env 和 node_modules）
rsync -av --exclude='.env' --exclude='node_modules' --exclude='.git' \
    /tmp/latest-skill/ \
    /path/to/your/project/.trae/skills/trae-context-gist/

# 恢复 .env
cp /tmp/.env.backup /path/to/your/project/.trae/skills/trae-context-gist/.env
```

### 4. 安装依赖

```bash
cd /path/to/your/project/.trae/skills/trae-context-gist
npm install
```

## 检查当前版本

### 查看本地版本

```bash
# 查看最近的提交
cd /path/to/your/project/.trae/skills/trae-context-gist
git log --oneline -5
```

### 查看远程版本

```bash
# 查看远程最近的提交
git fetch origin
git log --oneline origin/main -5
```

### 比较差异

```bash
# 查看本地和远程的差异
git diff HEAD origin/main --stat
```

## 自动更新检查

创建一个简单的检查脚本 `check-updates.js`：

```javascript
const { execSync } = require('child_process');

console.log('🔍 检查技能更新...\n');

try {
  // 获取本地最新提交
  const localCommit = execSync('git log --oneline -1', { encoding: 'utf8' }).trim();
  console.log('📍 本地版本:', localCommit);
  
  // 获取远程最新提交
  execSync('git fetch origin', { stdio: 'ignore' });
  const remoteCommit = execSync('git log --oneline origin/main -1', { encoding: 'utf8' }).trim();
  console.log('🌐 远程版本:', remoteCommit);
  
  // 比较
  const localHash = localCommit.split(' ')[0];
  const remoteHash = remoteCommit.split(' ')[0];
  
  if (localHash === remoteHash) {
    console.log('\n✅ 已是最新版本！');
  } else {
    console.log('\n⚠️  发现新版本！');
    console.log('\n运行以下命令更新：');
    console.log('  git pull origin main');
  }
} catch (error) {
  console.log('❌ 无法检查更新（可能不是 Git 仓库）');
  console.log('请访问：https://github.com/ethanhuangcst/trae-context-gist');
}
```

使用方法：

```bash
node check-updates.js
```

## 更新通知

### 启用更新检查

在 `.trae/config.json` 中添加自动检查：

```json
{
  "skills": [
    {
      "name": "trae-context-gist",
      "path": "./skills/trae-context-gist",
      "enabled": true,
      "autoUpdate": true
    }
  ]
}
```

### 查看更新日志

访问：https://github.com/ethanhuangcst/trae-context-gist/commits/main

## 常见问题

### Q: 更新会丢失我的配置吗？
A: 不会。`.env` 文件会被备份和恢复，您的 GitHub Token 不会丢失。

### Q: 需要重新安装依赖吗？
A: 如果 `package.json` 有变化，需要运行 `npm install`。

### Q: 更新后技能不工作怎么办？
A: 重启 TRAE，然后运行 `node test.js` 检查是否有错误。

### Q: 可以回退到旧版本吗？
A: 可以，使用 `git checkout <commit-hash>` 回退到特定版本。

## 最佳实践

1. **定期更新**：每周检查一次更新
2. **备份配置**：更新前备份 `.env` 文件
3. **测试功能**：更新后运行测试确保正常
4. **查看变更**：更新前查看更新日志

## 快速参考

```bash
# 检查更新
git fetch origin
git diff HEAD origin/main --stat

# 更新技能
git pull origin main

# 验证更新
node -e "console.log(require('./index.js'))"
```

---

**最后更新**: 2026-03-18  
**版本**: 1.1.0  
**仓库**: https://github.com/ethanhuangcst/trae-context-gist
