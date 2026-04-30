#!/usr/bin/env python3
"""
简历解析测试脚本 - 使用图片方式
适用于不支持 document 类型的第三方 API
"""

# ============================================================================
# 配置区域 - 请在这里填写你的 API Key 和 Base URL
# ============================================================================
CLAUDE_API_KEY = "sk-76172c7d1d0d3e72061ab03ea915a423f12ea1ef0743d416913af64f2aa44551"
CLAUDE_BASE_URL = "https://cc-vibe.com"
CLAUDE_MODEL = "claude-opus-4-7"
# ============================================================================

import os
import sys
import json
import base64
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("❌ 缺少 anthropic 库，正在安装...")
    os.system(f"{sys.executable} -m pip install anthropic")
    import anthropic

try:
    from pdf2image import convert_from_path
    from PIL import Image
    import io
except ImportError:
    print("❌ 缺少 pdf2image 和 Pillow 库，正在安装...")
    os.system(f"{sys.executable} -m pip install pdf2image Pillow")
    from pdf2image import convert_from_path
    from PIL import Image
    import io


def pdf_to_images_base64(pdf_path: str, max_pages: int = 5) -> list:
    """
    将 PDF 转换为图片的 base64 列表

    Args:
        pdf_path: PDF 文件路径
        max_pages: 最多转换的页数（避免 token 过多）

    Returns:
        图片 base64 列表
    """
    print(f"📄 正在将 PDF 转换为图片...")

    try:
        # 转换 PDF 为图片（每页一张）
        images = convert_from_path(pdf_path, dpi=150)

        total_pages = len(images)
        print(f"   PDF 总页数: {total_pages}")

        if total_pages > max_pages:
            print(f"   ⚠️  只处理前 {max_pages} 页（避免 token 过多）")
            images = images[:max_pages]

        image_base64_list = []

        for i, image in enumerate(images, 1):
            # 压缩图片以减少大小
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=85, optimize=True)
            image_data = output.getvalue()

            # 转换为 base64
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            image_base64_list.append(image_base64)

            print(f"   ✅ 第 {i} 页转换完成 (大小: {len(image_base64) / 1024:.1f} KB)")

        return image_base64_list

    except Exception as e:
        print(f"❌ PDF 转换失败: {e}")
        print(f"   提示: 需要安装 poppler")
        print(f"   macOS: brew install poppler")
        print(f"   Ubuntu: sudo apt-get install poppler-utils")
        print(f"   Windows: 下载 poppler 并添加到 PATH")
        return None


def build_resume_parse_prompt() -> str:
    """构建简历解析提示词"""
    return """你是一位专业的简历分析专家。我已经上传了简历的图片，请仔细阅读并提取关键信息。

# 提取任务

请从简历中提取以下信息：

1. **基本信息**：姓名、邮箱、电话、所在城市
2. **工作经验**：总工作年限（如"3年"、"5-7年"）、当前职位、当前公司
3. **教育背景**：最高学历（本科/硕士/博士）、专业、学校
4. **技能标签**：提取 8-15 个核心技能关键词（编程语言、框架、工具、领域知识等）
5. **项目经验**：提取 3-5 个主要项目的简短描述（每个 20-30 字）
6. **个人优势**：总结 3-5 个核心竞争力（如"5年后端开发经验"、"熟悉微服务架构"）
7. **求职偏好**：根据简历内容推断求职偏好（期望行业、技术栈偏好、工作方式等，80-120字）

# 输出格式

请严格按照以下 JSON 格式返回（只返回 JSON，不要任何其他文字）：

```json
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "phone": "138****1234",
  "location": "北京",
  "experience": "5年",
  "currentPosition": "高级后端工程师",
  "currentCompany": "某科技公司",
  "education": "本科",
  "major": "计算机科学与技术",
  "school": "某大学",
  "skills": ["Java", "Spring Boot", "MySQL", "Redis", "Kafka", "Docker", "K8s", "微服务"],
  "projects": [
    "电商平台后端系统：负责订单、支付模块，日均处理 10 万笔订单",
    "用户画像系统：基于 Flink 实时计算，支持千万级用户标签",
    "监控告警平台：整合 Prometheus + Grafana，覆盖 200+ 服务"
  ],
  "strengths": [
    "5 年 Java 后端开发经验",
    "熟悉高并发系统设计",
    "有大型电商项目经验",
    "熟练使用 K8s 容器化部署"
  ],
  "preferences": "偏好互联网/电商行业，技术栈倾向 Java + 微服务 + 云原生，可接受适度加班但希望技术氛围好，倾向一线城市机会。",
  "expectedSalary": "25-35K",
  "expectedLocation": "北京",
  "expectedPosition": "高级后端工程师/架构师"
}
```

# 注意事项

- 如果某些信息在简历中未找到，对应字段设为 null
- skills 数组要提取最核心的技能关键词，不要太泛泛
- projects 要简洁有力，突出技术亮点和业务价值
- strengths 要具体可量化，不要空洞的形容词
- preferences 要根据简历内容合理推断，体现候选人的真实倾向
- 工作年限要规范化为 "X年" 或 "X-Y年" 格式
- 学历要规范化为 "专科"、"本科"、"硕士"、"博士" 之一
- 电话号码如果存在，请脱敏处理（如 138****1234）"""


