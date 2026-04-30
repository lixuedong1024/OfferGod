#!/usr/bin/env python3
"""
API 功能诊断脚本
测试第三方 Claude API 支持的功能
"""

# ============================================================================
# 配置区域
# ============================================================================
CLAUDE_API_KEY = "sk-76172c7d1d0d3e72061ab03ea915a423f12ea1ef0743d416913af64f2aa44551"
CLAUDE_BASE_URL = "https://cc-vibe.com"
CLAUDE_MODEL = "claude-opus-4-7"
# ============================================================================

import anthropic
import base64
import sys

def test_basic_text():
    """测试1: 基础文本对话"""
    print("\n" + "=" * 80)
    print("测试 1: 基础文本对话")
    print("=" * 80)

    try:
        client = anthropic.Anthropic(
            api_key=CLAUDE_API_KEY,
            base_url=CLAUDE_BASE_URL
        )

        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=100,
            messages=[
                {
                    "role": "user",
                    "content": "请回复：测试成功"
                }
            ],
        )

        result = response.content[0].text
        print(f"✅ 基础文本对话成功")
        print(f"   响应: {result}")
        print(f"   Tokens: {response.usage.input_tokens} 输入 + {response.usage.output_tokens} 输出")
        return True

    except Exception as e:
        print(f"❌ 基础文本对话失败: {e}")
        return False


def test_document_type(pdf_path: str):
    """测试2: document 类型支持"""
    print("\n" + "=" * 80)
    print("测试 2: document 类型支持")
    print("=" * 80)

    try:
        # 读取 PDF
        with open(pdf_path, 'rb') as f:
            pdf_data = base64.standard_b64encode(f.read()).decode('utf-8')

        print(f"   PDF 文件: {pdf_path}")
        print(f"   Base64 长度: {len(pdf_data)}")

        client = anthropic.Anthropic(
            api_key=CLAUDE_API_KEY,
            base_url=CLAUDE_BASE_URL
        )

        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": pdf_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": "这是一份简历，请告诉我你看到了什么内容？只需要简单描述即可。"
                        }
                    ],
                }
            ],
        )

        result = response.content[0].text
        print(f"✅ document 类型支持成功")
        print(f"   响应: {result[:200]}...")
        print(f"   Tokens: {response.usage.input_tokens} 输入 + {response.usage.output_tokens} 输出")

        # 检查响应是否真的读取了 PDF
        if "需要" in result or "路径" in result or "文件" in result and "上传" in result:
            print(f"⚠️  警告: API 似乎没有读取到 PDF 内容")
            print(f"   完整响应: {result}")
            return False

        return True

    except Exception as e:
        print(f"❌ document 类型测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_image_type(pdf_path: str):
    """测试3: image 类型支持（作为备选方案）"""
    print("\n" + "=" * 80)
    print("测试 3: image 类型支持（备选方案）")
    print("=" * 80)

    try:
        # 尝试将 PDF 转换为图片
        try:
            from pdf2image import convert_from_path
            import io
            from PIL import Image

            images = convert_from_path(pdf_path, dpi=150)
            first_page = images[0]

            # 转换为 JPEG
            output = io.BytesIO()
            first_page.save(output, format='JPEG', quality=85)
            image_data = output.getvalue()
            image_base64 = base64.b64encode(image_data).decode('utf-8')

            print(f"   PDF 转图片成功")
            print(f"   图片 Base64 长度: {len(image_base64)}")

        except ImportError:
            print(f"⚠️  缺少 pdf2image 库，跳过此测试")
            print(f"   安装: pip install pdf2image Pillow")
            print(f"   还需要: brew install poppler (macOS) 或 apt-get install poppler-utils (Linux)")
            return None

        client = anthropic.Anthropic(
            api_key=CLAUDE_API_KEY,
            base_url=CLAUDE_BASE_URL
        )

        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": "这是一份简历的图片，请告诉我你看到了什么内容？"
                        }
                    ],
                }
            ],
        )

        result = response.content[0].text
        print(f"✅ image 类型支持成功")
        print(f"   响应: {result[:200]}...")
        print(f"   Tokens: {response.usage.input_tokens} 输入 + {response.usage.output_tokens} 输出")
        return True

    except Exception as e:
        print(f"❌ image 类型测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("=" * 80)
    print("🔍 Claude API 功能诊断工具")
    print("=" * 80)
    print(f"\n🔑 API Key: {CLAUDE_API_KEY[:20]}...")
    print(f"🌐 Base URL: {CLAUDE_BASE_URL}")
    print(f"🤖 Model: {CLAUDE_MODEL}")

    # 获取 PDF 文件路径
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        pdf_path = input("\n📁 请输入测试用的 PDF 文件路径: ").strip()

    if not pdf_path:
        print("❌ 未提供文件路径")
        return

    # 运行测试
    results = {}

    # 测试1: 基础文本
    results['basic_text'] = test_basic_text()

    # 测试2: document 类型
    results['document_type'] = test_document_type(pdf_path)

    # 测试3: image 类型
    results['image_type'] = test_image_type(pdf_path)

    # 总结
    print("\n" + "=" * 80)
    print("📊 测试结果总结")
    print("=" * 80)
    print(f"✅ 基础文本对话: {'支持' if results['basic_text'] else '不支持'}")
    print(f"{'✅' if results['document_type'] else '❌'} document 类型: {'支持' if results['document_type'] else '不支持'}")
    print(f"{'✅' if results['image_type'] else '⚠️ '} image 类型: {'支持' if results['image_type'] else '未测试（缺少依赖）' if results['image_type'] is None else '不支持'}")

    print("\n💡 建议:")
    if results['document_type']:
        print("   ✅ 此 API 支持 document 类型，可以直接使用 test_resume_parse.py")
    elif results['image_type']:
        print("   ⚠️  此 API 不支持 document 类型，但支持 image 类型")
        print("   建议使用 test_resume_parse_image.py（将 PDF 转为图片）")
    else:
        print("   ❌ 此 API 可能不支持 PDF 解析功能")
        print("   建议联系 API 提供商确认支持的功能")


if __name__ == '__main__':
    main()
