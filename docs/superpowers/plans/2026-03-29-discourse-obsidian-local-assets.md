# Discourse Obsidian Local Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Base64 image embedding with local Obsidian asset files, add local asset folder selection, and clarify the Obsidian settings UI.

**Architecture:** Keep the existing Obsidian note export flow, but split image handling into a local-asset pipeline that downloads blobs, writes them into a user-authorized local directory, and rewrites Markdown image references to Obsidian wiki links. Add pure helper functions for naming, path normalization, and Markdown rewrites so behavior can be covered with tests before wiring it into the userscript UI.

**Tech Stack:** Userscript JavaScript, File System Access API, IndexedDB, existing GM_* APIs, Node built-in test runner for pure helpers

---

### Task 1: Add failing tests for path and Markdown rewrite helpers

**Files:**
- Create: `f:\Documents\VSCODE\discourse-saver-main\tests\obsidian-assets.test.js`
- Create: `f:\Documents\VSCODE\discourse-saver-main\tests\helpers\obsidian-assets.js`

- [ ] **Step 1: Write the failing test**

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeVaultPath,
  buildImageFileName,
  inferImageExtension,
  rewriteMarkdownImagesToWikiLinks
} = require('./helpers/obsidian-assets.js');

test('normalizeVaultPath removes duplicate separators and edge slashes', () => {
  assert.equal(normalizeVaultPath('/Discourse收集箱//assets/'), 'Discourse收集箱/assets');
});

test('buildImageFileName uses post title and sequence number', () => {
  assert.equal(buildImageFileName('Hello World', 2, 'png'), 'Hello World-2.png');
});

test('inferImageExtension prefers mime type and falls back to url suffix', () => {
  assert.equal(inferImageExtension('image/webp', 'https://a/b/c.png'), 'webp');
  assert.equal(inferImageExtension('', 'https://a/b/c.jpeg?x=1'), 'jpeg');
});

