-- 紧急修复bookmarks表的RLS策略
-- 这个脚本将立即修复用户无法创建收藏的问题

-- 1. 首先完全重置bookmarks表的RLS策略
ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;

-- 2. 重新启用RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 3. 删除所有现有策略
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON bookmarks;
DROP POLICY IF EXISTS "Enable insert for authenticated users based on user_id" ON bookmarks;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON bookmarks;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON bookmarks;
DROP POLICY IF EXISTS "用户只能查看自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以创建收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以更新自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以删除自己的收藏" ON bookmarks;

-- 4. 创建最简单的RLS策略
CREATE POLICY "Users can view own bookmarks" ON bookmarks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks" ON bookmarks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks" ON bookmarks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON bookmarks
    FOR DELETE USING (auth.uid() = user_id);

-- 5. 验证策略是否创建成功
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

-- 6. 测试查询（这个查询应该返回当前用户的收藏）
SELECT '当前bookmarks表中的记录数:' as info, COUNT(*) as count 
FROM bookmarks;

-- 7. 显示表结构确认
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookmarks' 
ORDER BY ordinal_position;