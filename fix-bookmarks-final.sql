-- 完全修复收藏功能的SQL脚本
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 删除现有的bookmarks表（如果存在）
DROP TABLE IF EXISTS bookmarks CASCADE;

-- 2. 重新创建bookmarks表
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 5. 删除所有现有的RLS策略
DROP POLICY IF EXISTS "用户只能查看自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以创建收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以更新自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以删除自己的收藏" ON bookmarks;

-- 6. 重新创建正确的RLS策略
CREATE POLICY "Enable read access for users based on user_id" ON bookmarks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users based on user_id" ON bookmarks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" ON bookmarks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" ON bookmarks
    FOR DELETE USING (auth.uid() = user_id);

-- 7. 创建更新触发器函数
CREATE OR REPLACE FUNCTION update_bookmarks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. 为bookmarks表创建触发器
DROP TRIGGER IF EXISTS update_bookmarks_updated_at ON bookmarks;
CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_bookmarks_updated_at();

-- 9. 确保bookmark_folders表存在
CREATE TABLE IF NOT EXISTS bookmark_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 确保同一用户的收藏夹名称唯一
    UNIQUE(user_id, name)
);

-- 10. 为bookmark_folders表创建索引和RLS
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_user_id ON bookmark_folders(user_id);
ALTER TABLE bookmark_folders ENABLE ROW LEVEL SECURITY;

-- 11. 删除bookmark_folders的所有现有策略
DROP POLICY IF EXISTS "用户只能查看自己的收藏夹" ON bookmark_folders;
DROP POLICY IF EXISTS "用户可以创建收藏夹" ON bookmark_folders;
DROP POLICY IF EXISTS "用户可以更新自己的收藏夹" ON bookmark_folders;
DROP POLICY IF EXISTS "用户可以删除自己的收藏夹" ON bookmark_folders;

-- 12. 重新创建bookmark_folders的RLS策略
CREATE POLICY "Enable folder read access for users based on user_id" ON bookmark_folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable folder insert for authenticated users based on user_id" ON bookmark_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable folder update for users based on user_id" ON bookmark_folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable folder delete for users based on user_id" ON bookmark_folders
    FOR DELETE USING (auth.uid() = user_id);

-- 13. 创建bookmark_folders的更新触发器
CREATE OR REPLACE FUNCTION update_bookmark_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_bookmark_folders_updated_at ON bookmark_folders;
CREATE TRIGGER update_bookmark_folders_updated_at BEFORE UPDATE ON bookmark_folders
    FOR EACH ROW EXECUTE FUNCTION update_bookmark_folders_updated_at();

-- 14. 为注册新用户创建默认收藏夹的函数
CREATE OR REPLACE FUNCTION create_default_bookmark_folder()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO bookmark_folders (user_id, name)
    VALUES (NEW.id, '默认收藏夹');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 15. 创建触发器，当新用户注册时自动创建默认收藏夹
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_bookmark_folder();

-- 16. 验证表是否创建成功
SELECT 
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('bookmarks', 'bookmark_folders');

-- 17. 验证策略是否创建成功
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

-- 18. 测试查询权限（需要登录后执行）
-- SELECT COUNT(*) as bookmark_count FROM bookmarks WHERE user_id = auth.uid();
-- SELECT COUNT(*) as folder_count FROM bookmark_folders WHERE user_id = auth.uid();