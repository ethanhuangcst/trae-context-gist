/**
 * CLI 命令实现
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const core = require('./index');

async function sync(options) {
  console.log(chalk.blue('📦 正在同步上下文...'));
  
  const result = await core.sync(options);
  
  if (result.success) {
    console.log(chalk.green('✅ 同步成功！'));
    console.log(`   项目名称: ${result.projectName}`);
    console.log(`   本地路径: ${result.localPath}`);
    
    if (result.gistUrl) {
      console.log(`   Gist URL: ${result.gistUrl}`);
    } else if (result.gistError) {
      console.log(chalk.yellow(`   ⚠️ Gist 同步失败: ${result.gistError}`));
    }
    
    if (result.analysis) {
      console.log(`   分析: ${result.analysis.taskCount} 个任务, ${result.analysis.keyPointCount} 个关键点, ${result.analysis.decisionCount} 个决策`);
    }
  } else {
    console.log(chalk.red(`❌ 同步失败: ${result.error}`));
    process.exit(1);
  }
}

async function list(options) {
  console.log(chalk.blue('📋 笔记列表:\n'));
  
  const notes = core.listNotes(options);
  
  if (notes.length === 0) {
    console.log(chalk.yellow('   没有找到笔记'));
    return;
  }
  
  notes.forEach((note, index) => {
    console.log(`${index + 1}. ${chalk.cyan(note.fileName)}`);
    console.log(`   项目: ${note.projectName}`);
    console.log(`   时间: ${note.timestamp || '未知'}`);
    if (note.summary) {
      console.log(`   摘要: ${note.summary}`);
    }
    console.log('');
  });
  
  console.log(chalk.gray(`共 ${notes.length} 条笔记`));
}

async function config(options) {
  if (options.show) {
    const currentConfig = core.loadConfig();
    console.log(chalk.blue('📋 当前配置:\n'));
    console.log(`   配置目录: ${core.CONFIG_DIR}`);
    console.log(`   GitHub Token: ${currentConfig.githubToken ? '已配置' : chalk.red('未配置')}`);
    return;
  }
  
  if (options.token) {
    const currentConfig = core.loadConfig();
    currentConfig.githubToken = options.token;
    core.saveConfig(currentConfig);
    console.log(chalk.green('✅ GitHub Token 已保存'));
    console.log(`   配置文件: ${core.CONFIG_FILE}`);
    return;
  }
  
  console.log(chalk.yellow('请指定配置选项:'));
  console.log('   --token <token>  设置 GitHub Token');
  console.log('   --show           显示当前配置');
}

async function init() {
  console.log(chalk.blue('🚀 初始化项目配置...\n'));
  
  const notesDir = core.getProjectNotesDir();
  console.log(`   笔记目录: ${notesDir}`);
  
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
    console.log(chalk.green('   ✅ 已创建笔记目录'));
  } else {
    console.log(chalk.gray('   笔记目录已存在'));
  }
  
  const envExample = path.join(process.cwd(), '.env.example');
  if (!fs.existsSync(envExample)) {
    fs.writeFileSync(envExample, `# GitHub Token Configuration
GITHUB_TOKEN=your_github_token_here
`);
    console.log(chalk.green('   ✅ 已创建 .env.example'));
  }
  
  console.log(chalk.green('\n✅ 初始化完成！'));
  console.log(chalk.yellow('\n下一步:'));
  console.log('   1. 获取 GitHub Token: https://github.com/settings/tokens/new');
  console.log('   2. 配置 Token: samectx config --token <your-token>');
  console.log('   3. 同步上下文: samectx sync');
}

module.exports = {
  sync,
  list,
  config,
  init
};
