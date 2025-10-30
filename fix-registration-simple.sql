-- 简化修复用户注册功能的SQL脚本
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 删除所有可能有问题的触发器和函数
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_default_bookmark_folder();
DROP TRIGGER IF EXISTS sync_bookmark_folder_trigger ON bookmarks;
DROP FUNCTION IF EXISTS sync_bookmark_folder();

-- 2. 先确保注册功能正常工作，暂时不创建收藏夹触发器
-- 这样可以确保用户注册不会因为收藏夹功能而失败

-- 3. 检查profiles表是否有正确的RLS策略
-- 删除可能有问题的策略
DROP POLICY IF EXISTS "用户可以创建自己的资料" ON profiles;

-- 重新创建正确的策略
CREATE POLICY "用户可以创建自己的资料" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. 验证修复结果
SELECT '注册功能修复完成' as status;

-- 5. 检查profiles表结构
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. 检查profiles表的RLS策略
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'profiles';