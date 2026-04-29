#!/bin/bash
# 简历解析测试脚本（Shell 版本）
# 使用 curl 直接调用 Claude API

# ============================================================================
# 配置区域 - 请在这里填写你的 API Key 和 Base URL
# ============================================================================
CLAUDE_API_KEY="sk-ant-填写你的API_KEY"  # 填写你的 Claude API Key
CLAUDE_BASE_URL="https://填写你的代理地址"  # 填写你的第三方 API 端点
CLAUDE_MODEL="claude-opus-4-7"  # 使用的模型
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================================================"
echo "📄 Claude 简历解析测试工具 (Shell 版本)"
echo "================================================================================"

# 验证配置
if [[ "$CLAUDE_API_KEY" == *"填写你的"* ]]; then
    echo -e "${RED}❌ 请先在脚本顶部填写 CLAUDE_API_KEY${NC}"
    exit 1
fi

if [[ "$CLAUDE_BASE_URL" == *"填写你的"* ]]; then
    echo -e "${RED}❌ 请先在脚本顶部填写 CLAUDE_BASE_URL${NC}"
    exit 1
fi

echo -e "\n🔑 API Key: ${CLAUDE_API_KEY:0:20}..."
echo -e "🌐 Base URL: $CLAUDE_BASE_URL"
echo -e "🤖 Model: $CLAUDE_MODEL"

# 获取 PDF 文件路径
if [ -n "$1" ]; then
    PDF_PATH="$1"
else
    echo -e "\n📁 请输入 PDF 简历文件路径:"
    read -r PDF_PATH
fi

if [ -z "$PDF_PATH" ]; then
    echo -e "${RED}❌ 未提供文件路径${NC}"
    exit 1
fi

# 检查文件是否存在
if [ ! -f "$PDF_PATH" ]; then
    echo -e "${RED}❌ 文件不存在: $PDF_PATH${NC}"
    exit 1
fi

# 获取文件信息
FILE_SIZE=$(stat -f%z "$PDF_PATH" 2>/dev/null || stat -c%s "$PDF_PATH" 2>/dev/null)
FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1024 / 1024" | bc)

echo -e "\n📄 文件信息:"
echo "   路径: $PDF_PATH"
echo "   大小: ${FILE_SIZE_MB} MB"

# 检查文件大小
MAX_SIZE=$((32 * 1024 * 1024))
if [ "$FILE_SIZE" -gt "$MAX_SIZE" ]; then
    echo -e "${RED}❌ 文件过大（超过 32MB 限制）${NC}"
    exit 1
fi

RECOMMENDED_SIZE=$((5 * 1024 * 1024))
if [ "$FILE_SIZE" -gt "$RECOMMENDED_SIZE" ]; then
    echo -e "${YELLOW}⚠️  文件较大，解析可能需要较长时间${NC}"
fi

# 读取 PDF 文件并转换为 base64
echo -e "\n📖 正在读取 PDF 文件..."
PDF_BASE64=$(base64 -i "$PDF_PATH" | tr -d '\n')
echo -e "${GREEN}✅ PDF 文件读取成功 (base64 长度: ${#PDF_BASE64})${NC}"

# 使用脚本顶部配置的变量
MODEL="$CLAUDE_MODEL"
BASE_URL="$CLAUDE_BASE_URL"

echo -e "\n🤖 API 配置:"
echo "   模型: $MODEL"
echo "   Base URL: $BASE_URL"

# 构建提示词
PROMPT='你是一位专业的简历分析专家。我已经上传了一份 PDF 格式的简历，请仔细阅读并提取关键信息。

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
- 电话号码如果存在，请脱敏处理（如 138****1234）'

# 构建请求 JSON
REQUEST_JSON=$(cat <<EOF
{
  "model": "$MODEL",
  "max_tokens": 8192,
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
          },
          "cache_control": {
            "type": "ephemeral"
          }
        },
        {
          "type": "text",
          "text": $(echo "$PROMPT" | jq -Rs .)
        }
      ]
    }
  ]
}
EOF
)

# 调用 API
echo -e "\n🚀 开始调用 Claude API 解析简历..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/v1/messages" \
    -H "x-api-key: $CLAUDE_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d "$REQUEST_JSON")

# 分离响应体和状态码
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ API 调用成功!${NC}"

    # 提取 token 使用情况
    INPUT_TOKENS=$(echo "$RESPONSE_BODY" | jq -r '.usage.input_tokens // 0')
    OUTPUT_TOKENS=$(echo "$RESPONSE_BODY" | jq -r '.usage.output_tokens // 0')
    TOTAL_TOKENS=$((INPUT_TOKENS + OUTPUT_TOKENS))

    echo -e "\n📊 Token 使用情况:"
    echo "   输入 tokens: $INPUT_TOKENS"
    echo "   输出 tokens: $OUTPUT_TOKENS"
    echo "   总计 tokens: $TOTAL_TOKENS"

    # 提取响应内容
    CONTENT=$(echo "$RESPONSE_BODY" | jq -r '.content[0].text // ""')

    echo -e "\n📝 原始响应:"
    echo "================================================================================"
    echo "$CONTENT"
    echo "================================================================================"

    # 尝试提取并格式化 JSON
    echo -e "\n🔍 解析 JSON 数据..."
    PARSED_JSON=$(echo "$CONTENT" | sed -n '/```json/,/```/p' | sed '1d;$d')

    if [ -z "$PARSED_JSON" ]; then
        # 尝试直接提取 JSON 对象
        PARSED_JSON=$(echo "$CONTENT" | grep -o '{.*}' | head -1)
    fi

    if [ -n "$PARSED_JSON" ]; then
        echo -e "${GREEN}✅ JSON 解析成功!${NC}"
        echo -e "\n📋 解析结果:"
        echo "$PARSED_JSON" | jq '.'

        # 保存结果到文件
        OUTPUT_FILE="${PDF_PATH%.pdf}_parsed.json"
        echo "$PARSED_JSON" | jq '.' > "$OUTPUT_FILE"
        echo -e "\n💾 解析结果已保存到: $OUTPUT_FILE"

        echo -e "\n================================================================================"
        echo -e "${GREEN}✅ 简历解析完成!${NC}"
        echo "================================================================================"
    else
        echo -e "${RED}❌ JSON 解析失败${NC}"
        echo "================================================================================"
    fi
else
    echo -e "${RED}❌ API 调用失败 (HTTP $HTTP_CODE)${NC}"
    echo -e "\n错误响应:"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    echo "================================================================================"
    exit 1
fi
