-- 诊断收藏功能问题的SQL脚本
-- 在 Supabase SQL 编辑器中执行此脚本来诊断问题

-- 1. 检查bookmarks表是否存在
SELECT 
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'bookmarks';

-- 2. 检查表结构
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bookmarks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 检查RLS策略
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

-- 4. 检查索引
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'bookmarks' 
AND schemaname = 'public';

-- 5. 检查是否有收藏数据
SELECT COUNT(*) as total_bookmarks FROM bookmarks;

-- 6. 检查当前用户的收藏数据（需要登录后执行）
SELECT 
    id,
    target_type,
    target_id,
    folder_name,
    note,
    created_at
FROM bookmarks 
WHERE user_id = auth.uid()
LIMIT 5;

-- 7. 检查posts表中是否有数据
SELECT COUNT(*) as total_posts FROM posts;

-- 8. 检查comments表中是否有数据
SELECT COUNT(*) as total_comments FROM comments;

-- 9. 检查用户资料表
SELECT COUNT(*) as total_profiles FROM profiles;