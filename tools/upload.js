/**
 * 微信小游戏自动化上传脚本
 * 
 * 这个脚本可以帮助你一键上传游戏到微信平台！
 * 不用每次都打开微信开发者工具手动上传了。
 * 
 * 使用方法：
 * 1. 先配置好下面的 appid 和 privateKeyPath
 * 2. 运行: npm run upload
 * 
 * 注意：
 * - 需要先在微信公众平台下载代码上传密钥
 * - 需要配置 IP 白名单
 */

const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

// ==================== 配置区域 ====================
// 请根据你的实际情况修改以下配置

// 读取版本配置文件（ai-game-unity项目没有config目录，使用默认配置）
let versionConfig = {
  version: '1.0.0',
  description: 'AI游戏Unity风格框架 - 初始版本'
};

const config = {
  // 小游戏的 AppID（在微信公众平台获取）
  appid: 'wx830f47b724e6ae8b',
  
  // 代码上传密钥文件路径
  // 在微信公众平台 -> 开发管理 -> 开发设置 -> 小程序代码上传 下载
  privateKeyPath: path.join(__dirname, 'private.key'),
  
  // 游戏代码目录
  projectPath: path.join(__dirname, '../game'),
  
  // 版本号（从配置文件读取）
  version: versionConfig.version,
  
  // 版本描述（从配置文件读取）
  desc: versionConfig.description,
  
  // 是否启用 ES6 转 ES5
  es6: true,
  
  // 是否压缩代码
  minify: true
};

// ==================== 上传逻辑 ====================

/**
 * 检查配置是否完整
 */
function checkConfig() {
  console.log('📋 检查配置...');
  
  // 检查 AppID
  if (config.appid === 'wx1234567890abcdef') {
    console.warn('⚠️  警告: 请修改 config.appid 为你的真实 AppID');
  }
  
  // 检查密钥文件
  if (!fs.existsSync(config.privateKeyPath)) {
    console.error('❌ 错误: 找不到代码上传密钥文件');
    console.error(`   请将密钥文件放到: ${config.privateKeyPath}`);
    console.error('   密钥下载地址: 微信公众平台 -> 开发管理 -> 开发设置 -> 小程序代码上传');
    return false;
  }
  
  // 检查项目目录
  if (!fs.existsSync(config.projectPath)) {
    console.error('❌ 错误: 找不到游戏目录');
    console.error(`   预期路径: ${config.projectPath}`);
    return false;
  }
  
  console.log('✅ 配置检查通过');
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
    ignores: ['node_modules/**/*']
  });
}

/**
 * 上传代码
 */
async function upload() {
  console.log('\n🚀 开始上传代码...\n');
  
  const project = createProject();
  
  try {
    const uploadResult = await ci.upload({
      project,
      version: config.version,
      desc: config.desc,
      setting: {
        es6: config.es6,
        minify: config.minify,
        autoPrefixWXSS: false,
        minifyWXML: config.minify
      },
      onProgressUpdate: (progress) => {
        // 显示上传进度
        const percent = Math.round(progress._progress);
        const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
        process.stdout.write(`\r   上传进度: [${bar}] ${percent}%`);
      }
    });
    
    console.log('\n\n✅ 上传成功！');
    console.log('📦 版本号:', config.version);
    console.log('📝 描述:', config.desc);
    console.log('\n下一步:');
    console.log('1. 登录微信公众平台');
    console.log('2. 进入 版本管理 -> 开发版本');
    console.log('3. 将此版本提交审核或设为体验版');
    
  } catch (error) {
    console.error('\n\n❌ 上传失败！');
    console.error('错误信息:', error.message);
    
    // 常见错误提示
    if (error.message.includes('ip')) {
      console.error('\n💡 提示: 可能是 IP 白名单问题');
      console.error('   请在微信公众平台添加当前 IP 到白名单');
    } else if (error.message.includes('key') || error.message.includes('private')) {
      console.error('\n💡 提示: 可能是密钥文件问题');
      console.error('   请检查 private.key 文件是否正确');
    }
    
    process.exit(1);
  }
}

/**
 * 预览代码（生成二维码）
 */
async function preview() {
  console.log('\n🔍 生成预览二维码...\n');
  
  const project = createProject();
  const qrcodePath = path.join(__dirname, 'preview-qrcode.jpg');
  
  try {
    await ci.preview({
      project,
      desc: `预览版本 - ${config.version}`,
      setting: {
        es6: config.es6,
        minify: false  // 预览时不压缩，方便调试
      },
      qrcodeFormat: 'image',
      qrcodeOutputDest: qrcodePath,
      onProgressUpdate: (progress) => {
        const percent = Math.round(progress._progress);
        const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
        process.stdout.write(`\r   生成进度: [${bar}] ${percent}%`);
      }
    });
    
    console.log('\n\n✅ 预览二维码已生成！');
    console.log('📱 二维码位置:', qrcodePath);
    console.log('\n请使用微信扫描二维码预览小游戏');
    
  } catch (error) {
    console.error('\n\n❌ 生成预览失败！');
    console.error('错误信息:', error.message);
    process.exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║    🎮 微信小游戏自动化上传工具         ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  // 检查配置
  if (!checkConfig()) {
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
  console.error('发生未知错误:', error);
  process.exit(1);
});
