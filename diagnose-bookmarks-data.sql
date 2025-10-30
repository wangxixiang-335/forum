-- 诊断和修复收藏帖子消失问题的SQL脚本
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 检查bookmarks表是否存在
SELECT 
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'bookmarks';

-- 2. 检查bookmarks表结构
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bookmarks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 检查bookmarks表的RLS策略
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

-- 4. 检查是否有收藏数据
SELECT COUNT(*) as total_bookmarks FROM bookmarks;

-- 5. 检查当前用户的收藏数据（需要登录后执行）
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

-- 6. 检查profiles表是否有数据
SELECT COUNT(*) as total_profiles FROM profiles;

-- 7. 检查当前用户的profile（需要登录后执行）
SELECT id, username, created_at FROM profiles WHERE id = auth.uid();

-- 8. 测试RLS策略是否正常工作（需要登录后执行）
-- 这应该返回当前用户的收藏数量
SELECT COUNT(*) as my_bookmarks FROM bookmarks WHERE user_id = auth.uid();

-- 9. 检查外键约束
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'bookmarks';