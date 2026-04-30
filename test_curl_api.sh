#!/bin/bash
# 测试 Claude API document 类型的原始请求

API_KEY="sk-76172c7d1d0d3e72061ab03ea915a423f12ea1ef0743d416913af64f2aa44551"
BASE_URL="https://cc-vibe.com"
PDF_PATH="/home/li/Desktop/新建文件夹/李雪川_技术实施与运维.pdf"

echo "读取 PDF 并转换为 base64..."
PDF_BASE64=$(base64 -w 0 "$PDF_PATH")

echo "PDF base64 长度: ${#PDF_BASE64}"

# 构建请求
cat > /tmp/test_request.json <<EOF
{
  "model": "claude-opus-4-7",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "document",
          "source": {
            "type": "base64",
            "media_type": "application/pdf",
            "data": "$PDF_BASE64"
          }
        },
        {
          "type": "text",
          "text": "这是一份简历，请简单描述你看到了什么内容？"
        }
      ]
    }
  ]
}
EOF

echo "发送请求到 API..."
curl -X POST "${BASE_URL}/v1/messages" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d @/tmp/test_request.json \
  | jq '.'

rm /tmp/test_request.json
