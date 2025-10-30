-- 完整修复论坛收藏功能
-- 这个脚本将修复所有与收藏功能相关的问题

-- =====================================================
-- 1. 创建和修复 bookmark_folders 表
-- =====================================================

-- 创建 bookmark_folders 表（如果不存在）
CREATE TABLE IF NOT EXISTS bookmark_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 确保同一用户不能有同名收藏夹
    UNIQUE(user_id, name)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_user_id ON bookmark_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_name ON bookmark_folders(name);

-- 启用RLS
ALTER TABLE bookmark_folders ENABLE ROW LEVEL SECURITY;

-- 删除旧的RLS策略
DROP POLICY IF EXISTS "用户只能查看自己的收藏夹" ON bookmark_folders;
DROP POLICY IF EXISTS "用户可以创建收藏夹" ON bookmark_folders;
DROP POLICY IF EXISTS "用户可以更新自己的收藏夹" ON bookmark_folders;
DROP POLICY IF EXISTS "用户可以删除自己的收藏夹" ON bookmark_folders;

-- 创建新的RLS策略
CREATE POLICY "用户只能查看自己的收藏夹" ON bookmark_folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建收藏夹" ON bookmark_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的收藏夹" ON bookmark_folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的收藏夹" ON bookmark_folders
    FOR DELETE USING (auth.uid() = user_id);

-- 创建更新触发器
CREATE TRIGGER update_bookmark_folders_updated_at BEFORE UPDATE ON bookmark_folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. 修复 bookmarks 表
-- =====================================================

-- 确保 bookmarks 表存在
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id UUID NOT NULL,
    folder_name TEXT DEFAULT '默认收藏夹',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 防止重复收藏
    UNIQUE(user_id, target_type, target_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_target ON bookmarks(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(user_id, folder_name);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);

-- 启用RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 删除旧的RLS策略
DROP POLICY IF EXISTS "用户只能查看自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以创建收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以更新自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以删除自己的收藏" ON bookmarks;

-- 创建新的RLS策略
CREATE POLICY "用户只能查看自己的收藏" ON bookmarks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建收藏" ON bookmarks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的收藏" ON bookmarks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的收藏" ON bookmarks
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 3. 检查和修复表结构
-- =====================================================

-- 检查表结构
SELECT 'bookmark_folders表结构:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bookmark_folders' 
ORDER BY ordinal_position;

SELECT 'bookmarks表结构:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bookmarks' 
ORDER BY ordinal_position;

-- =====================================================
-- 4. 检查RLS策略
-- =====================================================

SELECT 'bookmark_folders表的RLS策略:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'bookmark_folders';

SELECT 'bookmarks表的RLS策略:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'bookmarks';

-- =====================================================
-- 5. 创建辅助函数（可选）
-- =====================================================

-- 创建获取用户收藏夹列表的函数
CREATE OR REPLACE FUNCTION get_user_bookmark_folders(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    created_at TIMESTAMPTZ,
    bookmark_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bf.id,
        bf.name,
        bf.created_at,
        COALESCE(b.count, 0) as bookmark_count
    FROM bookmark_folders bf
    LEFT JOIN (
        SELECT folder_name, COUNT(*) as count
        FROM bookmarks
        WHERE user_id = p_user_id
        GROUP BY folder_name
    ) b ON bf.name = b.folder_name
    WHERE bf.user_id = p_user_id
    ORDER BY bf.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. 数据迁移和清理（如果需要）
-- =====================================================

-- 为现有用户创建默认收藏夹
INSERT INTO bookmark_folders (user_id, name)
SELECT DISTINCT user_id, '默认收藏夹'
FROM bookmarks
WHERE user_id NOT IN (
    SELECT user_id 
    FROM bookmark_folders 
    WHERE name = '默认收藏夹'
)
ON CONFLICT (user_id, name) DO NOTHING;

-- =====================================================
-- 7. 验证脚本执行结果
-- =====================================================

-- 显示表中的记录数
SELECT 'bookmark_folders记录数:' as info, COUNT(*) as count FROM bookmark_folders;
SELECT 'bookmarks记录数:' as info, COUNT(*) as count FROM bookmarks;

-- 显示示例数据
SELECT 'bookmark_folders示例数据:' as info;
SELECT * FROM bookmark_folders LIMIT 3;

SELECT 'bookmarks示例数据:' as info;
SELECT * FROM bookmarks LIMIT 3;