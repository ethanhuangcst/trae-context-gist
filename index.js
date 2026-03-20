/**
 * trae-context-gist Skill - TRAE CN 上下文管理技能
 * 自动整理对话上下文，生成结构化笔记并存储到 GitHub Gist
 */

const fs = require('fs');
const path = require('path');

/**
 * 从对话历史中提取项目名称
 * @param {string} conversationHistory - 对话历史
 * @returns {string} 项目名称
 */
function extractProjectName(conversationHistory) {
  const globalTraeDir = path.join(process.env.HOME || '/Users/ethanhuang', '.trae');
  
  function findProjectRoot(startDir) {
    let currentDir = path.resolve(startDir);
    for (let i = 0; i < 20; i++) {
      if (currentDir === globalTraeDir || currentDir.startsWith(globalTraeDir + path.sep)) {
        return null;
      }
      
      const traeDir = path.join(currentDir, '.trae');
      if (fs.existsSync(traeDir)) {
        return currentDir;
      }
      
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }
    return null;
  }
  
  let projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    projectRoot = findProjectRoot(path.resolve(__dirname));
  }
  
  if (projectRoot) {
    let projectName = path.basename(projectRoot);
    projectName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return projectName;
  }
  
  return 'default';
}

/**
 * 获取项目特定的笔记目录路径
 * @param {string} projectName - 项目名称
 * @returns {string} 项目笔记目录路径
 */
function getProjectNotesDir() {
  if (process.env.LOCAL_NOTES_DIR) {
    const notesDir = process.env.LOCAL_NOTES_DIR;
    if (!path.isAbsolute(notesDir)) {
      return path.join(__dirname, notesDir);
    } else {
      return notesDir;
    }
  }
  
  const globalTraeDir = path.join(process.env.HOME || '/Users/ethanhuang', '.trae');
  const skillDir = path.resolve(__dirname);
  
  function findProjectRoot(startDir) {
    let currentDir = path.resolve(startDir);
    for (let i = 0; i < 20; i++) {
      if (currentDir === globalTraeDir || currentDir.startsWith(globalTraeDir + path.sep)) {
        return null;
      }
      
      const traeDir = path.join(currentDir, '.trae');
      if (fs.existsSync(traeDir)) {
        return currentDir;
      }
      
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }
    return null;
  }
  
  let projectRoot = findProjectRoot(process.cwd());
  
  if (!projectRoot) {
    projectRoot = findProjectRoot(skillDir);
  }
  
  if (!projectRoot) {
    return path.join(skillDir, 'notes');
  }
  
  return path.join(projectRoot, '.trae', 'notes');
}

// 加载环境变量
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

/**
 * 获取本地笔记目录路径
 * @returns {string} 本地笔记目录路径
 */
function getNotesDir() {
  // 默认使用技能目录下的 notes 文件夹
  return path.join(__dirname, 'notes');
}

/**
 * 分析对话上下文
 * @param {string} conversationHistory - 对话历史（支持纯文本和 JSON 格式）
 * @returns {object} 分析结果
 */
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
          skill: 'trae-context-gist',
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
      skill: 'trae-context-gist',
      format: 'text'
    }
  };
}

/**
 * 保存笔记到本地
 * @param {object} content - 笔记内容
 * @param {string} fileName - 文件名
 * @param {string} projectName - 项目名称
 * @returns {object} 本地笔记信息
 */
function saveNoteToLocal(content, fileName, projectName) {
  const notesDir = getProjectNotesDir();
  
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }
  
  const notePath = path.join(notesDir, fileName);
  fs.writeFileSync(notePath, JSON.stringify(content, null, 2));
  
  return {
    fileName,
    localPath: notePath,
    projectName,
    savedAt: new Date().toISOString()
  };
}

/**
 * 上传到 GitHub Gist
 * @param {object} content - 要上传的内容
 * @param {string} fileName - 文件名
 * @param {string} projectName - 项目名称
 * @returns {Promise<object>} Gist 信息
 */
const MAX_GIST_FILES = 50;

const GIST_MAPPING_FILE = path.join(__dirname, 'gist-mapping.json');

function getGistMapping() {
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
  fs.writeFileSync(GIST_MAPPING_FILE, JSON.stringify(mapping, null, 2));
}

function getGistIdForProject(projectName) {
  const mapping = getGistMapping();
  return mapping[projectName] || null;
}

function setGistIdForProject(projectName, gistId) {
  const mapping = getGistMapping();
  mapping[projectName] = gistId;
  saveGistMapping(mapping);
}

async function uploadToGist(content, fileName, projectName) {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    throw new Error('GitHub Token 未配置，请检查 .env 文件');
  }
  
  let fetchFn;
  if (typeof fetch !== 'undefined') {
    fetchFn = fetch;
  } else {
    try {
      const nodeFetch = require('node-fetch');
      fetchFn = nodeFetch;
    } catch (e) {
      throw new Error('无法找到 fetch 函数，请安装 node-fetch: npm install node-fetch');
    }
  }
  
  const description = `TRAE CN - ${projectName}`;
  const existingGistId = getGistIdForProject(projectName);
  
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
  setGistIdForProject(projectName, gistInfo.id);
  
  return gistInfo;
}

/**
 * 更新本地索引
 * @param {object} gistInfo - Gist 信息
 * @param {object} localInfo - 本地笔记信息
 * @returns {object} 更新后的索引
 */
