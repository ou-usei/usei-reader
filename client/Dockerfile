# --- 1. 构建阶段 ---
# 使用官方的 Node.js 镜像作为构建环境
FROM node:18-alpine AS build

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装所有依赖
RUN npm install

# 复制所有源代码
COPY . .

# 构建生产版本的 React 应用
# 这里可以传入 API 的公共访问地址作为环境变量
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# --- 2. 生产阶段 ---
# 使用非常轻量的 Nginx 镜像来提供静态文件服务
FROM nginx:stable-alpine

# 从构建阶段复制编译好的静态文件到 Nginx 的默认服务目录
COPY --from=build /app/build /usr/share/nginx/html

# （可选）如果你使用了 React Router，需要一个 Nginx 配置来支持单页应用
# 创建一个名为 nginx.conf 的文件，内容如下，并取消下面这行注释
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口 80
EXPOSE 80

# 当容器启动时，Nginx 会自动启动并提供文件服务
CMD ["nginx", "-g", "daemon off;"]