def parse_resume_with_images(api_key: str, pdf_path: str, model: str, base_url: str):
    """使用图片方式解析简历"""

    # 检查文件是否存在
    if not os.path.exists(pdf_path):
        print(f"❌ 文件不存在: {pdf_path}")
        return None

    # 检查文件大小
    file_size = os.path.getsize(pdf_path)
    file_size_mb = file_size / (1024 * 1024)
    print(f"📄 文件信息:")
    print(f"   路径: {pdf_path}")
    print(f"   大小: {file_size_mb:.2f} MB")

    # 转换 PDF 为图片
    print(f"\n" + "=" * 80)
    image_base64_list = pdf_to_images_base64(pdf_path, max_pages=5)

    if not image_base64_list:
        return None

    # 初始化 Claude 客户端
    print(f"\n🤖 初始化 Claude 客户端...")
    print(f"   模型: {model}")
    print(f"   Base URL: {base_url}")

    client = anthropic.Anthropic(
        api_key=api_key,
        base_url=base_url
    )

    # 构建提示词
    prompt = build_resume_parse_prompt()

    # 构建消息内容（多张图片 + 文本）
    content = []

    # 添加所有图片
    for i, image_base64 in enumerate(image_base64_list, 1):
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": image_base64,
            }
        })

    # 添加提示词
    content.append({
        "type": "text",
        "text": prompt,
    })

    # 调用 API
    print(f"\n🚀 开始调用 Claude API 解析简历...")
    print(f"   发送 {len(image_base64_list)} 张图片")

    try:
        response = client.messages.create(
            model=model,
            max_tokens=8192,
            messages=[
                {
                    "role": "user",
                    "content": content,
                }
            ],
        )

        print(f"✅ API 调用成功!")
        print(f"\n📊 Token 使用情况:")
        print(f"   输入 tokens: {response.usage.input_tokens}")
        print(f"   输出 tokens: {response.usage.output_tokens}")
        print(f"   总计 tokens: {response.usage.input_tokens + response.usage.output_tokens}")

        # 提取响应内容
        content_text = response.content[0].text if response.content else ""

        print(f"\n📝 原始响应:")
        print("=" * 80)
        print(content_text)
        print("=" * 80)

        # 尝试解析 JSON
        print(f"\n🔍 解析 JSON 数据...")
        try:
            import re

            # 提取 JSON
            json_str = content_text

            # 尝试提取 markdown 代码块中的 JSON
            code_block_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', content_text)
            if code_block_match:
                json_str = code_block_match.group(1)
            else:
                # 尝试直接提取 JSON 对象
                json_match = re.search(r'\{[\s\S]*\}', content_text)
                if json_match:
                    json_str = json_match.group(0)

            parsed_data = json.loads(json_str)

            print(f"✅ JSON 解析成功!")
            print(f"\n📋 解析结果:")
            print(json.dumps(parsed_data, ensure_ascii=False, indent=2))

            return parsed_data

        except json.JSONDecodeError as e:
            print(f"❌ JSON 解析失败: {e}")
            print(f"   尝试解析的内容: {json_str[:200]}...")
            return None

    except anthropic.APIError as e:
        print(f"❌ API 调用失败: {e}")
        print(f"   状态码: {e.status_code if hasattr(e, 'status_code') else 'N/A'}")
        print(f"   错误类型: {e.type if hasattr(e, 'type') else 'N/A'}")
        return None
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        import traceback
        traceback.print_exc()
        return None


def main():
    """主函数"""
    print("=" * 80)
    print("📄 Claude 简历解析测试工具 (图片模式)")
    print("=" * 80)

    # 使用脚本顶部配置的 API Key 和 Base URL
    api_key = CLAUDE_API_KEY
    base_url = CLAUDE_BASE_URL
    model = CLAUDE_MODEL

    # 验证配置
    if not api_key or "填写你的" in api_key:
        print("❌ 请先在脚本顶部填写 CLAUDE_API_KEY")
        return

    if not base_url or "填写你的" in base_url:
        print("❌ 请先在脚本顶部填写 CLAUDE_BASE_URL")
        return

    print(f"\n🔑 API Key: {api_key[:20]}...")
    print(f"🌐 Base URL: {base_url}")
    print(f"🤖 Model: {model}")

    # 获取 PDF 文件路径
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        pdf_path = input("\n📁 请输入 PDF 简历文件路径: ").strip()

    if not pdf_path:
        print("❌ 未提供文件路径")
        return

    # 执行解析
    print("\n" + "=" * 80)
    result = parse_resume_with_images(api_key, pdf_path, model, base_url)

    if result:
        print("\n" + "=" * 80)
        print("✅ 简历解析完成!")
        print("=" * 80)

        # 保存结果到文件
        output_file = pdf_path.replace('.pdf', '_parsed.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n💾 解析结果已保存到: {output_file}")
    else:
        print("\n" + "=" * 80)
        print("❌ 简历解析失败")
        print("=" * 80)


if __name__ == '__main__':
    main()
