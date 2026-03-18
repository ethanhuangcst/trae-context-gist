#!/bin/bash

# trae-context-gist 技能自动更新脚本

set -e

echo "======================================"
echo "  trae-context-gist 技能更新工具"
echo "======================================"
echo ""

# 检查是否在正确的目录
if [ ! -f "index.js" ]; then
    echo "❌ 错误：请在技能目录中运行此脚本"
    echo ""
    echo "用法："
    echo "  cd /path/to/your/project/.trae/skills/trae-context-gist"
    echo "  ./update.sh"
    exit 1
fi

# 检查是否有 Git
if ! command -v git &> /dev/null; then
    echo "❌ 错误：未找到 Git，请先安装 Git"
    exit 1
fi

# 检查是否是 Git 仓库
if [ ! -d ".git" ]; then
    echo "❌ 错误：此目录不是 Git 仓库"
    echo ""
    echo "请重新克隆技能："
    echo "  git clone https://github.com/ethanhuangcst/trae-context-gist.git"
    exit 1
fi

# 备份 .env 文件
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d%H%M%S)
    echo "✅ 已备份 .env 文件"
fi

# 检查是否有未提交的更改
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "⚠️  检测到未提交的更改"
    echo "正在暂存更改..."
    git stash
    STASHED=true
fi

# 拉取最新代码
echo ""
echo "📥 正在从 GitHub 拉取最新代码..."
git pull origin main

# 恢复暂存的更改
if [ "$STASHED" = true ]; then
    echo "🔄 恢复本地更改..."
    git stash pop || true
fi

# 恢复 .env 文件
if [ -f ".env.backup."* ]; then
    LATEST_BACKUP=$(ls -t .env.backup.* | head -1)
    mv "$LATEST_BACKUP" .env
    echo "✅ 已恢复 .env 配置"
fi

# 检查 package.json 是否有变化
if git diff HEAD~1 HEAD -- package.json > /dev/null 2>&1; then
    echo ""
    echo "📦 检测到依赖变化，正在安装依赖..."
    npm install
fi

echo ""
echo "======================================"
echo "  ✅ 更新完成！"
echo "======================================"
echo ""

# 显示最近的提交
echo "📝 最近提交："
git log --oneline -3

echo ""
echo "💡 提示："
echo "  - 在 TRAE 中输入 '整理上下文' 测试新功能"
echo "  - 查看更新日志：https://github.com/ethanhuangcst/trae-context-gist/commits/main"
echo ""
