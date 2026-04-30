#!/usr/bin/env python3
"""
测试 document 类型的 PDF 解析 - 完全模拟浏览器扩展的实现
"""

import sys
import base64
import json
import urllib.request
import urllib.error
import os

# ============================================================================
# 配置
# ============================================================================
API_KEY = "sk-76172c7d1d0d3e72061ab03ea915a423f12ea1ef0743d416913af64f2aa44551"
BASE_URL = "https://cc-vibe.com"
MODEL = "claude-opus-4-7"

def test_document_type(pdf_path):
    """测试 document 类型（完全按照 claude.ts 的实现）"""

    print("=" * 80)
    print("📄 测试 document 类型 PDF 解析")
    print("=" * 80)
    print()

    # 检查文件
    if not os.path.exists(pdf_path):
        print(f"❌ 文件不存在: {pdf_path}")
        return False

    file_size = os.path.getsize(pdf_path)
    print(f"📄 文件信息:")
    print(f"   路径: {pdf_path}")
    print(f"   大小: {file_size / (1024 * 1024):.2f} MB")
    print()

    # 读取并编码 PDF（完全按照 claude.ts 的方式）
    print("📖 读取 PDF 文件...")
    with open(pdf_path, 'rb') as f:
        pdf_data = f.read()

    print(f"✅ 读取成功，大小: {len(pdf_data)} bytes")
    print()

    print("🔄 Base64 编码...")
    base64_data = base64.b64encode(pdf_data).decode('utf-8')
    print(f"✅ 编码完成，长度: {len(base64_data)}")
    print()

    # 构建请求（完全按照 claude.ts 的结构）
    question = """请仔细分析这份简历，提取以下关键信息并以 JSON 格式返回：

{
  "basic_info": {
    "name": "姓名",
    "phone": "联系电话",
    "email": "邮箱",
    "location": "所在地",
    "work_years": "工作年限"
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
  "skills": ["技能1", "技能2"],
  "summary": "简历整体评价"
}"""

    # 构建 content 数组（完全按照 claude.ts）
    content = [
        {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": base64_data
            }
        },
        {
            "type": "text",
            "text": question
        }
    ]

    payload = {
        "model": MODEL,
        "max_tokens": 8192,
        "messages": [
            {
                "role": "user",
                "content": content
            }
        ]
    }

    # 构建请求头
    headers = {
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Origin": BASE_URL,
        "Referer": f"{BASE_URL}/"
    }

    print("🚀 调用 API...")
    print(f"   URL: {BASE_URL}/v1/messages")
    print(f"   Model: {MODEL}")
    print(f"   Content 类型: document + text")
    print()

    try:
        url = f"{BASE_URL}/v1/messages"
        payload_bytes = json.dumps(payload).encode('utf-8')

        print(f"📦 请求体大小: {len(payload_bytes) / 1024:.2f} KB")
        print("⏳ 等待响应...")
        print()

        req = urllib.request.Request(url, data=payload_bytes, headers=headers)

        with urllib.request.urlopen(req, timeout=120) as response:
            response_data = response.read().decode('utf-8')
            result = json.loads(response_data)

        print("✅ API 调用成功!")
        print()

        # 显示 token 使用情况
        if 'usage' in result:
            usage = result['usage']
            print("📊 Token 使用情况:")
            print(f"   输入 tokens: {usage.get('input_tokens', 0)}")
            print(f"   输出 tokens: {usage.get('output_tokens', 0)}")
            print(f"   总计: {usage.get('input_tokens', 0) + usage.get('output_tokens', 0)}")

            if 'cache_creation_input_tokens' in usage:
                print(f"   缓存创建: {usage['cache_creation_input_tokens']}")
            if 'cache_read_input_tokens' in usage:
                print(f"   缓存读取: {usage['cache_read_input_tokens']}")
            print()

        # 提取响应内容
        if 'content' in result and len(result['content']) > 0:
            content_item = result['content'][0]
            if content_item.get('type') == 'text':
                text = content_item.get('text', '')

                print("📝 API 响应:")
                print("=" * 80)
                print(text)
                print("=" * 80)
                print()

                # 检查是否成功识别 PDF
                if "我需要先读取" in text or "请问简历文件" in text or "文件路径" in text:
                    print("❌ 失败：API 没有识别到 PDF 内容")
                    print("   API 返回的是请求上传文件的提示")
                    return False
                else:
                    print("✅ 成功：API 正确识别并解析了 PDF 内容")

                    # 尝试解析 JSON
                    try:
                        json_start = text.find('{')
                        json_end = text.rfind('}') + 1
                        if json_start >= 0 and json_end > json_start:
                            json_str = text[json_start:json_end]
                            parsed = json.loads(json_str)
                            print()
                            print("📋 解析的 JSON 数据:")
                            print(json.dumps(parsed, ensure_ascii=False, indent=2))
                    except:
                        pass

                    return True

        print("⚠️  响应格式异常")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return False

    except urllib.error.HTTPError as e:
        print(f"❌ HTTP 错误: {e.code} {e.reason}")
        try:
            error_body = e.read().decode('utf-8')
            print(f"错误详情: {error_body}")
        except:
            pass
        return False
    except Exception as e:
        print(f"❌ 异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    if len(sys.argv) < 2:
        print("用法: python3 test_document_type.py <PDF文件路径>")
        sys.exit(1)

    pdf_path = sys.argv[1]

    print()
    print("🔧 配置信息:")
    print(f"   API Key: {API_KEY[:20]}...")
    print(f"   Base URL: {BASE_URL}")
    print(f"   Model: {MODEL}")
    print()

    success = test_document_type(pdf_path)

    print()
    print("=" * 80)
    if success:
        print("✅ 测试通过：document 类型可以正常工作")
        print()
        print("📌 结论：")
        print("   - 第三方 API 支持 document 类型")
        print("   - 浏览器扩展的实现是正确的")
        print("   - 可以直接使用 document 类型解析 PDF")
    else:
        print("❌ 测试失败：document 类型不工作")
        print()
        print("📌 结论：")
        print("   - 第三方 API 不支持 document 类型")
        print("   - 需要改用 image 类型（将 PDF 转为图片）")
        print("   - 或者切换到官方 API")
    print("=" * 80)
    print()

if __name__ == "__main__":
    main()
