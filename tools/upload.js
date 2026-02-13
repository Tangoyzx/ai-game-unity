/**
 * AI Game Unity 微信小游戏自动化上传脚本
 * 
 * 这个脚本可以帮助你一键上传 ai-game-unity 游戏到微信平台
 * 
 * 使用方法：
 * 1. 确保 private.key 存在
 * 2. 运行: node upload.js
 * 
 * 注意：
 * - 需要先在微信公众平台下载代码上传密钥
 * - 需要配置 IP 白名单
 */

const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

// ==================== 配置区域 ====================
// AI Game Unity 独立配置，不依赖 minigame-platform

const config = {
  // 小游戏的 AppID
  appid: 'wx830f47b724e6ae8b',
  
  // 使用本地的代码上传密钥文件
  privateKeyPath: path.join(__dirname, 'private.key'),
  
  // ai-game-unity 游戏代码目录
  projectPath: path.join(__dirname, '../game'),
  
  // 版本号（从 package.json 读取或使用默认值）
  version: getVersion(),
  
  // 版本描述
  desc: 'AI Game Unity - 基于ECS框架的打砖块游戏',
  
  // 是否启用 ES6 转 ES5
  es6: true,
  
  // 是否压缩代码
  minify: true
};

/**
 * 获取版本号
 */
function getVersion() {
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson.version || '1.0.0';
    }
  } catch (error) {
    console.warn('警告: 无法读取 package.json，使用默认版本号');
  }
  return '1.0.0';
}

// ==================== 上传逻辑 ====================

/**
 * 检查配置是否完整
 */
function checkConfig() {
  console.log('检查配置...');
  
  // 检查密钥文件
  if (!fs.existsSync(config.privateKeyPath)) {
    console.error('错误: 找不到代码上传密钥文件');
    console.error('   预期路径: ' + config.privateKeyPath);
    console.error('   请确保 private.key 文件存在于 tools 目录下');
    return false;
  }
  
  // 检查项目目录
  if (!fs.existsSync(config.projectPath)) {
    console.error('错误: 找不到游戏目录');
    console.error('   预期路径: ' + config.projectPath);
    return false;
  }
  
  // 检查必要的游戏文件
  const requiredFiles = [
    'game.js',
    'game.json',
    'project.config.json',
    'js/main.js',
    'js/framework/index.js'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(config.projectPath, file);
    if (!fs.existsSync(filePath)) {
      console.error('错误: 缺少必要文件 ' + file);
      console.error('   预期路径: ' + filePath);
      return false;
    }
  }
  
  console.log('配置检查通过');
  return true;
}

/**
 * 创建项目实例
 */
function createProject() {
  return new ci.Project({
    appid: config.appid,
    type: 'miniGame',
    projectPath: config.projectPath,
    privateKeyPath: config.privateKeyPath,
    ignores: ['node_modules/**/*', 'docs/**/*', 'tools/**/*']
  });
}

/**
 * 上传代码
 */
