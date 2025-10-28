# 连接者论坛 - 基于Supabase的现代化社区平台

## 项目概述

连接者论坛是一个基于Supabase后端即服务技术栈的现代化、高性能社区论坛平台。项目采用Vue 3 + TypeScript + Vite技术栈，实现了完整的用户认证、帖子管理、评论互动等功能。

## 技术架构

### 前端技术栈
- **Vue 3** - 渐进式JavaScript框架
- **TypeScript** - 类型安全的JavaScript超集
- **Vite** - 下一代前端构建工具
- **Vue Router** - 官方路由管理器
- **Pinia** - 状态管理库
- **Supabase JS** - 后端即服务客户端

### 后端服务
- **Supabase** - 完整的后端即服务平台
  - PostgreSQL数据库
  - 实时订阅
  - 用户认证
  - 文件存储

## 功能特性

### 核心功能
- ✅ 用户注册与登录
- ✅ 帖子发布与管理
- ✅ 实时评论系统
- ✅ 点赞/收藏互动
- ✅ 用户等级与特权系统
- ✅ 响应式设计

### 高级特性
- 🔄 实时数据同步
- 🎨 用户等级视觉特效
- 📱 移动端优化
- 🔒 行级安全策略(RLS)
- ⚡ 性能优化

## 快速开始

### 环境要求
- Node.js 16+
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 环境配置
1. 复制环境变量文件：
```bash
cp .env.example .env
```

2. 配置Supabase连接信息：
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 代码检查
```bash
npm run lint
npm run type-check
```

## 项目结构

```
src/
├── components/          # 可复用组件
│   ├── PostCard.vue     # 帖子卡片组件
│   ├── CommentItem.vue  # 评论项组件
│   └── CreatePostModal.vue # 发布帖子模态框
├── views/               # 页面组件
│   ├── HomeView.vue     # 首页
│   ├── PostDetailView.vue # 帖子详情页
│   ├── LoginView.vue    # 登录页
│   ├── ProfileView.vue  # 个人中心
│   └── NotFoundView.vue # 404页面
├── stores/              # 状态管理
│   ├── auth.ts         # 认证状态
│   └── posts.ts        # 帖子状态
├── services/            # 服务层
│   └── supabase.ts     # Supabase服务封装
├── types/               # TypeScript类型定义
│   └── supabase.ts     # 数据库类型
├── router/              # 路由配置
│   └── index.ts        # 路由定义
├── styles/              # 样式文件
│   └── main.css        # 全局样式
├── App.vue              # 根组件
└── main.ts             # 应用入口
```

## 数据库设计

### 核心数据表

#### profiles (用户信息)
- `id` - 用户ID (与Supabase Auth关联)
- `username` - 用户名 (唯一)
- `avatar_url` - 头像URL
- `level` - 用户等级
- `experience_points` - 经验值

#### posts (帖子表)
- `id` - 帖子ID
- `user_id` - 作者ID
- `title` - 帖子标题
- `content` - 帖子内容
- `tags` - 标签数组
- `like_count` - 点赞数
- `comment_count` - 评论数
- `view_count` - 浏览量

#### comments (评论表)
- `id` - 评论ID
- `post_id` - 所属帖子ID
- `user_id` - 评论者ID
- `content` - 评论内容
- `parent_id` - 父评论ID (支持嵌套)

#### interactions (互动表)
- `id` - 互动ID
- `user_id` - 用户ID
- `target_type` - 目标类型 (post/comment)
- `target_id` - 目标ID
- `interaction_type` - 互动类型 (like/bookmark/share)

## 用户等级系统

### 经验值获取规则
- 发布帖子: +10 EXP
- 发布评论: +3 EXP
- 帖子被点赞: +2 EXP (每日上限)
- 评论被点赞: +1 EXP (每日上限)

### 等级特权
- **Lv.1-3 (新手)**: 基础发帖评论权限
- **Lv.4-6 (活跃者)**: 特殊徽章显示
- **Lv.7-9 (贡献者)**: 个性化色彩
- **Lv.10+ (资深)**: 评论置顶权限

## 开发规范

### 组件封装规范
- 遵循单一职责原则
- 使用TypeScript严格类型定义
- 实现完整的Props验证机制
- 提供插槽机制支持灵活扩展

### 网络请求规范
- 统一使用Supabase客户端
- 实现请求拦截器和错误处理
- 设置合理的超时和重试机制
- 支持实时数据订阅

### 代码风格
- 使用Composition API
- 遵循Vue 3最佳实践
- 编写详细的代码注释
- 实现响应式设计

## 部署指南

### 本地部署
1. 配置环境变量
2. 安装依赖: `npm install`
3. 启动开发服务器: `npm run dev`

### 生产部署
1. 构建项目: `npm run build`
2. 部署到静态文件服务器
3. 配置Supabase生产环境

### Supabase配置
1. 创建Supabase项目
2. 导入数据库schema
3. 配置RLS策略
4. 设置存储桶

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

本项目采用 MIT 许可证。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 项目Issue: [GitHub Issues]
- 邮箱: [your-email@example.com]

---

**连接者论坛** - 让知识连接你我