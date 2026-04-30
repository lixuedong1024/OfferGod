import anthropic
import base64

# 你的配置
CLAUDE_API_KEY = "sk-76172c7d1d0d3e72061ab03ea915a423f12ea1ef0743d416913af64f2aa44551"
CLAUDE_BASE_URL = "https://cc-vibe.com"
CLAUDE_MODEL = "claude-opus-4-7" # 请确认代理商是否支持此模型名

def test_claude_pdf(pdf_path):
    # 初始化客户端，注意这里加入了 base_url
    client = anthropic.Anthropic(
        api_key=CLAUDE_API_KEY,
        base_url=f"{CLAUDE_BASE_URL}" # 通常代理地址需要补上 /v1
    )

    # 读取 PDF 并转码
    with open(pdf_path, "rb") as f:
        pdf_data = base64.b64encode(f.read()).decode("utf-8")

    try:
        message = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1024,
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
                        {"type": "text", "text": "请简要描述这个 PDF 文件的内容。"}
                    ],
                }
            ],
        )
        print("识别成功：")
        print(message.content[0].text)
    except Exception as e:
        print(f"调用失败，错误信息：{e}")

if __name__ == "__main__":
    # 替换为你本地的 pdf 文件路径进行测试
    test_claude_pdf("test.pdf")

