#!/usr/bin/env python3
"""
简历解析测试脚本 - 文本方式
直接提取 PDF 文本内容发送给 API（不使用 document 类型）
"""

# ============================================================================
# 配置区域
# ============================================================================
CLAUDE_API_KEY = "sk-76172c7d1d0d3e72061ab03ea915a423f12ea1ef0743d416913af64f2aa44551"
CLAUDE_BASE_URL = "https://cc-vibe.com"
CLAUDE_MODEL = "claude-opus-4-7"
# ============================================================================

import os
import sys
import json

try:
    import anthropic
except ImportError:
    print("❌ 缺少 anthropic 库，正在安装...")
    os.system(f"{sys.executable} -m pip install anthropic")
    import anthropic

try:
    import PyPDF2
except ImportError:
    print("❌ 缺少 PyPDF2 库，正在安装...")
    os.system(f"{sys.executable} -m pip install PyPDF2")
    import PyPDF2


def extract_text_from_pdf(pdf_path: str) -> str:
    """从 PDF 提取文本内容"""
    print(f"📖 正在提取 PDF 文本内容...")

    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""

            for page_num, page in enumerate(pdf_reader.pages, 1):
                page_text = page.extract_text()
                text += f"\n--- 第 {page_num} 页 ---\n{page_text}\n"

            print(f"✅ 文本提取成功")
            print(f"   总页数: {len(pdf_reader.pages)}")
            print(f"   文本长度: {len(text)} 字符")

            return text

    except Exception as e:
        print(f"❌ 文本提取失败: {e}")
        return None


def build_resume_parse_prompt(resume_text: str) -> str:
    """构建简历解析提示词"""
    return f"""你是一位专业的简历分析专家。以下是一份简历的文本内容，请仔细阅读并提取关键信息。

# 简历内容

{resume_text}

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
{{
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
}}
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


def parse_resume_with_text(api_key: str, pdf_path: str, model: str, base_url: str):
    """使用文本方式解析简历"""

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

    # 提取 PDF 文本
    print(f"\n" + "=" * 80)
    resume_text = extract_text_from_pdf(pdf_path)

    if not resume_text:
        return None

    # 显示提取的文本预览
    print(f"\n📝 文本预览（前 500 字符）:")
    print("-" * 80)
    print(resume_text[:500])
    print("-" * 80)

    # 初始化 Claude 客户端
    print(f"\n🤖 初始化 Claude 客户端...")
    print(f"   模型: {model}")
    print(f"   Base URL: {base_url}")

    client = anthropic.Anthropic(
        api_key=api_key,
        base_url=base_url
    )

    # 构建提示词
    prompt = build_resume_parse_prompt(resume_text)

    # 调用 API
    print(f"\n🚀 开始调用 Claude API 解析简历...")
    print(f"   使用纯文本方式（不使用 document 类型）")

    try:
        response = client.messages.create(
            model=model,
            max_tokens=8192,
            messages=[
                {
                    "role": "user",
                    "content": prompt
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
    print("📄 Claude 简历解析测试工具 (文本模式)")
    print("=" * 80)

    # 使用脚本顶部配置的 API Key 和 Base URL
    api_key = CLAUDE_API_KEY
    base_url = CLAUDE_BASE_URL
    model = CLAUDE_MODEL

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
    result = parse_resume_with_text(api_key, pdf_path, model, base_url)

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
