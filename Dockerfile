# build stage
FROM node:12-alpine as build-stage

# 镜像的元信息,maintainer项目维护者
LABEL maintainer="1948093496@qq.com"

# 创建一个工作目录
WORKDIR /app

# 复制符合.dockerignore规则的文件
COPY . .

# 安装依赖
RUN npm install cnpm -g --no-progress --registry=https://registry.npm.taobao.org

RUN cnpm install --no-progress

# 构建
RUN npm run build

# production stage
# 使用nginx镜像
FROM nginx:stable-alpine as production-stage

# 使用--from把上面产生的静态文件复制到nginx的运行目录
COPY --from=build-stage /app/dist /usr/share/nginx/html

# nginx容器内部暴露的端口
EXPOSE 80

# 运行的命令
CMD ["nginx", "-g", "daemon off;"]
