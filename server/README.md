# 草莓·毛巾浴巾创作者协作工作台 - 后端同步服务

## 项目结构

```
caomei-workbench/
├── index.html          # 前端工作台（高颜值展示）
└── server/
    ├── server.js       # 后端服务（Express + 飞书API）
    ├── package.json    # 依赖配置
    ├── .env.example    # 环境变量示例
    └── README.md       # 本文件
```

## 功能说明

- ✅ 飞书多维表格双向同步（账号、任务、选题）
- ✅ RESTful API 接口
- ✅ 静态文件托管（前端HTML）
- ✅ CORS 跨域支持
- ✅ tenant_access_token 自动缓存刷新

## 快速开始

### 1. 创建飞书自建应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 点击「创建应用」→「自建应用」
3. 填写应用名称：草莓工作台同步服务
4. 创建完成后，在「凭证与基础信息」中获取 **App ID** 和 **App Secret**

### 2. 开通应用权限

在应用后台「权限管理」中，开通以下权限：
- `bitable:app` - 查看、评论、编辑和管理多维表格
- `bitable:app:readonly` - 查看、评论和导出多维表格

### 3. 将应用添加为多维表格协作者

1. 打开你的多维表格：https://my.feishu.cn/base/DGswbVURoag3f5sqcmYcxqxLned
2. 点击右上角「分享」→「添加协作者」
3. 搜索你创建的应用名称，添加为「可编辑」权限

### 4. 配置环境变量

```bash
cd server
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置：

```env
FEISHU_APP_ID=cli_你的AppID
FEISHU_APP_SECRET=你的AppSecret
FEISHU_BASE_TOKEN=DGswbVURoag3f5sqcmYcxqxLned
TABLE_TASKS=tblhk1DiCwtGlTgo
TABLE_ACCOUNTS=tblajEZ1YTqyTw96
TABLE_IDEAS=tblU0MnBhGNebare
PORT=3000
ALLOWED_ORIGIN=*
```

### 5. 安装依赖并启动

```bash
cd server
npm install
npm start
```

启动成功后访问：http://localhost:3000

## API 接口文档

### 健康检查
```
GET /api/health
```

### 新媒体账号
```
GET    /api/accounts          # 获取账号列表
POST   /api/accounts          # 新增账号
PUT    /api/accounts/:id      # 更新账号
DELETE /api/accounts/:id      # 删除账号
```

### 项目任务
```
GET    /api/tasks             # 获取任务列表
POST   /api/tasks             # 新增任务
PUT    /api/tasks/:id         # 更新任务
DELETE /api/tasks/:id         # 删除任务
```

### 选题灵感
```
GET    /api/ideas             # 获取选题列表
POST   /api/ideas             # 新增选题
PUT    /api/ideas/:id         # 更新选题
DELETE /api/ideas/:id         # 删除选题
```

### 行业资讯
```
GET    /api/industry-news     # 获取行业动态
GET    /api/brand-news        # 获取品牌资讯
POST   /api/refresh-news      # 刷新资讯缓存
```

## 部署到 Vercel（推荐，免费）

### 方法一：Vercel CLI

```bash
npm install -g vercel
cd server
vercel
```

按照提示完成部署，Vercel会自动识别Node.js项目。

### 方法二：GitHub 集成

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量（在 Vercel 项目设置 → Environment Variables）
4. 部署完成后，会获得一个 `https://xxx.vercel.app` 的域名

### Vercel 配置文件

在项目根目录创建 `vercel.json`：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## 部署到其他平台

### 阿里云函数计算 / 腾讯云函数
- 将 `server.js` 适配为函数计算入口
- 配置环境变量
- 绑定自定义域名

### 自建服务器（Node.js）
```bash
# 安装PM2进程管理
npm install -g pm2

# 启动服务
pm2 start server.js --name caomei-workbench

# 设置开机自启
pm2 startup
pm2 save
```

### Nginx 反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 前端配置

部署后端后，修改前端 `index.html` 中的 API 地址：

```javascript
// 将 API_BASE_URL 改为你的后端地址
const API_BASE_URL = 'https://your-domain.vercel.app';
```

或者如果前后端同域部署，直接使用相对路径 `/api`。

## 常见问题

### Q: 提示 "获取token失败"
A: 检查 App ID 和 App Secret 是否正确，应用是否已发布版本。

### Q: 提示 "无权限访问该多维表格"
A: 确认已将应用添加为多维表格的协作者，且权限为「可编辑」。

### Q: 前端调用API跨域报错
A: 检查 `.env` 中的 `ALLOWED_ORIGIN` 配置，部署后改为你的前端域名。

### Q: 如何更新数据表ID？
A: 在多维表格URL中，`/base/` 后面是 base_token，`?table=` 后面是 table_id。

## 技术栈

- **后端**: Node.js + Express
- **飞书API**: 多维表格 v1 API
- **认证**: tenant_access_token（应用身份）
- **部署**: Vercel / 阿里云 / 自建服务器

## 联系方式

如有问题，请在工作台项目中提出。
