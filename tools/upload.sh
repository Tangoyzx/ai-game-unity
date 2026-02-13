#!/bin/bash

# AI Game Unity 微信小游戏上传脚本
# 简化版脚本，方便快速使用

echo "🎮 AI Game Unity 上传工具"
echo "=========================="
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 请先安装 Node.js"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖中..."
    npm install
    echo ""
fi

# 解析参数
case "$1" in
    "upload"|"u")
        echo "🚀 开始上传代码到微信平台..."
        npm run upload
        ;;
    "preview"|"p")
        echo "🔍 生成预览二维码..."
        npm run preview
        ;;
    "help"|"h"|"--help"|"-h")
        npm run help
        ;;
    *)
        echo "使用方法:"
        echo "  ./upload.sh upload    - 上传代码到微信平台"
        echo "  ./upload.sh preview   - 生成预览二维码"
        echo "  ./upload.sh help      - 显示帮助信息"
        echo ""
        echo "或者使用 npm 命令:"
        echo "  npm run upload       - 上传代码"
        echo "  npm run preview      - 生成预览"
        echo ""
        echo "默认操作: 上传代码"
        echo ""
        read -p "请选择操作 (upload/preview/help): " choice
        case "$choice" in
            "upload"|"u"|"")
                echo "🚀 开始上传代码到微信平台..."
                npm run upload
                ;;
            "preview"|"p")
                echo "🔍 生成预览二维码..."
                npm run preview
                ;;
            "help"|"h")
                npm run help
                ;;
            *)
                echo "❌ 无效的选择"
                exit 1
                ;;
        esac
        ;;
esac