# Supabase连接配置指南

本文档将指导您完成Supabase项目的连接配置。

## 1. 环境变量配置

### 创建.env文件
在项目根目录创建 `.env` 文件，并添加以下配置：

```env
# Supabase配置
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# 应用配置
VITE_APP_NAME=连接者论坛
VITE_APP_VERSION=1.0.0
```

### 获取配置信息
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 进入 **Settings** > **API**
4. 复制以下信息：
   - **Project URL**: 在 "Config" 部分找到
   - **anon/public key**: 在 "Project API keys" 部分找到

## 2. 数据库迁移

### 执行数据库迁移
项目提供了自动迁移功能，可以通过以下方式执行：

#### 方式一：通过Supabase管理器
1. 启动应用：`npm run dev`
2. 访问：`http://localhost:5173/supabase-manager`
3. 点击 "执行迁移" 按钮

#### 方式二：通过Supabase CLI
```bash
# 安装Supabase CLI
npm install -g supabase

# 登录Supabase
supabase login

# 链接项目
supabase link --project-ref your-project-ref

# 执行迁移
supabase db push
```

#### 方式三：通过SQL编辑器
1. 登录 Supabase Dashboard
2. 进入 **SQL Editor**
3. 复制 `supabase/migrations/001_create_tables.sql` 内容
4. 执行SQL语句

## 3. 连接测试

### 测试连接状态
1. 访问：`http://localhost:5173/connection-test`
2. 点击 "测试连接" 按钮
3. 查看连接状态和数据库表状态

### 预期结果
- ✅ Supabase连接正常
- ✅ 所有数据库表可访问
- ✅ 认证系统正常工作

## 4. 故障排除

### 常见问题

#### 问题1：400 Bad Request
**症状**: 认证请求返回400错误
**原因**: 环境变量配置错误或Supabase项目配置问题
**解决方案**:
1. 检查 `.env` 文件中的URL和Key是否正确
2. 确认Supabase项目中的URL配置
3. 检查认证设置（是否禁用注册等）

#### 问题2：表不存在
**症状**: 数据库表访问失败
**原因**: 迁移未执行或执行失败
**解决方案**:
1. 通过Supabase管理器执行迁移
2. 检查迁移SQL是否有语法错误
3. 确认数据库权限设置

#### 问题3：认证失败
**症状**: 用户无法登录或注册
**原因**: RLS策略配置问题或认证设置错误
**解决方案**:
1. 检查Supabase认证设置
2. 确认RLS策略是否正确配置
3. 检查重定向URL配置

### 调试工具

应用提供了以下调试工具：

#### 控制台命令（开发模式）
```javascript
// 检查连接状态
window.__FORUM_DEBUG__.checkConnection()

// 检查数据库状态
window.__FORUM_DEBUG__.checkDatabase()

// 获取当前会话
window.__FORUM_DEBUG__.getSession()

// 退出登录
window.__FORUM_DEBUG__.signOut()
```

#### 环境检查
访问 `http://localhost:5173/supabase-manager` 查看详细的配置验证报告。

## 5. 生产环境部署

### 环境变量设置
在生产环境中，确保设置正确的环境变量：

#### Vercel部署
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### Netlify部署
在 **Site settings** > **Environment variables** 中设置。

### 数据库迁移
生产环境迁移建议使用Supabase CLI：

```bash
# 设置生产环境变量
export SUPABASE_ACCESS_TOKEN=your-access-token
export SUPABASE_DB_PASSWORD=your-db-password

# 执行迁移
supabase db push
```

## 6. 安全配置

### 环境安全
- 不要将 `.env` 文件提交到版本控制
- 生产环境使用环境变量而非文件
- 定期轮换API密钥

### Supabase安全设置
1. 启用Row Level Security (RLS)
2. 配置适当的CORS设置
3. 设置合理的速率限制
4. 定期审计数据库权限

## 7. 监控和维护

### 连接监控
应用会自动监控连接状态，并在以下情况下显示警告：
- 网络连接断开
- Supabase服务不可用
- 认证令牌过期

### 日志查看
- 开发模式：浏览器控制台查看详细日志
- 生产模式：Supabase Dashboard查看服务日志

## 8. 支持资源

### 官方文档
- [Supabase文档](https://supabase.com/docs)
- [Supabase JavaScript客户端](https://supabase.com/docs/reference/javascript)
- [Supabase认证指南](https://supabase.com/docs/guides/auth)

### 社区支持
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

### 项目文档
- [需求文档](./需求文档.md)
- [Supabase设置指南](./SUPABASE_SETUP.md)

---

**注意**: 如果在配置过程中遇到问题，请先检查本文档的故障排除部分。如果问题仍然存在，请查看控制台错误信息并提供详细的问题描述。

**成功标志**: 当您能够在连接测试页面看到所有绿色勾选标记时，表示Supabase连接配置已完成。