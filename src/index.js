/**
 * samectx - Context management tool
 * 整理对话上下文并保存到本地目录
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.samectx');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig() {
  ensureConfigDir();
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function extractProjectName(customName) {
  if (customName) {
    return customName.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  const cwd = process.cwd();
  let projectName = path.basename(cwd);
  return projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function sanitizeUsername(username) {
  if (!username) return 'unknown';
  return username.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getUsername() {
  const config = loadConfig();
  
  if (config.username) {
    return sanitizeUsername(config.username);
  }
  
  try {
    const gitUsername = execSync('git config user.name', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (gitUsername) {
      return {
        name: sanitizeUsername(gitUsername),
        source: 'git',
        rawName: gitUsername
      };
    }
  } catch (e) {
  }
  
  if (process.env.SAMECTX_USER) {
    return sanitizeUsername(process.env.SAMECTX_USER);
  }
  
  const sysUsername = os.userInfo().username;
  return {
    name: sanitizeUsername(sysUsername),
    source: 'system',
    rawName: sysUsername
  };
}

function getProjectNotesDir(customDir) {
  const config = loadConfig();
  let baseDir;
  
  if (customDir) {
    baseDir = path.isAbsolute(customDir) 
      ? customDir 
      : path.join(process.cwd(), customDir);
  } else if (config.defaultNotesDir) {
    baseDir = path.isAbsolute(config.defaultNotesDir)
      ? config.defaultNotesDir
      : path.join(process.cwd(), config.defaultNotesDir);
  } else if (process.env.LOCAL_NOTES_DIR) {
    baseDir = path.isAbsolute(process.env.LOCAL_NOTES_DIR)
      ? process.env.LOCAL_NOTES_DIR
      : path.join(process.cwd(), process.env.LOCAL_NOTES_DIR);
  } else {
    baseDir = path.join(process.cwd(), 'samectx-notes');
  }
  
  const usernameResult = getUsername();
  const username = typeof usernameResult === 'object' ? usernameResult.name : usernameResult;
  
  return {
    path: path.join(baseDir, username),
    usernameInfo: usernameResult
  };
}

function parseListParam(param) {
  if (!param) return [];
  return param
    .split(';')
    .map(item => item.trim())
    .filter(Boolean);
}

function analyzeContext(conversationHistory) {
  const keyPoints = [];
  const tasks = [];
  const decisions = [];
  
  try {
    const jsonData = JSON.parse(conversationHistory);
    
    if (jsonData.completedTasks) {
      jsonData.completedTasks.forEach(task => {
        if (typeof task === 'string') tasks.push(task);
      });
    }
    
    if (jsonData.pendingTasks || jsonData.tasks) {
      const pendingTasks = jsonData.pendingTasks || jsonData.tasks;
      pendingTasks.forEach(task => {
        if (typeof task === 'string') tasks.push(task);
      });
    }
    
    if (jsonData.keyDecisions || jsonData.decisions) {
      const decs = jsonData.keyDecisions || jsonData.decisions;
      decs.forEach(dec => {
        if (typeof dec === 'string') decisions.push(dec);
      });
    }
    
    if (jsonData.importantNotes || jsonData.keyPoints) {
      const notes = jsonData.importantNotes || jsonData.keyPoints;
      notes.forEach(note => {
        if (typeof note === 'string') keyPoints.push(note);
      });
    }
    
    if (tasks.length > 0 || decisions.length > 0 || keyPoints.length > 0) {
      const summary = `对话包含 ${tasks.length} 个任务、${keyPoints.length} 个关键点和 ${decisions.length} 个决策`;
      
      return {
        summary,
        keyPoints,
        tasks,
        decisions,
        rawContent: conversationHistory,
        timestamp: new Date().toISOString(),
        conversationLength: JSON.stringify(jsonData).split('\n').length,
        metadata: {
          version: '1.0.0',
          tool: 'samectx',
          format: 'json'
        }
      };
    }
  } catch (e) {
  }
  
  const lines = conversationHistory.split('\n');
  let currentSection = '';
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('### ')) {
      currentSection = trimmedLine.replace('### ', '');
      return;
    }
    
    if (trimmedLine.match(/^\d+\./) ||
        trimmedLine.startsWith('- ') ||
        trimmedLine.includes('任务') ||
        trimmedLine.includes('需要') ||
        trimmedLine.includes('要') ||
        trimmedLine.includes('计划') ||
        trimmedLine.includes('完成')) {
      if (trimmedLine.length > 5 && !trimmedLine.startsWith('###')) {
        tasks.push(trimmedLine);
      }
    }
    
    if (trimmedLine.includes('重要') || trimmedLine.includes('关键') ||
        trimmedLine.includes('注意') || trimmedLine.includes('记住') ||
        (currentSection && currentSection.includes('关键'))) {
      if (trimmedLine.length > 5) {
        keyPoints.push(trimmedLine);
      }
    }
    
    if (trimmedLine.includes('决定') || trimmedLine.includes('确定') ||
        trimmedLine.includes('选择') || trimmedLine.includes('采用') ||
        trimmedLine.startsWith('- ') && currentSection && currentSection.includes('决策')) {
      if (trimmedLine.length > 5) {
        decisions.push(trimmedLine);
      }
    }
  });
  
  const summary = `对话包含 ${tasks.length} 个任务、${keyPoints.length} 个关键点和 ${decisions.length} 个决策`;
  
  return {
    summary,
    keyPoints,
    tasks,
    decisions,
    rawContent: conversationHistory,
    timestamp: new Date().toISOString(),
    conversationLength: lines.length,
    metadata: {
      version: '1.0.0',
      tool: 'samectx',
      format: 'text'
    }
  };
}

function saveNoteToLocal(content, fileName, notesDir) {
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }
  
  const notePath = path.join(notesDir, fileName);
  fs.writeFileSync(notePath, JSON.stringify(content, null, 2));
  
  const stats = fs.statSync(notePath);
  
  return {
    fileName,
    localPath: notePath,
    fileSize: stats.size,
    savedAt: new Date().toISOString()
  };
}

async function sync(options = {}) {
  try {
    const projectName = extractProjectName(options.project);
    const notesDirResult = getProjectNotesDir(options.dir);
    const notesDir = notesDirResult.path;
    const usernameInfo = notesDirResult.usernameInfo;
    const username = typeof usernameInfo === 'object' ? usernameInfo.name : usernameInfo;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileName = `context_${timestamp}_${randomSuffix}.json`;
    
    let tasks = parseListParam(options.tasks);
    let keyPoints = parseListParam(options.keypoints);
    let decisions = parseListParam(options.decisions);
    
    if (options.content) {
      const analysis = analyzeContext(options.content);
      tasks = tasks.concat(analysis.tasks || []);
      keyPoints = keyPoints.concat(analysis.keyPoints || []);
      decisions = decisions.concat(analysis.decisions || []);
    }
    
    const hasKeyInfo = tasks.length > 0 || keyPoints.length > 0 || decisions.length > 0;
    
    const content = {
      projectName,
      username,
      timestamp: new Date().toISOString(),
      summary: hasKeyInfo 
        ? `对话包含 ${tasks.length} 个任务、${keyPoints.length} 个关键点和 ${decisions.length} 个决策`
        : '手动同步',
      tasks,
      keyPoints,
      decisions,
      metadata: {
        version: '1.0.0',
        tool: 'samectx'
      }
    };
    
    const localInfo = saveNoteToLocal(content, fileName, notesDir);
    
    return {
      success: true,
      projectName,
      username,
      usernameSource: typeof usernameInfo === 'object' ? usernameInfo.source : 'config',
      localPath: localInfo.localPath,
      fileSize: localInfo.fileSize,
      hasKeyInfo,
      analysis: {
        taskCount: tasks.length,
        keyPointCount: keyPoints.length,
        decisionCount: decisions.length
      }
    };
  } catch (error) {
    let suggestion = '请检查错误信息并重试';
    
    if (error.code === 'EACCES') {
      suggestion = '请检查目录权限或使用 -d 参数指定其他目录';
    } else if (error.code === 'ENOSPC') {
      suggestion = '请清理磁盘空间或使用 -d 参数指定其他磁盘';
    } else if (error.code === 'EROFS') {
      suggestion = '请检查文件系统状态或联系系统管理员';
    }
    
    return {
      success: false,
      error: error.message,
      suggestion
    };
  }
}

function listNotes(options = {}) {
  const notesDirResult = getProjectNotesDir(options.dir);
  const notesDir = notesDirResult.path;
  
  if (!fs.existsSync(notesDir)) {
    return [];
  }
  
  const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.json'));
  const notes = [];
  
  files.forEach(file => {
    const filePath = path.join(notesDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      notes.push({
        fileName: file,
        localPath: filePath,
        projectName: content.projectName || 'unknown',
        username: content.username || 'unknown',
        timestamp: content.timestamp,
        summary: content.summary,
        taskCount: content.tasks ? content.tasks.length : 0,
        keyPointCount: content.keyPoints ? content.keyPoints.length : 0,
        decisionCount: content.decisions ? content.decisions.length : 0
      });
    } catch (e) {
    }
  });
  
  if (options.project) {
    return notes.filter(n => n.projectName === options.project);
  }
  
  return notes.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

module.exports = {
  sync,
  listNotes,
  loadConfig,
  saveConfig,
  extractProjectName,
  getProjectNotesDir,
  getUsername,
  sanitizeUsername,
  parseListParam,
  analyzeContext,
  CONFIG_DIR,
  CONFIG_FILE
};
