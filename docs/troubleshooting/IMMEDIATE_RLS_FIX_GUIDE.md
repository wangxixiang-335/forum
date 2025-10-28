# 🔧 立即修复 RLS 策略指南

## 📋 问题确认

**错误信息**: `new row violates row-level security policy for table "profiles"`  
**错误代码**: 42501  
**根本原因**: profiles 表缺少 INSERT RLS 策略

## 🚀 立即修复步骤

### 方法1: 通过 Supabase Dashboard（推荐）

1. **登录 Supabase Dashboard**
   - 打开: https://app.supabase.com
   - 选择项目: `zykvhxqpyvudppdvmkeg`

2. **执行 SQL 修复脚本**
   - 进入: SQL Editor (左侧菜单)
   - 复制以下 SQL 代码并粘贴:

```sql
-- 修复 profiles 表 RLS 策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 删除旧策略
DROP POLICY IF EXISTS "任何人都可以查看用户资料" ON profiles;
DROP POLICY IF EXISTS "登录用户可以创建自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户只能更新自己的资料" ON profiles;

-- 创建新策略
CREATE POLICY "任何人都可以查看用户资料" ON profiles FOR SELECT USING (true);
CREATE POLICY "登录用户可以创建自己的资料" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "用户只能更新自己的资料" ON profiles FOR UPDATE USING (auth.uid() = id);
```

3. **点击 "Run" 执行**
   - 等待执行完成（约 1-2 秒）
   - 确认没有错误信息

### 方法2: 通过 Table Editor

1. **进入 Table Editor**
   - 左侧菜单 → Table Editor
   - 选择 `profiles` 表

2. **配置 Policies**
   - 点击 "Policies" 标签
   - 点击 "New Policy"
   - 按以下顺序创建策略:

#### 策略1: SELECT 策略
- **策略名称**: "任何人都可以查看用户资料"
- **操作类型**: SELECT
- **使用表达式**: `true`

#### 策略2: INSERT 策略（关键）
- **策略名称**: "登录用户可以创建自己的资料"
- **操作类型**: INSERT
- **检查表达式**: `auth.uid() = id`

#### 策略3: UPDATE 策略
- **策略名称**: "用户只能更新自己的资料"
- **操作类型**: UPDATE
- **使用表达式**: `auth.uid() = id`

## ✅ 验证修复结果

修复完成后，请:

1. **重新测试用户注册**
   - 打开应用: http://localhost:3007/
   - 尝试注册新用户
   - 检查控制台是否还有 RLS 错误

2. **验证用户资料创建**
   - 注册成功后，检查 profiles 表是否有新记录
   - 确认用户资料能正常保存

## 🔍 故障排除

如果修复后仍有问题:

1. **检查策略是否生效**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

2. **验证 RLS 是否启用**
   ```sql
   SELECT relname, relrowsecurity FROM pg_class 
   WHERE relname = 'profiles' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
   ```

3. **检查策略表达式**
   - 确保 INSERT 策略使用 `WITH CHECK (auth.uid() = id)`
   - 确保策略名称正确

## 📞 技术支持

如果以上方法都无法解决问题:
- 检查 Supabase 项目设置
- 验证 API 密钥权限
- 联系 Supabase 支持

## 🎯 预期结果

修复成功后，新用户注册时将:
- ✅ 成功创建用户认证
- ✅ 成功创建用户资料
- ✅ 不再出现 RLS 策略错误
- ✅ 用户资料正常保存到数据库