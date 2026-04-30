#!/usr/bin/env python3
"""
Claude 简历解析测试工具 - 使用图片方式
将 PDF 转换为图片后发送给 Claude API
"""

import sys
import base64
import json
import urllib.request
import urllib.error
import subprocess
import os
import tempfile
import shutil

# ============================================================================
# 配置变量
# ============================================================================
API_KEY = "sk-76172c7d1d0d3e72061ab03ea915a423f12ea1ef0743d416913af64f2aa44551"
BASE_URL = "https://cc-vibe.com"
MODEL = "claude-opus-4-7"

# ============================================================================
# 工具函数
# ============================================================================

def check_dependencies():
    """检查必要的依赖工具"""
    print("🔍 检查依赖工具...")

    # 检查 pdftoppm (来自 poppler-utils)
    try:
        subprocess.run(["pdftoppm", "-v"], capture_output=True, check=True)
        print("   ✅ pdftoppm 已安装")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("   ❌ pdftoppm 未安装")
        print("\n请安装 poppler-utils:")
        print("   Ubuntu/Debian: sudo apt-get install poppler-utils")
        print("   macOS: brew install poppler")
        return False

def pdf_to_images(pdf_path, output_dir, max_pages=5):
    """
    将 PDF 转换为图片

    Args:
        pdf_path: PDF 文件路径
        output_dir: 输出目录
        max_pages: 最多转换的页数

    Returns:
        list: 图片文件路径列表
    """
    print(f"📄 转换 PDF 为图片 (最多 {max_pages} 页)...")

    try:
        # 使用 pdftoppm 转换 PDF 为 PNG
        # -png: 输出 PNG 格式
        # -l: 限制页数
        # -r 150: 分辨率 150 DPI (平衡质量和大小)
        cmd = [
            "pdftoppm",
            "-png",
            "-l", str(max_pages),
            "-r", "150",
            pdf_path,
            os.path.join(output_dir, "page")
        ]

        subprocess.run(cmd, check=True, capture_output=True)

        # 获取生成的图片文件
        image_files = sorted([
            os.path.join(output_dir, f)
            for f in os.listdir(output_dir)
            if f.startswith("page-") and f.endswith(".png")
        ])

        print(f"   ✅ 成功转换 {len(image_files)} 页")
        for i, img in enumerate(image_files, 1):
            size_mb = os.path.getsize(img) / (1024 * 1024)
            print(f"      第 {i} 页: {size_mb:.2f} MB")

        return image_files

    except subprocess.CalledProcessError as e:
        print(f"   ❌ PDF 转换失败: {e.stderr.decode()}")
        return []

def encode_image(image_path):
    """将图片编码为 base64"""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def call_claude_api(image_paths, api_key, base_url, model):
    """
    调用 Claude API 解析简历图片

    Args:
        image_paths: 图片文件路径列表
        api_key: API Key
        base_url: API Base URL
        model: 模型名称

    Returns:
        dict: API 响应
    """
    print(f"\n🤖 准备 API 请求...")
    print(f"   模型: {model}")
    print(f"   图片数量: {len(image_paths)}")

    # 构建 content 数组
    content = []

    # 添加所有图片
    for i, img_path in enumerate(image_paths, 1):
        print(f"   📸 编码第 {i} 页...")
        img_base64 = encode_image(img_path)
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": img_base64
            }
        })

    # 添加文本提示
    content.append({
        "type": "text",
        "text": """请仔细分析这份简历的所有页面，提取以下关键信息并以 JSON 格式返回：

{
  "basic_info": {
    "name": "姓名",
    "phone": "联系电话",
    "email": "邮箱",
    "location": "所在地",
    "work_years": "工作年限（数字）"
  },
  "education": [
    {
      "school": "学校名称",
      "major": "专业",
      "degree": "学历",
      "start_date": "开始时间",
      "end_date": "结束时间"
    }
  ],
  "work_experience": [
    {
      "company": "公司名称",
      "position": "职位",
      "start_date": "开始时间",
      "end_date": "结束时间",
      "description": "工作描述"
    }
  ],
  "skills": ["技能1", "技能2", "..."],
  "summary": "简历整体评价和亮点总结"
}

请确保：
1. 仔细阅读所有页面的内容
2. 提取完整准确的信息
3. 日期格式统一为 YYYY-MM 或 YYYY.MM
4. 工作年限转换为数字（如"3年"转为3）
5. 返回标准的 JSON 格式"""
    })

    # 构建请求体
    payload = {
        "model": model,
        "max_tokens": 4096,
        "messages": [
            {
                "role": "user",
                "content": content
            }
        ]
    }

    # 构建请求头
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Origin": base_url,
        "Referer": f"{base_url}/",
    }

    # 发送请求
    url = f"{base_url}/v1/messages"
    payload_bytes = json.dumps(payload).encode("utf-8")

    print(f"\n🚀 开始调用 Claude API 解析简历...")
    print(f"📤 使用 image 类型发送 {len(image_paths)} 张图片...")
    print(f"🔗 请求 URL: {url}")
    print(f"📦 请求体大小: {len(payload_bytes) / 1024:.2f} KB")
    print("⏳ 等待 API 响应...")

    try:
        req = urllib.request.Request(url, data=payload_bytes, headers=headers)
        with urllib.request.urlopen(req, timeout=120) as response:
            response_data = response.read().decode("utf-8")
            print("✅ API 调用成功!")
            return json.loads(response_data)

    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"❌ HTTP 错误: {e.code} {e.reason}")
        print(f"📄 错误详情:\n{error_body}")
        return None

    except Exception as e:
        print(f"❌ 请求失败: {str(e)}")
        return None

