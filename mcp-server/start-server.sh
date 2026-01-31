#!/bin/bash

# C++ Weekly MCP HTTP Server 启动脚本

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 加载环境变量（如果存在）
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 设置默认值
HOST=${HOST:-localhost}
PORT=${PORT:-3000}

echo "Starting C++ Weekly MCP HTTP Server..."
echo "Host: $HOST"
echo "Port: $PORT"
echo ""

# 启动服务器
node http-server.js
