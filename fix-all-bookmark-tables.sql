-- 完整修复所有bookmark相关表的RLS策略和结构

-- 1. 修复bookmark_folders表
-- 删除现有策略
DROP POLICY IF EXISTS "用户只能查看自己的收藏夹" ON bookmark_folders;
DROP POLICY IF EXISTS "用户可以创建收藏夹" ON bookmark_folders;
DROP POLICY IF EXISTS "用户可以更新自己的收藏夹" ON bookmark_folders;
DROP POLICY IF EXISTS "用户可以删除自己的收藏夹" ON bookmark_folders;

-- 重新创建正确的RLS策略
CREATE POLICY "用户只能查看自己的收藏夹" ON bookmark_folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建收藏夹" ON bookmark_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的收藏夹" ON bookmark_folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的收藏夹" ON bookmark_folders
    FOR DELETE USING (auth.uid() = user_id);

-- 确保RLS已启用
ALTER TABLE bookmark_folders ENABLE ROW LEVEL SECURITY;

-- 2. 修复bookmarks表
-- 删除现有策略
DROP POLICY IF EXISTS "用户只能查看自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以创建收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以更新自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以删除自己的收藏" ON bookmarks;

-- 重新创建正确的RLS策略
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

-- 3. 检查表结构
SELECT 'bookmark_folders表结构:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookmark_folders' 
ORDER BY ordinal_position;

SELECT 'bookmarks表结构:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookmarks' 
ORDER BY ordinal_position;

-- 4. 检查RLS策略
SELECT 'bookmark_folders表的RLS策略:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'bookmark_folders';

SELECT 'bookmarks表的RLS策略:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'bookmarks';