test('rewriteMarkdownImagesToWikiLinks replaces markdown image urls with wiki links', () => {
  const markdown = 'before ![alt](https://cdn.example.com/a.png) after';
  const assets = [{
    originalUrl: 'https://cdn.example.com/a.png',
    wikiPath: 'Discourse收集箱/assets/Hello-1.png'
  }];
  assert.equal(
    rewriteMarkdownImagesToWikiLinks(markdown, assets),
    'before ![[Discourse收集箱/assets/Hello-1.png]] after'
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/obsidian-assets.test.js`

Expected: FAIL with module not found for `./helpers/obsidian-assets.js`

- [ ] **Step 3: Write minimal implementation**

```javascript
const INVALID_FILE_CHARS = /[<>:"/\\|?*]/g;

function normalizeVaultPath(input) {
  return String(input || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/');
}

function sanitizeFilePart(input) {
  return String(input || '')
    .replace(INVALID_FILE_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function inferImageExtension(mimeType, sourceUrl) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) {
    return mime.split('/')[1].replace('jpeg', 'jpg');
  }
  const cleanUrl = String(sourceUrl || '').split('?')[0];
  const match = cleanUrl.match(/\.([a-z0-9]+)$/i);
  if (!match) {
    throw new Error('Unable to infer image extension');
  }
  return match[1].toLowerCase().replace('jpeg', 'jpg');
}

function buildImageFileName(title, index, extension) {
  return `${sanitizeFilePart(title)}-${index}.${extension}`;
}

function rewriteMarkdownImagesToWikiLinks(markdown, assets) {
  return assets.reduce((output, asset) => {
    return output.split(`](${asset.originalUrl})`).join(`]][[${asset.wikiPath}]]`);
  }, markdown).replace(/!\[\]\]\[\[/g, '![[');
}

module.exports = {
  normalizeVaultPath,
  buildImageFileName,
  inferImageExtension,
  rewriteMarkdownImagesToWikiLinks
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/obsidian-assets.test.js`

Expected: PASS for all four tests

- [ ] **Step 5: Commit**

```bash
git add tests/obsidian-assets.test.js tests/helpers/obsidian-assets.js
git commit -m "test: add obsidian asset helper coverage"
```

### Task 2: Extend helper coverage for data URLs and duplicate image ordering

**Files:**
- Modify: `f:\Documents\VSCODE\discourse-saver-main\tests\obsidian-assets.test.js`
- Modify: `f:\Documents\VSCODE\discourse-saver-main\tests\helpers\obsidian-assets.js`

- [ ] **Step 1: Write the failing test**

```javascript
test('inferImageExtension reads extension from data url mime types', () => {
  assert.equal(inferImageExtension('image/png', 'data:image/png;base64,abc'), 'png');
});

test('rewriteMarkdownImagesToWikiLinks preserves duplicate image ordering', () => {
  const markdown = [
    '![a](https://cdn.example.com/a.png)',
    '![b](https://cdn.example.com/a.png)'
  ].join('\n');
  const assets = [
    { originalMarkdown: '![a](https://cdn.example.com/a.png)', wikiPath: 'Discourse收集箱/assets/Hello-1.png' },
    { originalMarkdown: '![b](https://cdn.example.com/a.png)', wikiPath: 'Discourse收集箱/assets/Hello-2.png' }
  ];
  assert.equal(
    rewriteMarkdownImagesToWikiLinks(markdown, assets),
    ['![[Discourse收集箱/assets/Hello-1.png]]', '![[Discourse收集箱/assets/Hello-2.png]]'].join('\n')
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/obsidian-assets.test.js`

Expected: FAIL because helper only rewrites by URL and cannot distinguish duplicates

- [ ] **Step 3: Write minimal implementation**

```javascript
function rewriteMarkdownImagesToWikiLinks(markdown, assets) {
  let output = markdown;
  for (const asset of assets) {
    const source = asset.originalMarkdown || `![](${asset.originalUrl})`;
    output = output.replace(source, `![[${asset.wikiPath}]]`);
  }
  return output;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/obsidian-assets.test.js`

Expected: PASS with duplicate ordering preserved

- [ ] **Step 5: Commit**

```bash
git add tests/obsidian-assets.test.js tests/helpers/obsidian-assets.js
git commit -m "test: cover duplicate image rewriting"
```

### Task 3: Add failing tests for local directory configuration state helpers

**Files:**
- Modify: `f:\Documents\VSCODE\discourse-saver-main\tests\obsidian-assets.test.js`
- Modify: `f:\Documents\VSCODE\discourse-saver-main\tests\helpers\obsidian-assets.js`

- [ ] **Step 1: Write the failing test**

```javascript
const { buildImageFolderPreview, buildNoteFolderPreview } = require('./helpers/obsidian-assets.js');

test('buildImageFolderPreview returns vault-relative preview path', () => {
  assert.equal(
    buildImageFolderPreview('Discourse收集箱/assets', 'Hello', 'png'),
    'Discourse收集箱/assets/Hello-1.png'
  );
});

test('buildNoteFolderPreview returns markdown target path', () => {
  assert.equal(
    buildNoteFolderPreview('Discourse收集箱', 'Hello'),
    'Discourse收集箱/Hello.md'
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/obsidian-assets.test.js`

Expected: FAIL because preview builders are undefined

- [ ] **Step 3: Write minimal implementation**

```javascript
function buildImageFolderPreview(imageFolderPath, title, extension) {
  return `${normalizeVaultPath(imageFolderPath)}/${buildImageFileName(title, 1, extension)}`;
}

function buildNoteFolderPreview(folderPath, title) {
  return `${normalizeVaultPath(folderPath)}/${sanitizeFilePart(title)}.md`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/obsidian-assets.test.js`

Expected: PASS for preview helpers

- [ ] **Step 5: Commit**

```bash
git add tests/obsidian-assets.test.js tests/helpers/obsidian-assets.js
git commit -m "test: add path preview helpers"
```

### Task 4: Wire the tested helper logic into the userscript utility module

**Files:**
- Modify: `f:\Documents\VSCODE\discourse-saver-main\discourse-saver.user.js`

- [ ] **Step 1: Write the failing test**

```javascript
test('rewriteMarkdownImagesToWikiLinks keeps normal links untouched', () => {
  const markdown = '[link](https://example.com) ![img](https://cdn.example.com/a.png)';
  const assets = [{
    originalMarkdown: '![img](https://cdn.example.com/a.png)',
    wikiPath: 'Discourse收集箱/assets/Hello-1.png'
  }];
  assert.equal(
    rewriteMarkdownImagesToWikiLinks(markdown, assets),
    '[link](https://example.com) ![[Discourse收集箱/assets/Hello-1.png]]'
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/obsidian-assets.test.js`

Expected: FAIL if helper implementation rewrites plain links accidentally

- [ ] **Step 3: Write minimal implementation**

```javascript
// Add utility helpers beside sanitizeFileName and export them from UtilModule:
// normalizeVaultPath
// inferImageExtension
// buildImageFileName
// rewriteMarkdownImagesToWikiLinks
// buildImageFolderPreview
// buildNoteFolderPreview
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/obsidian-assets.test.js`

Expected: PASS with helpers still green

- [ ] **Step 5: Commit**

```bash
git add discourse-saver.user.js tests/obsidian-assets.test.js tests/helpers/obsidian-assets.js
git commit -m "refactor: add obsidian asset path helpers"
```

### Task 5: Implement local asset storage module with explicit permission handling

**Files:**
- Modify: `f:\Documents\VSCODE\discourse-saver-main\discourse-saver.user.js`

- [ ] **Step 1: Write the failing test**

```javascript
test('normalizeVaultPath preserves nested asset folders', () => {
  assert.equal(normalizeVaultPath('Discourse收集箱/assets/sub'), 'Discourse收集箱/assets/sub');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/obsidian-assets.test.js`

Expected: FAIL if path normalization breaks nested folders

- [ ] **Step 3: Write minimal implementation**

```javascript
// Add LocalAssetModule with:
// - open database
// - save directory handle
// - load directory handle
// - verify readwrite permission
// - create nested directories from imageFolderPath
// - write file blobs by name
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/obsidian-assets.test.js`

Expected: PASS for helpers; manual console verification shows module loads

- [ ] **Step 5: Commit**

```bash
git add discourse-saver.user.js
git commit -m "feat: add local asset storage module"
```

### Task 6: Replace Base64 image embedding path with local asset export flow

**Files:**
- Modify: `f:\Documents\VSCODE\discourse-saver-main\discourse-saver.user.js`

- [ ] **Step 1: Write the failing test**

```javascript
test('buildImageFileName sanitizes invalid characters in post titles', () => {
  assert.equal(buildImageFileName('A:/B?', 1, 'png'), 'AB-1.png');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/obsidian-assets.test.js`

Expected: FAIL if sanitization is missing or wrong

- [ ] **Step 3: Write minimal implementation**

```javascript
// Replace embedImagesInMarkdown usage in save() with a local asset preparation flow:
// 1. collect markdown images
// 2. fetch each blob
// 3. infer extension
// 4. write blob via LocalAssetModule
// 5. rewrite markdown to wiki links
// 6. abort with explicit error if local asset mode is enabled but no directory handle exists
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/obsidian-assets.test.js`

Expected: PASS for helper tests

- [ ] **Step 5: Commit**

```bash
git add discourse-saver.user.js tests/obsidian-assets.test.js tests/helpers/obsidian-assets.js
git commit -m "feat: export discourse images as local obsidian assets"
```

### Task 7: Update the settings UI for note folder, image folder, and local directory authorization

**Files:**
- Modify: `f:\Documents\VSCODE\discourse-saver-main\discourse-saver.user.js`
- Modify: `f:\Documents\VSCODE\discourse-saver-main\i18n.js`

- [ ] **Step 1: Write the failing test**

```javascript
test('buildImageFolderPreview uses configured assets folder', () => {
  assert.equal(
    buildImageFolderPreview('Discourse收集箱/assets', 'Topic Name', 'jpg'),
    'Discourse收集箱/assets/Topic Name-1.jpg'
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/obsidian-assets.test.js`

Expected: FAIL until preview helper and UI labels use the new field

- [ ] **Step 3: Write minimal implementation**

```javascript
// In the settings panel:
// - add imageFolderPath input
// - add local folder choose button
// - show authorized folder badge/text
// - add local asset mode checkbox
// - demote embedImages to "Base64 compatibility mode"
// - show path preview hints
// - persist imageFolderPath and localImageFolderName
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/obsidian-assets.test.js`

Expected: PASS for helpers; manual UI inspection shows new fields render

- [ ] **Step 5: Commit**

```bash
git add discourse-saver.user.js i18n.js tests/obsidian-assets.test.js tests/helpers/obsidian-assets.js
git commit -m "feat: improve obsidian asset settings ui"
```

### Task 8: Verify the full export flow and document residual constraints

**Files:**
- Modify: `f:\Documents\VSCODE\discourse-saver-main\README.md`
- Modify: `f:\Documents\VSCODE\discourse-saver-main\README_EN.md`

- [ ] **Step 1: Write the failing test**

```javascript
test('buildNoteFolderPreview omits duplicate separators', () => {
  assert.equal(buildNoteFolderPreview('/Discourse收集箱//', 'Hello'), 'Discourse收集箱/Hello.md');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/obsidian-assets.test.js`

Expected: FAIL until helper normalization matches docs/examples

- [ ] **Step 3: Write minimal implementation**

```markdown
Document:
- local asset mode requirements
- File System Access API browser support
- folder authorization flow
- image naming format
- explicit failure behavior when folder access is unavailable
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/obsidian-assets.test.js`

Expected: PASS for helper tests

- [ ] **Step 5: Commit**

```bash
git add README.md README_EN.md tests/obsidian-assets.test.js tests/helpers/obsidian-assets.js
git commit -m "docs: document local obsidian asset mode"
```
