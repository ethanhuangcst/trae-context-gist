---
name: trae-context-gist
description: "自动整理 TRAE CN 对话上下文，生成结构化笔记并存储到 GitHub Gist 云端。在用户输入'整理上下文'或'consolidate context'时触发。"
---

# trae-context-gist Skill

## Description
自动整理 TRAE CN 对话上下文，生成结构化笔记并存储到 GitHub Gist 云端，方便检索和使用。

## Triggers
- 定期触发：每小时执行一次
- 手动触发：用户输入"整理上下文"
- 对话结束时自动触发

## Capabilities
- 上下文分析和摘要生成
- 结构化笔记创建
- GitHub Gist 云存储集成
- 笔记检索和索引

## Configuration
- GITHUB_TOKEN: GitHub 个人访问令牌（需 gist 权限）

## Usage
在 TRAE CN 中输入"整理上下文"即可手动触发技能