async function upload() {
  console.log('\n开始上传 AI Game Unity 代码...\n');
  
  const project = createProject();
  
  try {
    const uploadResult = await ci.upload({
      project,
      version: config.version,
      desc: config.desc,
      setting: {
        es6: true,           // ES6 转 ES5
        es7: true,           // ES7 转 ES5
        minify: true,        // 压缩代码
        minifyJS: true,      // 压缩 JS
        minifyWXML: true,    // 压缩 WXML
        minifyWXSS: true,    // 压缩 WXSS
        autoPrefixWXSS: true, // 自动补全 WXSS 前缀
        codeProtect: false,  // 代码保护（混淆）
      },
      onProgressUpdate: (progress) => {
        // 显示上传进度
        const percent = Math.round(progress._progress);
        const bar = '#'.repeat(Math.floor(percent / 5)) + '-'.repeat(20 - Math.floor(percent / 5));
        process.stdout.write('\r   上传进度: [' + bar + '] ' + percent + '%');
      }
    });
    
    console.log('\n\nAI Game Unity 上传成功！');
    console.log('游戏名称: AI Game Unity');
    console.log('版本号: ' + config.version);
    console.log('描述: ' + config.desc);
    console.log('\n下一步:');
    console.log('1. 登录微信公众平台');
    console.log('2. 进入 版本管理 -> 开发版本');
    console.log('3. 将此版本提交审核或设为体验版');
    
  } catch (error) {
    console.error('\n\n上传失败！');
    console.error('错误信息: ' + error.message);
    
    // 常见错误提示
    if (error.message.includes('ip')) {
      console.error('\n提示: 可能是 IP 白名单问题');
      console.error('   请在微信公众平台添加当前 IP 到白名单');
    } else if (error.message.includes('key') || error.message.includes('private')) {
      console.error('\n提示: 可能是密钥文件问题');
      console.error('   请检查 private.key 文件是否正确');
    } else if (error.message.includes('appid')) {
      console.error('\n提示: AppID 不匹配');
      console.error('   请检查 project.config.json 中的 appid 配置');
    }
    
    process.exit(1);
  }
}

/**
 * 预览代码（生成二维码）
 */
async function preview() {
  console.log('\n生成 AI Game Unity 预览二维码...\n');
  
  const project = createProject();
  const qrcodePath = path.join(__dirname, 'preview-qrcode.jpg');
  
  try {
    await ci.preview({
      project,
      desc: 'AI Game Unity 预览 - ' + config.version,
      setting: {
        es6: config.es6,
        minify: false,  // 预览时不压缩，方便调试
        minifyWXML: false,
        minifyWXSS: false,
        autoPrefixWXSS: true,
        uglifyFileName: false
      },
      qrcodeFormat: 'image',
      qrcodeOutputDest: qrcodePath,
      onProgressUpdate: (progress) => {
        const percent = Math.round(progress._progress);
        const bar = '#'.repeat(Math.floor(percent / 5)) + '-'.repeat(20 - Math.floor(percent / 5));
        process.stdout.write('\r   生成进度: [' + bar + '] ' + percent + '%');
      }
    });
    
    console.log('\n\nAI Game Unity 预览二维码已生成！');
    console.log('二维码位置: ' + qrcodePath);
    console.log('游戏: AI Game Unity (基于ECS框架的打砖块游戏)');
    console.log('\n请使用微信扫描二维码预览小游戏');
    
  } catch (error) {
    console.error('\n\n生成预览失败！');
    console.error('错误信息: ' + error.message);
    process.exit(1);
  }
}

/**
 * 检查项目配置
 */
function checkProjectConfig() {
  console.log('检查项目配置...');
  
  try {
    const projectConfigPath = path.join(config.projectPath, 'project.config.json');
    const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
    
    console.log('项目配置信息:');
    console.log('   - AppID: ' + projectConfig.appid);
    console.log('   - 项目名称: ' + projectConfig.projectname);
    console.log('   - 编译类型: ' + projectConfig.compileType);
    console.log('   - 基础库版本: ' + projectConfig.libVersion);
    
    if (projectConfig.appid !== config.appid) {
      console.warn('警告: project.config.json 中的 AppID 与上传配置不一致');
    }
    
    return true;
  } catch (error) {
    console.error('错误: 无法读取或解析 project.config.json');
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('==============================================');
  console.log('    AI Game Unity 微信小游戏上传工具');
  console.log('==============================================\n');
  
  // 检查配置
  if (!checkConfig()) {
    process.exit(1);
  }
  
  // 检查项目配置
  if (!checkProjectConfig()) {
    process.exit(1);
  }
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  const isPreview = args.includes('--preview') || args.includes('-p');
  
  if (isPreview) {
    await preview();
  } else {
    await upload();
  }
}

// 运行主函数
main().catch(error => {
  console.error('发生未知错误: ' + error);
  process.exit(1);
});