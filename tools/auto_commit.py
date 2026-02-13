#!/usr/bin/env python3
"""
自动化提交脚本：提交并推送到远端
"""

import subprocess
import os
import sys
from datetime import datetime

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
    
    # 2. 生成时间戳作为提交信息
    commit_message = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"提交信息: {commit_message}")
    
    # 3. 添加所有本地改动
    if run_command("git add .", "添加所有本地改动"):
        print("所有文件已添加到暂存区")
    else:
        print("添加文件失败")
        return
    
    # 4. 提交到本地
    commit_command = f'git commit -m "{commit_message}"'
    if run_command(commit_command, "提交到本地仓库"):
        print("提交成功")
    else:
        print("提交失败")
        return
    
    # 5. 推送到远端
    if run_command("git push", "推送到远端仓库"):
        print("推送成功")
    else:
        print("推送失败")
        return
    
    print("\n=== 自动化提交流程完成 ===")

if __name__ == "__main__":
    main()