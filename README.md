# 攀岩线路管理平台 (Panyan)

面向攀岩馆运营者和攀岩爱好者社区的全流程线路管理平台，解决室内攀岩线路生命周期管理混乱、攀爬记录分散、难度定级主观性强的问题。

## 项目介绍

核心价值在于"线路可视化编辑"和"共识定级算法"，让定线员高效管理线路、攀岩者科学追踪进步、馆长数据驱动运营。

- 岩壁图上可视化绘制线路
- 社区共识定级算法
- 攀爬记录与个人分析
- 运营数据看板

## 技术栈

### 后端
- **框架**: NestJS 10
- **数据库**: MySQL 8.0 + TypeORM
- **认证**: JWT + Passport
- **语言**: TypeScript

### 前端
- **框架**: React 18 + Vite 6
- **UI**: Tailwind CSS
- **路由**: React Router 7
- **状态管理**: Zustand
- **图表**: Recharts
- **画布**: Fabric.js
- **语言**: TypeScript

### 部署
- Docker & Docker Compose
- Nginx (前端反向代理)

## 快速开始

### Docker Compose 部署

```bash
docker-compose up -d
```

启动后访问:
- 前端: http://localhost
- 后端 API: http://localhost:3000/api

停止服务:
```bash
docker-compose down
```

停止服务并清除数据:
```bash
docker-compose down -v
```

## 本地开发指南

### 前置要求
- Node.js 18+
- MySQL 8.0+
- npm 或 yarn

### 后端开发

1. 进入后端目录:
```bash
cd backend
```

2. 配置环境变量:
```bash
cp .env.example .env
```

3. 安装依赖:
```bash
npm install
```

4. 启动开发服务器:
```bash
npm run start:dev
```

后端服务运行在 http://localhost:3000

### 前端开发

1. 进入前端目录:
```bash
cd frontend
```

2. 安装依赖:
```bash
npm install
```

3. 启动开发服务器:
```bash
npm run dev
```

前端服务运行在 http://localhost:5173

> 注意: 前端开发时已配置代理，`/api` 和 `/uploads` 路径会自动代理到 `http://localhost:3000`

## 默认账号

系统启动后需要通过注册页面创建账号。注册的用户默认为访客角色，可根据需要通过以下方式升级权限：

1. 注册一个新账号
2. 直接在数据库中修改用户角色，或通过管理员接口分配角色

### 用户角色说明

| 角色 | 权限 |
|------|------|
| GUEST (访客) | 浏览公开线路信息 |
| VERIFIED_CLIMBER (认证攀岩者) | 记录攀爬、投票定级、查看个人分析 |
| ROUTE_SETTER (定线员) | 创建/编辑线路、标记线路状态 |
| GYM_OWNER (岩馆馆长) | 管理本馆信息、用户认证、线路管理、运营数据 |
| ADMIN (平台管理员) | 管理岩馆入驻、全局配置 |

## 项目结构

```
panyan/
├── backend/                 # 后端服务 (NestJS)
│   ├── src/
│   │   ├── auth/           # 认证模块
│   │   ├── gym/            # 岩馆模块
│   │   ├── wall/           # 岩壁模块
│   │   ├── route/          # 线路模块
│   │   ├── hold/           # 岩点模块
│   │   ├── ascent/         # 攀爬记录模块
│   │   ├── vote/           # 投票模块
│   │   ├── analytics/      # 数据分析模块
│   │   ├── user/           # 用户模块
│   │   ├── entities/       # 实体定义
│   │   ├── common/         # 公共组件
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   └── data-source.ts
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── frontend/               # 前端应用 (React)
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/          # 页面
│   │   ├── store/          # 状态管理
│   │   ├── utils/          # 工具函数
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── types/          # 类型定义
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .dockerignore
│   ├── vite.config.ts
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API 文档

后端 API 统一前缀: `/api`

主要接口:
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/refresh` - 刷新 Token
- `GET /api/auth/profile` - 获取个人信息
- `GET /api/gym` - 岩馆列表
- `GET /api/gym/:id/walls` - 岩壁列表
- `GET /api/wall/:id/routes` - 线路列表
- `GET /api/route/:id` - 线路详情

## 许可证

MIT
