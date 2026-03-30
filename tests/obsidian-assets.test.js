const assert = require('node:assert/strict');

const {
  normalizeVaultPath,
  buildImageFileName,
  inferImageExtension,
  collectMarkdownImages,
  rewriteMarkdownImagesToWikiLinks,
  buildImageFolderPreview,
  buildNoteFolderPreview
} = require('./helpers/obsidian-assets.js');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('normalizeVaultPath removes duplicate separators and edge slashes', () => {
  assert.equal(normalizeVaultPath('/Discourse收集箱//assets/'), 'Discourse收集箱/assets');
});

runTest('buildImageFileName uses post title and sequence number', () => {
  assert.equal(buildImageFileName('Hello World', 2, 'png'), 'Hello World-2.png');
});

runTest('buildImageFileName strips invalid path characters', () => {
  assert.equal(buildImageFileName('A:/B?', 1, 'png'), 'AB-1.png');
});

runTest('inferImageExtension prefers mime type and falls back to url suffix', () => {
  assert.equal(inferImageExtension('image/webp', 'https://a/b/c.png'), 'webp');
  assert.equal(inferImageExtension('', 'https://a/b/c.jpeg?x=1'), 'jpg');
});

runTest('collectMarkdownImages extracts ordered metadata for each markdown image', () => {
  assert.deepEqual(
    collectMarkdownImages([
      'before ![one](https://cdn.example.com/a.png)',
      '![two](data:image/png;base64,abc)'
    ].join('\n')),
    [
      {
        alt: 'one',
        url: 'https://cdn.example.com/a.png',
        index: 1,
        originalMarkdown: '![one](https://cdn.example.com/a.png)'
      },
      {
        alt: 'two',
        url: 'data:image/png;base64,abc',
        index: 2,
        originalMarkdown: '![two](data:image/png;base64,abc)'
      }
    ]
  );
});

runTest('rewriteMarkdownImagesToWikiLinks replaces markdown image urls with wiki links', () => {
  const markdown = 'before ![alt](https://cdn.example.com/a.png) after';
  const assets = [{
    originalMarkdown: '![alt](https://cdn.example.com/a.png)',
    wikiPath: 'Discourse收集箱/assets/Hello-1.png'
  }];

  assert.equal(
    rewriteMarkdownImagesToWikiLinks(markdown, assets),
    'before ![[Discourse收集箱/assets/Hello-1.png]] after'
  );
});

runTest('rewriteMarkdownImagesToWikiLinks preserves duplicate image ordering', () => {
  const markdown = [
    '![a](https://cdn.example.com/a.png)',
    '![b](https://cdn.example.com/a.png)'
  ].join('\n');
  const assets = [
    {
      originalMarkdown: '![a](https://cdn.example.com/a.png)',
      wikiPath: 'Discourse收集箱/assets/Hello-1.png'
    },
    {
      originalMarkdown: '![b](https://cdn.example.com/a.png)',
      wikiPath: 'Discourse收集箱/assets/Hello-2.png'
    }
  ];

  assert.equal(
    rewriteMarkdownImagesToWikiLinks(markdown, assets),
    ['![[Discourse收集箱/assets/Hello-1.png]]', '![[Discourse收集箱/assets/Hello-2.png]]'].join('\n')
  );
});

runTest('buildImageFolderPreview returns vault-relative preview path', () => {
  assert.equal(
    buildImageFolderPreview('Discourse收集箱/assets', 'Hello', 'png'),
    'Discourse收集箱/assets/Hello-1.png'
  );
});

runTest('buildNoteFolderPreview returns markdown target path', () => {
  assert.equal(
    buildNoteFolderPreview('/Discourse收集箱//', 'Hello'),
    'Discourse收集箱/Hello.md'
  );
});
