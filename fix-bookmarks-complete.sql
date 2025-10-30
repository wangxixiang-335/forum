-- 完整修复收藏功能的SQL脚本
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 删除现有的bookmarks表（如果存在）
DROP TABLE IF EXISTS bookmarks CASCADE;

-- 2. 重新创建bookmarks表
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id UUID NOT NULL,
    folder_name TEXT DEFAULT '默认收藏夹',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 防止重复收藏
    UNIQUE(user_id, target_type, target_id)
);

-- 3. 创建索引以优化查询性能
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_target ON bookmarks(target_type, target_id);
CREATE INDEX idx_bookmarks_folder ON bookmarks(user_id, folder_name);
CREATE INDEX idx_bookmarks_created_at ON bookmarks(created_at DESC);

-- 4. 启用行级安全 (RLS)
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 5. 创建RLS策略
CREATE POLICY "用户只能查看自己的收藏" ON bookmarks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建收藏" ON bookmarks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的收藏" ON bookmarks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的收藏" ON bookmarks
    FOR DELETE USING (auth.uid() = user_id);

-- 6. 创建更新触发器函数
CREATE OR REPLACE FUNCTION update_bookmarks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. 为bookmarks表创建触发器
CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_bookmarks_updated_at();

-- 8. 验证表是否创建成功
SELECT 
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'bookmarks';

-- 9. 验证策略是否创建成功
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

-- 10. 测试查询权限（需要登录后执行）
-- SELECT COUNT(*) as bookmark_count FROM bookmarks WHERE user_id = auth.uid();