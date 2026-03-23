const assert = require('assert');
const path = require('path');
const fs = require('fs');
const core = require('../src/index');

const TEST_DIR = path.join(__dirname, 'test-output');

function setup() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function testParseListParam() {
  console.log('Test: parseListParam');
  
  assert.deepStrictEqual(core.parseListParam(null), []);
  assert.deepStrictEqual(core.parseListParam(''), []);
  assert.deepStrictEqual(core.parseListParam('task1'), ['task1']);
  assert.deepStrictEqual(core.parseListParam('task1;task2'), ['task1', 'task2']);
  assert.deepStrictEqual(core.parseListParam('task1; task2 ; task3'), ['task1', 'task2', 'task3']);
  assert.deepStrictEqual(core.parseListParam('task1;;task2'), ['task1', 'task2']);
  
  console.log('  ✅ parseListParam tests passed');
}

function testSanitizeUsername() {
  console.log('Test: sanitizeUsername');
  
  assert.strictEqual(core.sanitizeUsername('ethan'), 'ethan');
  assert.strictEqual(core.sanitizeUsername('ethan@work'), 'ethan_work');
  assert.strictEqual(core.sanitizeUsername('user name'), 'user_name');
  assert.strictEqual(core.sanitizeUsername(null), 'unknown');
  assert.strictEqual(core.sanitizeUsername(''), 'unknown');
  
  console.log('  ✅ sanitizeUsername tests passed');
}

function testExtractProjectName() {
  console.log('Test: extractProjectName');
  
  assert.strictEqual(core.extractProjectName('my-project'), 'my-project');
  assert.strictEqual(core.extractProjectName('my project'), 'my_project');
  assert.strictEqual(core.extractProjectName('project@2024'), 'project_2024');
  
  console.log('  ✅ extractProjectName tests passed');
}

async function testSyncWithKeyInfo() {
  console.log('Test: sync with key info');
  
  setup();
  
  const result = await core.sync({
    dir: TEST_DIR,
    project: 'test-project',
    tasks: '任务1;任务2;任务3',
    keypoints: '关键点1;关键点2',
    decisions: '决策1'
  });
  
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.projectName, 'test-project');
  assert.strictEqual(result.hasKeyInfo, true);
  assert.strictEqual(result.analysis.taskCount, 3);
  assert.strictEqual(result.analysis.keyPointCount, 2);
  assert.strictEqual(result.analysis.decisionCount, 1);
  
  const notePath = result.localPath;
  assert.ok(fs.existsSync(notePath));
  
  const noteContent = JSON.parse(fs.readFileSync(notePath, 'utf8'));
  assert.deepStrictEqual(noteContent.tasks, ['任务1', '任务2', '任务3']);
  assert.deepStrictEqual(noteContent.keyPoints, ['关键点1', '关键点2']);
  assert.deepStrictEqual(noteContent.decisions, ['决策1']);
  assert.ok(noteContent.summary.includes('3 个任务'));
  assert.ok(noteContent.summary.includes('2 个关键点'));
  assert.ok(noteContent.summary.includes('1 个决策'));
  
  console.log('  ✅ sync with key info tests passed');
  
  cleanup();
}

async function testSyncWithoutKeyInfo() {
  console.log('Test: sync without key info');
  
  setup();
  
  const result = await core.sync({
    dir: TEST_DIR,
    project: 'test-project'
  });
  
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.hasKeyInfo, false);
  assert.strictEqual(result.analysis.taskCount, 0);
  assert.strictEqual(result.analysis.keyPointCount, 0);
  assert.strictEqual(result.analysis.decisionCount, 0);
  
  const notePath = result.localPath;
  const noteContent = JSON.parse(fs.readFileSync(notePath, 'utf8'));
  assert.strictEqual(noteContent.summary, '手动同步');
  assert.deepStrictEqual(noteContent.tasks, []);
  assert.deepStrictEqual(noteContent.keyPoints, []);
  assert.deepStrictEqual(noteContent.decisions, []);
  
  console.log('  ✅ sync without key info tests passed');
  
  cleanup();
}

async function testSyncWithContent() {
  console.log('Test: sync with content');
  
  setup();
  
  const result = await core.sync({
    dir: TEST_DIR,
    project: 'test-project',
    content: '这是一个测试对话\n任务：完成用户登录功能\n关键点：使用JWT认证\n决定：采用bcrypt加密'
  });
  
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.hasKeyInfo, true);
  assert.ok(result.analysis.taskCount >= 1);
  
  console.log('  ✅ sync with content tests passed');
  
  cleanup();
}

async function testListNotes() {
  console.log('Test: listNotes');
  
  setup();
  
  const result1 = await core.sync({
    dir: TEST_DIR,
    project: 'project-a',
    tasks: '任务A'
  });
  
  const result2 = await core.sync({
    dir: TEST_DIR,
    project: 'project-b',
    tasks: '任务B'
  });
  
  const notes = core.listNotes({ dir: TEST_DIR });
  
  if (notes.length < 2) {
    console.log('  Debug: notes found:', notes.length);
    console.log('  Debug: result1 path:', result1.localPath);
    console.log('  Debug: result2 path:', result2.localPath);
  }
  
  assert.ok(notes.length >= 2, `Expected at least 2 notes, got ${notes.length}`);
  
  const notesA = core.listNotes({ dir: TEST_DIR, project: 'project-a' });
  assert.ok(notesA.length >= 1, 'Should find at least 1 note for project-a');
  assert.ok(notesA.every(n => n.projectName === 'project-a'));
  
  const notesB = core.listNotes({ dir: TEST_DIR, project: 'project-b' });
  assert.ok(notesB.length >= 1, 'Should find at least 1 note for project-b');
  assert.ok(notesB.every(n => n.projectName === 'project-b'));
  
  console.log('  ✅ listNotes tests passed');
  
  cleanup();
}

async function runTests() {
  console.log('\n🧪 Running tests...\n');
  
  try {
    testParseListParam();
    testSanitizeUsername();
    testExtractProjectName();
    await testSyncWithKeyInfo();
    await testSyncWithoutKeyInfo();
    await testSyncWithContent();
    await testListNotes();
    
    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
