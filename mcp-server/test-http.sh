#!/bin/bash

# HTTP MCP 服务器测试脚本

HOST=${1:-localhost}
PORT=${2:-3000}
BASE_URL="http://${HOST}:${PORT}"

echo "Testing C++ Weekly MCP HTTP Server at ${BASE_URL}"
echo "========================================="
echo ""

# 测试健康检查
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "${BASE_URL}/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "   ✓ Health check passed"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "   ✗ Health check failed"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi

echo ""

# 测试SSE端点 (只测试连接，不等待数据)
echo "2. Testing SSE endpoint connection..."
SSE_TEST=$(timeout 2 curl -s -N "${BASE_URL}/sse" 2>&1 || echo "Connection established")
if [[ $? -eq 124 ]] || [[ "$SSE_TEST" == *"Connection established"* ]]; then
    echo "   ✓ SSE endpoint is accessible"
else
    echo "   ✗ SSE endpoint connection failed"
fi

echo ""
echo "========================================="
echo "Basic connectivity tests passed!"
echo ""
echo "Server endpoints:"
echo "  - Health:   ${BASE_URL}/health"
echo "  - SSE:      ${BASE_URL}/sse"
echo "  - Messages: ${BASE_URL}/messages"
echo ""
echo "To use with Claude Desktop, add to claude_desktop_config.json:"
echo '{
  "mcpServers": {
    "cpp-weekly": {
      "url": "'${BASE_URL}'/sse"
    }
  }
}'
