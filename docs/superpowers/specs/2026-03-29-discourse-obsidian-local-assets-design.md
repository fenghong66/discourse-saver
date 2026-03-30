# Discourse Obsidian Local Assets Design

**目标**

将 Discourse 帖子导出到 Obsidian 时，把正文中的图片从 Base64 内嵌改为本地附件文件，降低 Markdown 体积与 Obsidian 打开卡顿；同时改造设置面板，明确区分笔记目录与图片目录，并支持选择本地附件目录。

**范围**

- 修改 [discourse-saver.user.js](/f:/Documents/VSCODE/discourse-saver-main/discourse-saver.user.js) 的 Obsidian 导出链路。
- 为 Obsidian 新增图片目录配置与本地目录选择能力。
- 将图片引用输出改为 Obsidian wiki 链接。
- 保留旧的 Base64 模式作为兼容选项，但不再作为推荐路径。

**非目标**

- 不改动 Notion、Feishu、HTML 导出功能。
- 不引入静默降级或假成功路径。
- 不为浏览器不支持的本地文件 API 提供隐式 fallback。

## 当前问题

现有流程在启用 `embedImages` 时，会将正文内图片转为 Base64 后直接写入 Markdown。这样会带来两个问题：

1. 单个 `.md` 文件尺寸暴涨，Obsidian 打开和滚动明显卡顿。
2. 图片与正文无法分离管理，后续删除帖子附件只能手工清理 Markdown 内容。

此外，现有设置面板仅提供 `folderPath`，没有单独的图片目录配置，也没有本地目录选择入口，导致笔记目录与图片目录语义混乱。

## 设计决策

### 1. 图片改为本地附件

Obsidian 导出新增“本地附件模式”。启用后，图片处理链路不再将图片替换为 Base64，而是：

1. 收集 Markdown 中的图片。
2. 下载图片二进制内容。
3. 生成 `{帖子名}-{序号}.{扩展名}` 文件名。
4. 写入用户选择的本地目录。
5. 将正文中的图片引用改为 `![[相对图片目录/文件名]]`。

### 2. 图片命名规则

- 文件名格式：`{帖子名}-{序号}.{扩展名}`
- 示例：`My Topic-1.png`
- 序号按正文出现顺序从 `1` 开始。
- 不做 URL 去重，重复出现的图片也按出现位置生成编号，方便用户按帖子批量删除。

### 3. 两类路径分离

Obsidian 配置区拆分为：

- `folderPath`：笔记在 vault 中的相对目录，如 `Discourse收集箱`
- `imageFolderPath`：图片在 vault 中的相对目录，如 `Discourse收集箱/assets`

另新增本地目录句柄配置：

- `localImageFolderName`：用户选择的真实本地目录名称，仅用于 UI 展示
- 本地目录句柄通过 File System Access API 获取并缓存，用于实际写入图片文件

这样正文中的链接使用 `imageFolderPath`，实际文件写入使用用户已授权的本地目录句柄，两者保持一致但职责分离。

### 4. 本地目录选择

新增“选择本地图片文件夹”按钮，基于浏览器 File System Access API：

- 用户主动点击按钮后调用 `showDirectoryPicker()`
- 获取目录句柄并验证写权限
- 将句柄缓存到 IndexedDB
- UI 展示当前已授权目录名称

不支持该 API 或权限被撤销时，直接显式报错，不偷偷退回 Base64 或浏览器下载目录。

### 5. 正文引用格式

图片引用统一改写为 Obsidian wiki 链接：

`![[Discourse收集箱/assets/帖子名-1.png]]`

不再使用标准 Markdown 图片链接，保证在 Obsidian 内行为一致。

### 6. 失败暴露

- 单张图片下载失败：正文中保留原始图片链接，并记录错误。
- 本地目录未配置：直接阻止启用本地附件模式并提示用户先授权目录。
- 本地文件写入失败：中断当前 Obsidian 导出并提示失败原因。
- 正文保存成功但图片失败：视为部分失败，通知中必须单独说明。

不允许静默跳过，也不允许自动退回 Base64。

## 架构调整

### UtilModule

新增纯函数与低耦合工具：

- 规范化 vault 相对路径
- 推断图片扩展名
- 生成图片文件名
- 将 Markdown 图片替换为 wiki 链接

### LocalAssetModule

新增本地附件模块，职责包括：

- 目录句柄持久化与读取
- 权限校验
- 递归创建子目录
- 写入图片 Blob

该模块与 Obsidian URI 解耦，只处理本地附件。

### SaveModule

Obsidian 导出顺序改为：

1. 准备图片资源
2. 写入本地图片
3. 生成最终 Markdown
4. 通过现有 Advanced URI 逻辑写入 Markdown

这样 Markdown 中的 wiki 链接尽量指向已存在文件。

### UIModule

Obsidian 设置区新增：

- 图片保存文件夹输入框
- 本地图片目录选择按钮
- 当前已授权目录展示
- 本地附件模式开关

原 `embedImages` 文案降级为“Base64 兼容模式”，放到次级提示区域。

## UI 方案

Obsidian 设置区的推荐结构：

1. 笔记保存位置
2. 图片保存位置
3. 图片处理方式
4. 说明预览
5. 测试笔记保存

其中“图片处理方式”包含两个互斥选项：

- `下载图片到本地并引用（推荐）`
- `嵌入为 Base64（兼容模式）`

并显示路径预览：

- 笔记：`Discourse收集箱/帖子标题.md`
- 图片：`Discourse收集箱/assets/帖子标题-1.png`

## 测试与验收

### 自动验证

- 纯函数测试覆盖路径规范化、文件名生成、Markdown 改写与扩展名推断。
- 本地目录模块测试覆盖路径创建逻辑与错误传播。

### 手工验收

1. 带多张图片的帖子导出后，Markdown 中不再包含 `data:image/`
2. 图片命名符合 `{帖子名}-{序号}`
3. Markdown 使用 `![[...]]`
4. 图片实际落到选中的本地目录
5. 设置面板能保存并回填图片目录配置
6. 权限失效时有明确报错

## 风险与约束

- 本地附件模式依赖 File System Access API，仅在支持该 API 的浏览器可用。
- 目录句柄权限可能被用户或浏览器撤销，需要每次导出前校验。
- 仓库当前 userscript 文件较大，本次只做目标内的局部抽取，不进行无关重构。
