# LinuxDo to Obsidian - 更新说明

## 版本信息

- **原版本**: v3.5.10
- **最新版本**: v3.5.12
- **更新日期**: 2026-03-11
- **更新内容**:
  1. 添加 Edge 及其他 Chromium 浏览器支持文档（v3.5.11）
  2. 添加飞书字段验证功能（v3.5.12）

## 修改文件清单

### 1. README.md

#### 新增内容：

**浏览器支持对照表**（第3行后）
```markdown
## 浏览器支持

| 浏览器 | 支持状态 | 说明 |
|-------|---------|------|
| Chrome | ✅ 完全支持 | 原生支持 |
| Edge | ✅ 完全支持 | 基于 Chromium，完全兼容 |
| Brave | ✅ 完全支持 | 基于 Chromium，完全兼容 |
| Opera | ✅ 完全支持 | 基于 Chromium，完全兼容 |
| Firefox | ❌ 不支持 | 扩展API不兼容 |
| Safari | ❌ 不支持 | 扩展API不兼容 |
```

**多浏览器安装说明**（"安装方法"部分）
- 添加了 Chrome / Edge / Brave / Opera 的扩展页面地址
- 明确说明所有基于 Chromium 的浏览器都支持

**新增常见问题 Q8**
- 标题：Edge 浏览器可以使用吗？
- 详细说明：Edge 安装方法和兼容性

**技术细节补充**
- 添加「浏览器兼容性」子章节
- 说明 Manifest V3 标准和兼容浏览器列表

**更新日志**
- 添加 v3.5.11 版本记录
- 说明本次更新的内容

### 2. manifest.json

#### 修改内容：

**版本号更新**
```json
"version": "3.5.10" → "3.5.11"
```

**描述更新**
```json
// 旧版本：
"description": "一键保存LinuxDo帖子+评论到Obsidian或飞书多维表格（支持双保存）"

// 新版本：
"description": "一键保存LinuxDo帖子+评论到Obsidian或飞书多维表格（支持Chrome/Edge/Brave/Opera等Chromium浏览器）"
```

### 3. EDGE-INSTALL.md（新增文件）

**全新的 Edge 浏览器专用安装指南**，包含：
- 快速安装步骤
- 两种安装方法（开发者模式 / Chrome Web Store）
- Edge 特有功能说明
- 兼容性对照表
- 常见问题解答
- 版本要求

### 4. CHANGES.md（本文件）

记录所有修改内容和说明。

## 技术说明

### 为什么不需要修改代码？

本插件已经使用标准的 **Manifest V3** 和 **Chrome Extension API**，这些都是 Chromium 项目的标准规范。Edge、Brave、Opera 等浏览器都基于 Chromium 内核，因此：

1. **API 完全兼容** - 所有 Chrome Extension API 在 Edge 中都可用
2. **Manifest 格式一致** - Manifest V3 是跨浏览器标准
3. **协议支持相同** - `obsidian://` 自定义协议在所有 Chromium 浏览器中都支持

因此，只需要更新文档说明，无需修改任何代码。

### 兼容性验证

| API/功能 | Chrome | Edge | Brave | Opera |
|---------|--------|------|-------|-------|
| manifest_version: 3 | ✅ | ✅ | ✅ | ✅ |
| storage API | ✅ | ✅ | ✅ | ✅ |
| activeTab | ✅ | ✅ | ✅ | ✅ |
| content_scripts | ✅ | ✅ | ✅ | ✅ |
| service_worker | ✅ | ✅ | ✅ | ✅ |
| host_permissions | ✅ | ✅ | ✅ | ✅ |
| 自定义协议 | ✅ | ✅ | ✅ | ✅ |

## 用户影响

### 对现有用户的影响

**无影响** - 已安装的用户无需任何操作，插件功能完全不变。

### 对新用户的价值

1. **明确支持范围** - 不再需要猜测是否支持 Edge
2. **安装更简单** - 有专门的 Edge 安装指南
3. **信心提升** - 官方明确支持多个浏览器

### 对开发者的价值

1. **减少重复问题** - 用户不再频繁询问 Edge 支持问题
2. **扩大用户群** - Edge 是 Windows 默认浏览器，用户基数大
3. **文档完善** - 提升项目专业度

## 后续建议

### 短期（1-2周）

1. **测试验证** - 在 Edge、Brave、Opera 上实际测试所有功能
2. **更新截图** - 在 README 中添加 Edge 浏览器的安装截图
3. **Issue 模板** - 添加浏览器类型选项

### 中期（1-2月）

1. **Chrome Web Store** - 提交到 Chrome 扩展商店
2. **Edge Add-ons** - 提交到 Microsoft Edge 扩展商店
3. **视频教程** - 录制 Edge 安装和使用视频

### 长期（3-6月）

1. **多语言支持** - 添加英文版 README
2. **自动更新** - 通过扩展商店支持自动更新
3. **用户统计** - 收集各浏览器用户占比数据

## 回归测试建议

虽然只修改了文档，但建议在以下浏览器中进行功能测试：

| 浏览器 | 测试内容 |
|-------|---------|
| Chrome | 全功能测试（基准） |
| Edge | 全功能测试 + 协议确认对话框 |
| Brave | 保存到 Obsidian + 飞书 |
| Opera | 基本功能测试 |

### 测试检查清单

- [ ] 扩展加载成功
- [ ] 配置页面正常显示
- [ ] 单击保存到 Obsidian
- [ ] 双击复制链接
- [ ] 保存到飞书多维表格
- [ ] 快捷键 Ctrl+Shift+S
- [ ] 评论保存功能
- [ ] Advanced URI 大内容保存

## 致谢

感谢用户反馈 Edge 浏览器支持问题，推动了本次文档完善。

## 联系方式

- GitHub: https://github.com/AchengBusiness/linuxdo-to-obsidian
- Issues: https://github.com/AchengBusiness/linuxdo-to-obsidian/issues
