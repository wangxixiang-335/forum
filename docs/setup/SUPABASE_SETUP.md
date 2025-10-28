# Supabase 项目配置指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase官网](https://supabase.com)
2. 注册/登录账户
3. 点击 "New Project" 创建新项目
4. 填写项目信息：
   - **Name**: forum-connector (或您喜欢的名称)
   - **Database Password**: 设置安全的数据库密码
   - **Region**: 选择离您最近的区域（如 ap-southeast-1）
5. 点击 "Create new project"

## 2. 获取连接信息

项目创建完成后，在项目仪表板中：

1. 进入 **Settings** → **API**
2. 找到以下信息：
   - **Project URL**: 在 "Config" 部分的 `URL`
   - **anon public**: 在 "Project API keys" 部分的 `public` key

## 3. 配置环境变量

编辑 `.env` 文件，替换以下值：

```env
VITE_SUPABASE_URL=您的项目URL
VITE_SUPABASE_ANON_KEY=您的anon public key
```

示例：
```env
VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. 执行数据库迁移

### 方法一：使用 Supabase Dashboard
1. 进入 **SQL Editor**
2. 复制 `supabase/migrations/001_create_tables.sql` 文件内容
3. 粘贴到 SQL 编辑器中并执行

### 方法二：使用 Supabase CLI
```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接项目
supabase link --project-ref your-project-ref

# 推送迁移
supabase db push
```

## 5. 验证配置

1. 重启开发服务器：`npm run dev`
2. 访问 http://localhost:3000/
3. 应用应该能正常加载，不再显示环境变量错误

## 6. 测试功能

配置完成后，您可以测试以下功能：
- 用户注册/登录
- 创建帖子
- 发表评论
- 点赞功能

## 故障排除

### 常见问题

**Q: 环境变量配置后仍然报错？**
A: 确保重启开发服务器，Vite需要重新加载环境变量

**Q: 数据库迁移失败？**
A: 检查SQL语法错误，确保您有足够的权限执行DDL操作

**Q: 实时功能不工作？**
A: 确保在Supabase Dashboard中启用了Realtime功能

### 安全建议

- 不要将真实的Supabase密钥提交到版本控制
- 在生产环境中使用环境变量管理敏感信息
- 定期轮换API密钥
- 配置适当的RLS策略保护数据安全

## 下一步

完成Supabase配置后，您可以：
1. 开发具体的论坛功能
2. 测试用户认证流程
3. 实现实时互动功能
4. 部署到生产环境