#!/usr/bin/env python3
"""
测试 document 类型 - 使用最小化的测试 PDF
"""

import anthropic
import base64

API_KEY = "sk-76172c7d1d0d3e72061ab03ea915a423f12ea1ef0743d416913af64f2aa44551"
BASE_URL = "https://cc-vibe.com"
MODEL = "claude-opus-4-7"

# 创建一个最小的测试 PDF（只包含 "Hello World"）
# 这是一个有效的 PDF 文件的 base64
MINIMAL_PDF_BASE64 = """
JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNl
czw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQg
MCBSL0dyb3VwPDwvVHlwZS9Hcm91cC9TL1RyYW5zcGFyZW5jeS9DUy9EZXZpY2VSR0I+Pj4+CmVu
ZG9iago0IDAgb2JqCjw8L0ZpbHRlci9GbGF0ZURlY29kZS9MZW5ndGggNDQ+PnN0cmVhbQp4nCvk
MlAwULCx0XfOL0hVMDQwVzA2NFBQMDM0UDBQsDQ0UDBWAAEjBSMFQwUjBUsAIRMIKw0KZW5kc3Ry
ZWFtCmVuZG9iago1IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hl
bHZldGljYT4+CmVuZG9iagoyIDAgb2JqCjw8L1R5cGUvUGFnZXMvS2lkc1szIDAgUl0vQ291bnQg
MT4+CmVuZG9iagoxIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagp4
cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDA0MjggMDAwMDAgbiAKMDAwMDAwMDM3
NyAwMDAwMCBuIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAxNzYgMDAwMDAgbiAKMDAwMDAw
MDI4OCAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNi9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjQ3
NwolJUVPRgo=
""".strip().replace('\n', '')

print("=" * 80)
print("测试 document 类型支持")
print("=" * 80)

try:
    client = anthropic.Anthropic(
        api_key=API_KEY,
        base_url=BASE_URL,
        default_headers={
            "anthropic-version": "2023-06-01"
        }
    )

    print(f"\n📤 发送测试 PDF (base64 长度: {len(MINIMAL_PDF_BASE64)})")
    print(f"   API: {BASE_URL}")
    print(f"   Model: {MODEL}")

    response = client.messages.create(
        model=MODEL,
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
                            "data": MINIMAL_PDF_BASE64,
                        },
                    },
                    {
                        "type": "text",
                        "text": "这个 PDF 里写的是什么？"
                    }
                ],
            }
        ],
    )

    result = response.content[0].text
    print(f"\n✅ API 调用成功")
    print(f"   Tokens: {response.usage.input_tokens} 输入 + {response.usage.output_tokens} 输出")
    print(f"\n📝 响应内容:")
    print("-" * 80)
    print(result)
    print("-" * 80)

    # 检查响应
    if "需要" in result or "路径" in result or "上传" in result:
        print("\n❌ API 没有读取 PDF 内容")
        print("   可能原因:")
        print("   1. 第三方代理不支持 document 类型")
        print("   2. API 版本不对")
        print("   3. 需要特殊的配置")
    else:
        print("\n✅ API 成功读取了 PDF 内容")

except Exception as e:
    print(f"\n❌ 错误: {e}")
    import traceback
    traceback.print_exc()