function updateLocalIndex(gistInfo, localInfo) {
  const indexPath = path.join(__dirname, 'index.json');
  let index = {};
  
  if (fs.existsSync(indexPath)) {
    try {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch (e) {
      index = {};
    }
  }
  
  const fileName = gistInfo ? Object.keys(gistInfo.files)[0] : localInfo.fileName;
  
  const indexEntry = {
    fileName,
    projectName: localInfo.projectName || 'default',
    createdAt: gistInfo ? gistInfo.created_at : localInfo.savedAt,
    updatedAt: gistInfo ? gistInfo.updated_at : localInfo.savedAt,
    url: gistInfo ? gistInfo.html_url : null,
    description: gistInfo ? gistInfo.description : `TRAE CN 上下文笔记（本地）- ${localInfo.projectName || 'default'}`,
    localPath: localInfo.localPath,
    syncStatus: gistInfo ? 'synced' : 'local-only'
  };
  
  if (gistInfo) {
    index[gistInfo.id] = indexEntry;
  } else {
    // 如果没有 gistInfo，使用文件名作为 key
    const fileKey = fileName.replace('.json', '');
    index[fileKey] = indexEntry;
  }
  
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  return index;
}

/**
 * 搜索笔记
 * @param {string} keyword - 关键词
 * @param {string} projectName - 项目名称（可选）
 * @returns {Array} 匹配的笔记
 */
function searchNotes(keyword, projectName) {
  const indexPath = path.join(__dirname, 'index.json');
  if (!fs.existsSync(indexPath)) {
    return [];
  }
  
  try {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const results = [];
    
    // 搜索逻辑
    Object.entries(index).forEach(([id, info]) => {
      // 如果指定了项目名称，先检查项目名称
      if (projectName && info.projectName !== projectName) {
        return;
      }
      
      // 关键词搜索
      if (info.fileName.includes(keyword) || 
          (info.description && info.description.includes(keyword)) ||
          (info.projectName && info.projectName.includes(keyword))) {
        results.push({ id, ...info });
      }
    });
    
    return results;
  } catch (e) {
    return [];
  }
}

/**
 * 主技能函数 - 处理上下文
 * @param {string} conversationHistory - 对话历史
 * @returns {Promise<object>} 处理结果
 */
async function processContext(conversationHistory) {
  try {
    // 分析上下文
    const analysis = analyzeContext(conversationHistory);
    
    // 提取项目名称
    const projectName = extractProjectName(conversationHistory);
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `context_${timestamp}.json`;
    
    // 首先保存到本地
    const localInfo = saveNoteToLocal(analysis, fileName, projectName);
    
    // 尝试上传到 Gist
    let gistInfo = null;
    let gistUploadSuccess = true;
    let gistError = null;
    
    try {
      gistInfo = await uploadToGist(analysis, fileName, projectName);
    } catch (error) {
      gistUploadSuccess = false;
      gistError = error.message;
      console.warn(`警告：Gist 同步失败，但本地已保存：${error.message}`);
    }
    
    // 更新本地索引
    updateLocalIndex(gistInfo, localInfo);
    
    if (gistUploadSuccess) {
      return {
        success: true,
        message: `上下文已整理并同步到云端和本地（项目：${projectName}）`,
        gistUrl: gistInfo.html_url,
        gistId: gistInfo.id,
        localPath: localInfo.localPath,
        projectName: projectName,
        syncStatus: 'success',
        analysis: {
          summary: analysis.summary,
          taskCount: analysis.tasks.length,
          keyPointCount: analysis.keyPoints.length,
          decisionCount: analysis.decisions.length
        }
      };
    } else {
      return {
        success: true, // 本地保存成功，所以整体算成功
        message: `上下文已整理并保存到本地，但同步到 Gist 失败：${gistError}（项目：${projectName}）`,
        localPath: localInfo.localPath,
        projectName: projectName,
        syncStatus: 'local-only',
        error: gistError,
        analysis: {
          summary: analysis.summary,
          taskCount: analysis.tasks.length,
          keyPointCount: analysis.keyPoints.length,
          decisionCount: analysis.decisions.length
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `处理失败：${error.message}`,
      error: error.message
    };
  }
}

/**
 * 获取所有笔记
 * @param {string} projectName - 项目名称（可选）
 * @returns {Array} 笔记列表
 */
function getAllNotes(projectName) {
  const indexPath = path.join(__dirname, 'index.json');
  if (!fs.existsSync(indexPath)) {
    return [];
  }
  
  try {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const notes = Object.entries(index).map(([id, info]) => ({ id, ...info }));
    
    // 如果指定了项目名称，过滤结果
    if (projectName) {
      return notes.filter(note => note.projectName === projectName);
    }
    
    return notes;
  } catch (e) {
    return [];
  }
}

/**
 * 加载本地笔记内容
 * @param {string} noteId - 笔记 ID 或文件名
 * @returns {object|null} 笔记内容
 */
function loadNoteContent(noteId) {
  // 获取本地笔记目录（支持配置）
  const notesDir = getNotesDir();
  
  // 尝试从索引中查找
  const indexPath = path.join(__dirname, 'index.json');
  if (fs.existsSync(indexPath)) {
    try {
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const note = index[noteId];
      
      if (note && note.localPath && fs.existsSync(note.localPath)) {
        return JSON.parse(fs.readFileSync(note.localPath, 'utf8'));
      }
      
      // 如果索引中没有，尝试直接查找文件
      const possibleFile = path.join(notesDir, `${noteId}.json`);
      if (fs.existsSync(possibleFile)) {
        return JSON.parse(fs.readFileSync(possibleFile, 'utf8'));
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  return null;
}

// 导出技能
module.exports = {
  name: 'trae-context-gist',
  version: '1.0.0',
  description: '自动整理对话上下文并存储到 GitHub Gist（支持本地同步）',
  triggers: {
    manual: ['同步上下文', 'sync context'],
    schedule: 'hourly',
    autoOnEnd: true
  },
  execute: processContext,
  search: searchNotes,
  getAll: getAllNotes,
  analyze: analyzeContext,
  loadNote: loadNoteContent
};
