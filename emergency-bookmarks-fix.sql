-- 紧急修复书签RLS问题
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 完全禁用RLS以测试基本功能
ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;

-- 2. 删除所有现有策略
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON bookmarks;
DROP POLICY IF EXISTS "Enable insert for authenticated users based on user_id" ON bookmarks;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON bookmarks;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON bookmarks;
DROP POLICY IF EXISTS "用户只能查看自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以创建收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以更新自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以删除自己的收藏" ON bookmarks;

-- 3. 测试基本查询是否工作
SELECT COUNT(*) as total_bookmarks FROM bookmarks;

-- 4. 如果基本查询工作，重新启用RLS并创建最简单的策略
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 5. 创建最简单的RLS策略
CREATE POLICY "Allow all operations for authenticated users" ON bookmarks
    FOR ALL USING (auth.role() = 'authenticated');

-- 6. 验证策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'bookmarks';

-- 7. 测试当前用户的访问权限
SELECT COUNT(*) as my_bookmarks 
FROM bookmarks 
WHERE user_id = auth.uid();