def main():
    """主函数"""
    print("=" * 80)
    print("📄 Claude 简历解析测试工具 (图片方式)")
    print("=" * 80)
    print()

    # 检查命令行参数
    if len(sys.argv) < 2:
        print("❌ 用法: python3 test_resume_parse_as_image.py <PDF文件路径>")
        sys.exit(1)

    pdf_path = sys.argv[1]

    # 检查文件是否存在
    if not os.path.exists(pdf_path):
        print(f"❌ 文件不存在: {pdf_path}")
        sys.exit(1)

    # 显示配置
    print(f"🔑 API Key: {API_KEY[:20]}...")
    print(f"🌐 Base URL: {BASE_URL}")
    print(f"🤖 Model: {MODEL}")
    print()

    # 检查依赖
    if not check_dependencies():
        sys.exit(1)

    print()
    print("=" * 80)
    print(f"📄 文件信息:")
    print(f"   路径: {pdf_path}")
    print(f"   大小: {os.path.getsize(pdf_path) / (1024 * 1024):.2f} MB")
    print()

    # 创建临时目录
    temp_dir = tempfile.mkdtemp(prefix="resume_parse_")

    try:
        # 转换 PDF 为图片
        image_paths = pdf_to_images(pdf_path, temp_dir, max_pages=5)

        if not image_paths:
            print("❌ PDF 转换失败")
            sys.exit(1)

        # 调用 API
        response = call_claude_api(image_paths, API_KEY, BASE_URL, MODEL)

        if not response:
            print("\n" + "=" * 80)
            print("❌ 简历解析失败")
            print("=" * 80)
            sys.exit(1)

        # 显示 token 使用情况
        if "usage" in response:
            usage = response["usage"]
            print(f"\n📊 Token 使用情况:")
            print(f"   输入 tokens: {usage.get('input_tokens', 0)}")
            print(f"   输出 tokens: {usage.get('output_tokens', 0)}")
            print(f"   总计 tokens: {usage.get('input_tokens', 0) + usage.get('output_tokens', 0)}")

        # 提取响应内容
        if "content" in response and len(response["content"]) > 0:
            content = response["content"][0]
            if content.get("type") == "text":
                result_text = content.get("text", "")

                print(f"\n📝 原始响应:")
                print("=" * 80)
                print(result_text)
                print("=" * 80)

                # 尝试解析 JSON
                print(f"\n🔍 解析 JSON 数据...")
                try:
                    # 尝试提取 markdown 代码块中的 JSON
                    import re
                    code_block_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', result_text)
                    if code_block_match:
                        json_str = code_block_match.group(1)
                    else:
                        # 尝试从响应中提取 JSON
                        json_start = result_text.find("{")
                        json_end = result_text.rfind("}") + 1
                        if json_start >= 0 and json_end > json_start:
                            json_str = result_text[json_start:json_end]
                        else:
                            json_str = result_text

                    if json_str:
                        parsed_data = json.loads(json_str)

                        print("✅ JSON 解析成功!")
                        print("\n📋 解析结果:")
                        print(json.dumps(parsed_data, ensure_ascii=False, indent=2))

                        print("\n" + "=" * 80)
                        print("✅ 简历解析成功!")
                        print("=" * 80)
                    else:
                        print("⚠️  响应中未找到 JSON 格式数据")
                        print("\n" + "=" * 80)
                        print("⚠️  简历解析完成，但未返回结构化数据")
                        print("=" * 80)

                except json.JSONDecodeError as e:
                    print(f"❌ JSON 解析失败: {e}")
                    print(f"   尝试解析的内容: {json_str[:200]}...")
                    print("\n" + "=" * 80)
                    print("❌ 简历解析失败")
                    print("=" * 80)
        else:
            print("❌ API 响应格式异常")
            print(json.dumps(response, ensure_ascii=False, indent=2))

    finally:
        # 清理临时文件
        print(f"\n🧹 清理临时文件: {temp_dir}")
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    main()
