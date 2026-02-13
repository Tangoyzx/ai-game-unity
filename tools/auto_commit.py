#!/usr/bin/env python3
"""
自动化提交脚本：总结本地修改、提交并推送到远端
"""

import subprocess
import os
import sys

def run_command(command, description="", use_login_shell=False):
    """执行shell命令并返回结果
    
    Args:
        command: 要执行的命令
        description: 命令描述
        use_login_shell: 是否使用登录shell（用于需要nvm等环境的命令）
    """
    if description:
        print(f"执行: {description}")
    
    try:
        if use_login_shell:
            # 使用 bash -l -c 来加载登录shell环境（包括nvm等）
            result = subprocess.run(
                ["bash", "-l", "-c", command],
                capture_output=True,
                text=True
            )
        else:
            result = subprocess.run(command, shell=True, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"错误: {result.stderr}")
            return False
        return True
    except Exception as e:
        print(f"执行命令时出错: {e}")
        return False

def get_git_status():
    """获取git状态信息"""
    try:
        result = subprocess.run("git status --porcelain", shell=True, capture_output=True, text=True)
        return result.stdout.strip()
    except Exception as e:
        print(f"获取git状态时出错: {e}")
        return ""

def main():
    # 切换到项目根目录
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(project_root)
    
    print("=== 自动化提交流程开始 ===")
    
    # 1. 检查是否有本地修改
    git_status = get_git_status()
    if not git_status:
        print("没有检测到本地修改，无需提交")
        return
    
    print("检测到以下修改:")
    print(git_status)
    
    # 2. 调用gemini-internal总结本地修改
    print("\n正在调用gemini-internal总结本地修改...")
    
    # 创建LatestChange.md文件路径
    latest_change_file = os.path.join(project_root, "LatestChange.md")
    
    # 使用gemini-interval生成总结
    summary_command = 'gemini-interval -p "总结现有本地修改，长度在三十字以内，放到LatestChange.md中"'
    
    # 使用登录shell来确保nvm环境被加载（gemini-internal安装在nvm的node环境中）
    if run_command(summary_command, "生成修改总结", use_login_shell=True):
        print("修改总结生成成功")
    else:
        print("警告: gemini-internal调用失败，使用默认提交信息")
        # 创建默认的提交信息
        with open(latest_change_file, 'w', encoding='utf-8') as f:
            f.write("自动提交: 本地修改更新")
    
    # 3. 读取LatestChange.md内容作为提交信息
    try:
        with open(latest_change_file, 'r', encoding='utf-8') as f:
            commit_message = f.read().strip()
        
        if not commit_message:
            commit_message = "自动提交: 本地修改更新"
            
        print(f"提交信息: {commit_message}")
        
    except FileNotFoundError:
        print("警告: LatestChange.md文件未找到，使用默认提交信息")
        commit_message = "自动提交: 本地修改更新"
    
    # 4. 添加所有本地改动
    if run_command("git add .", "添加所有本地改动"):
        print("所有文件已添加到暂存区")
    else:
        print("添加文件失败")
        return
    
    # 5. 提交到本地
    commit_command = f'git commit -m "{commit_message}"'
    if run_command(commit_command, "提交到本地仓库"):
        print("提交成功")
    else:
        print("提交失败")
        return
    
    # 6. 推送到远端
    if run_command("git push", "推送到远端仓库"):
        print("推送成功")
    else:
        print("推送失败")
        return
    
    print("\n=== 自动化提交流程完成 ===")

if __name__ == "__main__":
    main()