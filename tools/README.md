# AI Game Unity 微信小游戏上传工具

这个工具可以帮助你一键将 AI Game Unity 游戏上传到微信小游戏平台。

## 功能特性

- ✅ 自动上传游戏代码到微信平台
- ✅ 生成预览二维码
- ✅ 使用本地私钥进行认证
- ✅ 自动版本管理
- ✅ 进度显示和错误处理

## 前置要求

1. **Node.js**: 确保已安装 Node.js (版本 >= 14.0.0)
2. **私钥文件**: 确保 `tools/private.key` 文件存在
3. **IP 白名单**: 在微信公众平台配置当前服务器的 IP 白名单

## 安装依赖

```bash
cd tools
npm install
```

## 使用方法

### 1. 上传代码到微信平台

```bash
npm run upload
```

这个命令会将游戏代码上传到微信小游戏平台，生成开发版本。

### 2. 生成预览二维码

```bash
npm run preview
```

这个命令会生成预览二维码，可用于在微信中预览游戏。

### 3. 查看帮助

```bash
npm run help
```

## 配置说明

### 主要配置项

- **AppID**: `wx830f47b724e6ae8b`
- **私钥路径**: 使用本地的 `private.wx830f47b724e6ae8b.key`
- **项目路径**: `../game` (ai-game-unity 的游戏目录)
- **版本号**: 从 `package.json` 读取或使用默认值

### 自定义配置

如需修改配置，请编辑 `upload.js` 文件中的 `config` 对象：

```javascript
const config = {
  appid: 'wx830f47b724e6ae8b',           // 你的 AppID
  privateKeyPath: path.join(__dirname, 'private.wx830f47b724e6ae8b.key'),
  projectPath: path.join(__dirname, '../game'),
  version: getVersion(),                  // 版本号
  desc: 'AI Game Unity - 基于ECS框架的打砖块游戏', // 版本描述
  // ... 其他配置
};
```

## 上传流程

1. **配置检查**: 验证私钥文件、项目目录和必要文件
2. **项目验证**: 检查 `project.config.json` 配置
3. **代码上传**: 使用 miniprogram-ci 上传代码
4. **进度显示**: 实时显示上传进度
5. **结果反馈**: 显示上传结果和后续步骤

## 常见问题

### Q: 上传失败，提示 "IP 不在白名单内"
A: 请在微信公众平台 -> 开发管理 -> 开发设置 -> 小程序代码上传 -> IP 白名单中添加当前服务器 IP。

### Q: 找不到私钥文件
A: 确保 `tools/private.wx830f47b724e6ae8b.key` 文件存在，或修改 `privateKeyPath` 配置。

### Q: 版本号不正确
A: 检查 `package.json` 文件中的版本号配置，或修改 `getVersion()` 函数。

### Q: 依赖安装失败
A: 确保 Node.js 版本 >= 14.0.0，并尝试使用 `npm install --force`。

## 文件结构

```
ai-game-unity/tools/
├── upload.js          # 主上传脚本
├── package.json       # 工具配置和依赖
├── README.md          # 说明文档
└── preview-qrcode.jpg # 预览二维码（运行时生成）
```

## 技术支持

如有问题，请检查：
1. Node.js 版本是否符合要求
2. 私钥文件是否存在且正确
3. 网络连接是否正常
4. IP 白名单是否配置正确

## 版本历史

- v1.0.0: 初始版本，支持代码上传和预览功能