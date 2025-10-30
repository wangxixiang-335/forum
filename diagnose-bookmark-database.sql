-- 诊断和修复收藏功能数据库问题的SQL脚本
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 检查bookmarks表的结构和数据
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'bookmarks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. 检查bookmark_folders表的结构和数据
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'bookmark_folders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 查看bookmarks表中的所有数据
SELECT 
    id,
    user_id,
    target_type,
    target_id,
    folder_name,
    note,
    created_at
FROM bookmarks 
ORDER BY created_at DESC;

-- 4. 查看bookmark_folders表中的所有数据
SELECT 
    id,
    user_id,
    name,
    created_at
FROM bookmark_folders 
ORDER BY created_at DESC;

-- 5. 检查外键约束
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
AND tc.table_name IN ('bookmarks', 'bookmark_folders');

-- 6. 检查RLS策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('bookmarks', 'bookmark_folders');

-- 7. 统计每个用户的收藏夹数量
SELECT 
    user_id,
    COUNT(DISTINCT folder_name) as folder_count,
    COUNT(*) as total_bookmarks
FROM bookmarks 
GROUP BY user_id;

-- 8. 统计每个用户的bookmark_folders数量
SELECT 
    user_id,
    COUNT(*) as folder_count
FROM bookmark_folders 
GROUP BY user_id;

-- 9. 检查是否有孤立的书签记录（folder_name不在bookmark_folders中）
SELECT 
    b.user_id,
    b.folder_name,
    COUNT(*) as orphan_count
FROM bookmarks b
LEFT JOIN bookmark_folders bf ON b.user_id = bf.user_id AND b.folder_name = bf.name
WHERE bf.id IS NULL
GROUP BY b.user_id, b.folder_name;