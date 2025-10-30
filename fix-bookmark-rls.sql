-- 修复bookmarks表的RLS策略
-- 确保用户可以正确地创建和查看自己的收藏

-- 删除现有的RLS策略（如果存在）
DROP POLICY IF EXISTS "用户只能查看自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以创建收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以更新自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以删除自己的收藏" ON bookmarks;

-- 重新创建RLS策略
CREATE POLICY "用户只能查看自己的收藏" ON bookmarks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建收藏" ON bookmarks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的收藏" ON bookmarks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的收藏" ON bookmarks
    FOR DELETE USING (auth.uid() = user_id);

-- 确保RLS已启用
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 检查表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookmarks' 
ORDER BY ordinal_position;