/**
 * gctx - Context sync tool
 * 整理对话上下文并同步到 GitHub Gist
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.samectx');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const GIST_MAPPING_FILE = path.join(CONFIG_DIR, 'gist-mapping.json');

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

function getGistMapping() {
  ensureConfigDir();
  if (fs.existsSync(GIST_MAPPING_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(GIST_MAPPING_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveGistMapping(mapping) {
  ensureConfigDir();
  fs.writeFileSync(GIST_MAPPING_FILE, JSON.stringify(mapping, null, 2));
}

function extractProjectName(customName) {
  if (customName) {
    return customName.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  const cwd = process.cwd();
  let projectName = path.basename(cwd);
  return projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getProjectNotesDir(customDir) {
  if (customDir) {
    if (path.isAbsolute(customDir)) {
      return customDir;
    }
    return path.join(process.cwd(), customDir);
  }
  
  if (process.env.LOCAL_NOTES_DIR) {
    const notesDir = process.env.LOCAL_NOTES_DIR;
    if (path.isAbsolute(notesDir)) {
      return notesDir;
    }
    return path.join(process.cwd(), notesDir);
  }
  
  return path.join(process.cwd(), 'samectx-notes');
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
      tool: 'trae-context-gist',
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
  
  return {
    fileName,
    localPath: notePath,
    savedAt: new Date().toISOString()
  };
}

const MAX_GIST_FILES = 50;

async function uploadToGist(content, fileName, projectName, token) {
  let fetchFn;
  if (typeof fetch !== 'undefined') {
    fetchFn = fetch;
  } else {
    try {
      fetchFn = require('node-fetch');
    } catch (e) {
      throw new Error('无法找到 fetch 函数，请安装 node-fetch: npm install node-fetch');
    }
  }
  
  const description = `TRAE CN - ${projectName}`;
  const mapping = getGistMapping();
  const existingGistId = mapping[projectName];
  
  if (existingGistId) {
    try {
      const getResponse = await fetchFn(`https://api.github.com/gists/${existingGistId}`, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'TRAE-CN-ContextManager'
        }
      });
      
      if (getResponse.ok) {
        const existingGist = await getResponse.json();
        const existingFiles = Object.keys(existingGist.files || {});
        
        const files = {};
        
        if (existingFiles.length >= MAX_GIST_FILES) {
          const filesToDelete = existingFiles.slice(0, existingFiles.length - MAX_GIST_FILES + 1);
          filesToDelete.forEach(f => {
            files[f] = null;
          });
        }
        
        files[fileName] = {
          content: JSON.stringify(content, null, 2)
        };
        
        const updateResponse = await fetchFn(`https://api.github.com/gists/${existingGistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'TRAE-CN-ContextManager'
          },
          body: JSON.stringify({
            description: description,
            files: files
          })
        });
        
        if (updateResponse.ok) {
          return await updateResponse.json();
        }
      }
    } catch (e) {
      console.warn(`更新现有 Gist 失败，将创建新 Gist: ${e.message}`);
    }
  }
  
  const files = {};
  files[fileName] = {
    content: JSON.stringify(content, null, 2)
  };
  
  const response = await fetchFn('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'TRAE-CN-ContextManager'
    },
    body: JSON.stringify({
      description: description,
      public: false,
      files: files
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`上传失败 (${response.status}): ${errorText}`);
  }
  
  const gistInfo = await response.json();
  mapping[projectName] = gistInfo.id;
  saveGistMapping(mapping);
  
  return gistInfo;
}

async function sync(options = {}) {
  const config = loadConfig();
  const token = config.githubToken;
  
  if (!token) {
    return {
      success: false,
      error: 'GitHub Token 未配置，请运行: trae-context-gist config --token <your-token>'
    };
  }
  
  const projectName = extractProjectName(options.project);
  const notesDir = getProjectNotesDir(options.dir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `context_${timestamp}.json`;
  
  let content;
  if (options.content) {
    content = analyzeContext(options.content);
  } else {
    content = {
      projectName,
      timestamp: new Date().toISOString(),
      summary: '手动同步',
      metadata: {
        version: '1.0.0',
        tool: 'trae-context-gist'
      }
    };
  }
  
  const localInfo = saveNoteToLocal(content, fileName, notesDir);
  
  let gistInfo = null;
  let gistError = null;
  
  try {
    gistInfo = await uploadToGist(content, fileName, projectName, token);
  } catch (error) {
    gistError = error.message;
  }
  
  return {
    success: true,
    projectName,
    localPath: localInfo.localPath,
    gistUrl: gistInfo ? gistInfo.html_url : null,
    gistError,
    analysis: {
      taskCount: content.tasks ? content.tasks.length : 0,
      keyPointCount: content.keyPoints ? content.keyPoints.length : 0,
      decisionCount: content.decisions ? content.decisions.length : 0
    }
  };
}

function listNotes(options = {}) {
  const notesDir = getProjectNotesDir(options.dir);
  
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
        timestamp: content.timestamp,
        summary: content.summary
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
  analyzeContext,
  CONFIG_DIR,
  CONFIG_FILE
};
