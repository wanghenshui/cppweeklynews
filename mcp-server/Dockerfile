FROM node:18-alpine

# 安装curl用于健康检查
RUN apk add --no-cache curl

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 复制应用代码
COPY http-server.js ./
COPY config.json ./

# 创建posts目录（将通过volume挂载）
RUN mkdir -p posts

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动服务器
CMD ["node", "http-server.js"]
