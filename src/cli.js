/**
 * CLI 命令实现
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const core = require('./index');

async function sync(options) {
  console.log(chalk.blue('📦 正在保存上下文...'));
  
  const result = await core.sync(options);
  
  if (result.success) {
    console.log(chalk.green('✅ 上下文已成功保存！'));
    console.log(`   项目名称: ${result.projectName}`);
    console.log(`   用户名: ${result.username}`);
    console.log(`   本地路径: ${result.localPath}`);
    console.log(`   文件大小: ${result.fileSize} bytes`);
    
    if (result.hasKeyInfo) {
      console.log(chalk.cyan(`   📋 关键信息:`));
      console.log(`      任务: ${result.analysis.taskCount} 个`);
      console.log(`      关键点: ${result.analysis.keyPointCount} 个`);
      console.log(`      决策: ${result.analysis.decisionCount} 个`);
    } else {
      console.log(chalk.gray(`   💡 提示: 使用 --tasks, --keypoints, --decisions 参数记录关键信息`));
      console.log(chalk.gray(`      示例: samectx sync --tasks "任务1;任务2" --decisions "决策1"`));
    }
    
    if (result.usernameSource === 'git') {
      console.log(chalk.gray(`   💡 用户名来源: Git 配置`));
      console.log(chalk.gray('   建议运行: samectx config --username <name> 保存到配置文件'));
    } else if (result.usernameSource === 'system') {
      console.log(chalk.yellow(`   ⚠️ 用户名来源: 系统用户名`));
      console.log(chalk.gray('   建议运行: samectx config --username <name> 或配置 Git 用户名'));
    }
  } else {
    console.log(chalk.red(`❌ 保存失败: ${result.error}`));
    if (result.suggestion) {
      console.log(chalk.yellow(`   建议: ${result.suggestion}`));
    }
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
    console.log(`   用户: ${note.username}`);
    console.log(`   时间: ${note.timestamp || '未知'}`);
    if (note.summary) {
      console.log(`   摘要: ${note.summary}`);
    }
    if (note.taskCount > 0 || note.keyPointCount > 0 || note.decisionCount > 0) {
      console.log(chalk.gray(`   关键信息: ${note.taskCount} 任务, ${note.keyPointCount} 关键点, ${note.decisionCount} 决策`));
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
    console.log(`   用户名: ${currentConfig.username || chalk.yellow('未配置')}`);
    console.log(`   默认笔记目录: ${currentConfig.defaultNotesDir || chalk.yellow('未配置')}`);
    return;
  }
  
  const currentConfig = core.loadConfig();
  let updated = false;
  
  if (options.username) {
    currentConfig.username = options.username;
    updated = true;
    console.log(chalk.green(`✅ 用户名已设置为: ${options.username}`));
  }
  
  if (options.dir) {
    const absoluteDir = path.isAbsolute(options.dir) 
      ? options.dir 
      : path.join(process.cwd(), options.dir);
    currentConfig.defaultNotesDir = absoluteDir;
    updated = true;
    console.log(chalk.green(`✅ 默认笔记目录已设置为: ${absoluteDir}`));
  }
  
  if (updated) {
    core.saveConfig(currentConfig);
    console.log(`   配置文件: ${core.CONFIG_FILE}`);
  } else {
    console.log(chalk.yellow('请指定配置选项:'));
    console.log('   -u, --username <name>  设置用户名');
    console.log('   -d, --dir <path>       设置默认笔记目录');
    console.log('   -s, --show             显示当前配置');
  }
}

async function init() {
  console.log(chalk.blue('🚀 初始化项目配置...\n'));
  
  const usernameResult = core.getUsername();
  const username = typeof usernameResult === 'object' ? usernameResult.name : usernameResult;
  const usernameSource = typeof usernameResult === 'object' ? usernameResult.source : 'config';
  
  const notesDirResult = core.getProjectNotesDir();
  const notesDir = notesDirResult.path;
  
  console.log(`   用户名: ${username}`);
  if (usernameSource === 'git') {
    console.log(chalk.gray(`   (来源: Git 配置)`));
  } else if (usernameSource === 'system') {
    console.log(chalk.yellow(`   (来源: 系统用户名 - 建议配置)`));
  }
  console.log(`   笔记目录: ${notesDir}`);
  
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
    console.log(chalk.green('   ✅ 已创建用户专属笔记目录'));
  } else {
    console.log(chalk.gray('   笔记目录已存在'));
  }
  
  console.log(chalk.green('\n✅ 初始化完成！'));
  console.log(chalk.yellow('\n下一步:'));
  console.log('   1. 同步上下文: samectx sync');
  console.log('   2. 查看笔记: samectx list');
  console.log('   3. 提交到 Git: git add samectx-notes/ && git commit -m "Add context notes"');
  
  if (usernameSource !== 'config') {
    console.log(chalk.gray('\n   提示: 运行 samectx config --username <name> 永久设置用户名'));
  }
}

module.exports = {
  sync,
  list,
  config,
  init
};
