-- 修复收藏功能数据完整性的SQL脚本
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 确保bookmarks表结构正确
ALTER TABLE bookmarks 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. 确保bookmark_folders表结构正确
ALTER TABLE bookmark_folders 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. 同步收藏夹数据：将bookmarks中的folder_name同步到bookmark_folders
INSERT INTO bookmark_folders (user_id, name, created_at, updated_at)
SELECT DISTINCT 
    user_id, 
    folder_name, 
    MIN(created_at) as created_at,
    NOW() as updated_at
FROM bookmarks 
WHERE folder_name IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM bookmark_folders bf 
    WHERE bf.user_id = bookmarks.user_id 
    AND bf.name = bookmarks.folder_name
)
GROUP BY user_id, folder_name;

-- 4. 为所有用户创建默认收藏夹（如果不存在）
INSERT INTO bookmark_folders (user_id, name, created_at, updated_at)
SELECT DISTINCT 
    user_id, 
    '默认收藏夹',
    NOW(),
    NOW()
FROM bookmarks
WHERE user_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM bookmark_folders bf 
    WHERE bf.user_id = bookmarks.user_id 
    AND bf.name = '默认收藏夹'
);

-- 5. 为没有收藏夹的用户创建默认收藏夹
INSERT INTO bookmark_folders (user_id, name, created_at, updated_at)
SELECT 
    id as user_id,
    '默认收藏夹',
    NOW(),
    NOW()
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM bookmark_folders bf 
    WHERE bf.user_id = auth.users.id 
    AND bf.name = '默认收藏夹'
);

-- 6. 验证修复结果
SELECT 
    'bookmarks表记录数' as table_name,
    COUNT(*) as count
FROM bookmarks

UNION ALL

SELECT 
    'bookmark_folders表记录数' as table_name,
    COUNT(*) as count
FROM bookmark_folders

UNION ALL

SELECT 
    '有收藏记录的用户数' as table_name,
    COUNT(DISTINCT user_id) as count
FROM bookmarks

UNION ALL

SELECT 
    '有收藏夹的用户数' as table_name,
    COUNT(DISTINCT user_id) as count
FROM bookmark_folders;

-- 7. 检查修复后的数据一致性
SELECT 
    b.user_id,
    b.folder_name,
    COUNT(b.id) as bookmark_count,
    CASE WHEN bf.id IS NOT NULL THEN '已同步' ELSE '未同步' END as sync_status
FROM bookmarks b
LEFT JOIN bookmark_folders bf ON b.user_id = bf.user_id AND b.folder_name = bf.name
GROUP BY b.user_id, b.folder_name, bf.id
ORDER BY b.user_id, b.folder_name;

-- 8. 创建触发器确保新增收藏夹时自动创建bookmark_folders记录
CREATE OR REPLACE FUNCTION sync_bookmark_folder()
RETURNS TRIGGER AS $$
BEGIN
    -- 当插入新的收藏记录时，确保对应的收藏夹存在
    INSERT INTO bookmark_folders (user_id, name, created_at, updated_at)
    VALUES (NEW.user_id, NEW.folder_name, NEW.created_at, NOW())
    ON CONFLICT (user_id, name) DO NOTHING;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. 创建触发器
DROP TRIGGER IF EXISTS sync_bookmark_folder_trigger ON bookmarks;
CREATE TRIGGER sync_bookmark_folder_trigger
    AFTER INSERT ON bookmarks
    FOR EACH ROW EXECUTE FUNCTION sync_bookmark_folder();

-- 10. 验证触发器是否创建成功
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_bookmark_folder_trigger';