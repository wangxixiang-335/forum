# Supabase RLS 策略修复指南

## 问题描述
新注册用户的资料无法保存到 Supabase，错误信息："new row violates row-level security policy for table profiles"

## 根本原因
缺少对 `profiles` 表的 INSERT RLS 策略，或者现有策略配置不正确。

## 解决方案

### 方法1：通过 Supabase Dashboard 修复（推荐）

1. **登录 Supabase Dashboard**
   - 访问: https://app.supabase.com
   - 选择项目: `zykvhxqpyvudppdvmkeg`

2. **进入 SQL 编辑器**
   - 左侧菜单 → SQL Editor
   - 点击 "New query"

3. **执行以下 SQL 修复脚本**

```sql
-- 修复 profiles 表的 RLS 策略
-- 1. 删除现有策略（如果存在）
DROP POLICY IF EXISTS "任何人都可以查看用户资料" ON profiles;
DROP POLICY IF EXISTS "登录用户可以创建自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户只能更新自己的资料" ON profiles;

-- 2. 重新创建正确的策略
-- 任何人都可以查看用户资料
CREATE POLICY "任何人都可以查看用户资料" ON profiles
    FOR SELECT USING (true);

-- 登录用户可以创建自己的资料（关键修复）
CREATE POLICY "登录用户可以创建自己的资料" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 用户只能更新自己的资料
CREATE POLICY "用户只能更新自己的资料" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. 验证策略创建
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

4. **点击 "Run" 执行 SQL**

### 方法2：通过 Supabase CLI 修复

如果你有 Supabase CLI 安装：

```bash
# 登录 Supabase
supabase login

# 链接项目
supabase link --project-ref zykvhxqpyvudppdvmkeg

# 执行修复 SQL
supabase db execute --file fix-rls-policies.sql
```

### 方法3：临时解决方案（开发环境）

如果暂时无法修复 RLS 策略，可以在开发模式下使用模拟数据：

1. **检查环境配置**
   - 确保 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 正确配置
   - 如果不是生产环境，应用会自动使用模拟数据

2. **开发模式行为**
   - 当 RLS 策略缺失时，应用会使用本地模拟用户资料
   - 注册功能仍然可以工作，但数据不会保存到数据库

## 验证修复

修复后，进行以下测试：

1. **注册新用户**
   - 访问注册页面
   - 填写表单并提交
   - 检查控制台是否有错误

2. **检查数据库**
   - 在 Supabase Dashboard 中查看 `profiles` 表
   - 确认新用户资料已创建

3. **测试登录**
   - 使用新注册的账号登录
   - 验证用户资料是否正确加载

## 常见错误及解决方案

### 错误1："function auth.uid() does not exist"
```sql
-- 确保 auth 扩展已启用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 错误2："policy already exists"
```sql
-- 先删除再创建
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ON table_name ...;
```

### 错误3：权限不足
- 确保使用具有足够权限的 API Key
- 检查 RLS 是否已启用：`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`

## 预防措施

1. **在迁移文件中包含完整的 RLS 策略**
2. **在应用启动时检查数据库状态**
3. **提供友好的错误提示和降级方案**
4. **定期测试注册流程**

## 紧急联系方式

如果以上方法都无法解决问题：
- 检查 Supabase 项目状态：https://status.supabase.com/
- 查看项目日志：Supabase Dashboard → Logs
- 联系 Supabase 支持