-- 修复书签功能的RLS策略问题
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 确保bookmarks表存在
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

-- 2. 删除可能冲突的旧策略
DROP POLICY IF EXISTS "用户只能查看自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以创建收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以更新自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以删除自己的收藏" ON bookmarks;

-- 3. 启用RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 4. 重新创建正确的RLS策略
CREATE POLICY "用户只能查看自己的收藏" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "用户可以创建收藏" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可以更新自己的收藏" ON bookmarks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "用户可以删除自己的收藏" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- 5. 确保索引存在
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_target ON bookmarks(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(user_id, folder_name);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);

-- 6. 验证策略是否创建成功
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

-- 7. 测试查询权限
-- 这个查询应该返回当前用户的收藏
SELECT COUNT(*) as bookmark_count 
FROM bookmarks 
WHERE user_id = auth.uid();