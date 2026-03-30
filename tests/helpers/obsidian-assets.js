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

function splitVaultPathSegments(input) {
  const normalizedPath = normalizeVaultPath(input);
  return normalizedPath ? normalizedPath.split('/').filter(Boolean) : [];
}

function resolveAssetDirectorySegments(imageFolderPath, rootHandleName) {
  const segments = splitVaultPathSegments(imageFolderPath);
  if (segments.length === 0) {
    return [];
  }

  const lastSegment = segments[segments.length - 1];
  if (rootHandleName === lastSegment) {
    return [];
  }

  if (rootHandleName === segments[0]) {
    return segments.slice(1);
  }

  return segments;
}

function collectMarkdownImages(markdown) {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  return [...String(markdown || '').matchAll(imageRegex)].map((match, index) => ({
    alt: match[1],
    url: match[2],
    index: index + 1,
    originalMarkdown: match[0]
  }));
}

function rewriteMarkdownImagesToWikiLinks(markdown, assets) {
  let output = markdown;
  for (const asset of assets) {
    output = output.replace(asset.originalMarkdown, `![[${asset.wikiPath}]]`);
  }
  return output;
}

function buildImageFolderPreview(imageFolderPath, title, extension) {
  return `${normalizeVaultPath(imageFolderPath)}/${buildImageFileName(title, 1, extension)}`;
}

function buildNoteFolderPreview(folderPath, title) {
  return `${normalizeVaultPath(folderPath)}/${sanitizeFilePart(title)}.md`;
}

module.exports = {
  normalizeVaultPath,
  buildImageFileName,
  splitVaultPathSegments,
  resolveAssetDirectorySegments,
  inferImageExtension,
  collectMarkdownImages,
  rewriteMarkdownImagesToWikiLinks,
  buildImageFolderPreview,
  buildNoteFolderPreview
};
