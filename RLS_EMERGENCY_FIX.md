# RLS策略紧急修复指南

## 问题描述
用户注册时出现 `401 Unauthorized` 和 `42501 row-level security policy` 错误。

## 快速修复步骤

### 方法1：使用Supabase SQL Editor（推荐）

1. 打开 Supabase SQL Editor: https://app.supabase.com/project/zykvhxqpyvudppdvmkeg/sql
2. 复制并执行以下SQL代码：

```sql
-- 确保RLS已启用
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS "任何人都可以查看用户资料" ON profiles;
DROP POLICY IF EXISTS "登录用户可以创建自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户只能更新自己的资料" ON profiles;

-- 创建新策略
CREATE POLICY "任何人都可以查看用户资料" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "登录用户可以创建自己的资料" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "用户只能更新自己的资料" ON profiles
    FOR UPDATE USING (auth.uid() = id);
```

### 方法2：使用Supabase Dashboard

1. 登录 Supabase Dashboard: https://app.supabase.com
2. 选择项目: `zykvhxqpyvudppdvmkeg`
3. 进入 **Table Editor** → **profiles** 表
4. 点击 **Policies** 标签
5. 创建以下策略：
   - **SELECT策略**: "任何人都可以查看用户资料"，使用表达式 `true`
   - **INSERT策略**: "登录用户可以创建自己的资料"，检查表达式 `auth.uid() = id`
   - **UPDATE策略**: "用户只能更新自己的资料"，使用表达式 `auth.uid() = id`

## 临时解决方案

应用已配置为在RLS策略问题时使用模拟数据，用户可以正常注册，但资料不会保存到数据库。

## 验证修复

修复完成后，重新测试用户注册功能，应该不再出现RLS错误。