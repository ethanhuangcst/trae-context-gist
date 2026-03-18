# trae-context-gist 技能自动更新脚本 (PowerShell)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  trae-context-gist 技能更新工具" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在正确的目录
if (-not (Test-Path "index.js")) {
    Write-Host "❌ 错误：请在技能目录中运行此脚本" -ForegroundColor Red
    Write-Host ""
    Write-Host "用法：" -ForegroundColor Yellow
    Write-Host "  cd \path\to\your\project\.trae\skills\trae-context-gist" -ForegroundColor White
    Write-Host "  .\update.ps1" -ForegroundColor White
    exit 1
}

# 检查是否有 Git
try {
    $null = Get-Command git -ErrorAction Stop
} catch {
    Write-Host "❌ 错误：未找到 Git，请先安装 Git" -ForegroundColor Red
    exit 1
}

# 检查是否是 Git 仓库
if (-not (Test-Path ".git")) {
    Write-Host "❌ 错误：此目录不是 Git 仓库" -ForegroundColor Red
    Write-Host ""
    Write-Host "请重新克隆技能：" -ForegroundColor Yellow
    Write-Host "  git clone https://github.com/ethanhuangcst/trae-context-gist.git" -ForegroundColor White
    exit 1
}

# 备份 .env 文件
if (Test-Path ".env") {
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $backupName = ".env.backup.$timestamp"
    Copy-Item .env $backupName
    Write-Host "✅ 已备份 .env 文件" -ForegroundColor Green
}

# 检查是否有未提交的更改
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  检测到未提交的更改" -ForegroundColor Yellow
    Write-Host "正在暂存更改..." -ForegroundColor Yellow
    git stash
    $stashed = $true
}

# 拉取最新代码
Write-Host ""
Write-Host "📥 正在从 GitHub 拉取最新代码..." -ForegroundColor Cyan
git pull origin main

# 恢复暂存的更改
if ($stashed) {
    Write-Host "🔄 恢复本地更改..." -ForegroundColor Yellow
    git stash pop 2>$null
}

# 恢复 .env 文件
$backupFiles = Get-ChildItem ".env.backup.*"
if ($backupFiles) {
    $latestBackup = $backupFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Move-Item $latestBackup.FullName .env -Force
    Write-Host "✅ 已恢复 .env 配置" -ForegroundColor Green
}

# 检查 package.json 是否有变化
$packageChanged = git diff HEAD~1 HEAD -- package.json 2>$null
if ($packageChanged) {
    Write-Host ""
    Write-Host "📦 检测到依赖变化，正在安装依赖..." -ForegroundColor Cyan
    npm install
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  ✅ 更新完成！" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# 显示最近的提交
Write-Host "📝 最近提交：" -ForegroundColor Yellow
git log --oneline -3

Write-Host ""
Write-Host "💡 提示：" -ForegroundColor Cyan
Write-Host "  - 在 TRAE 中输入 '整理上下文' 测试新功能"
Write-Host "  - 查看更新日志：https://github.com/ethanhuangcst/trae-context-gist/commits/main"
Write-Host ""
