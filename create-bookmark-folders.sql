-- 创建收藏夹表
-- 这个表用于管理用户的收藏夹

CREATE TABLE IF NOT EXISTS bookmark_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 确保同一用户不能有同名收藏夹
    UNIQUE(user_id, name)
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_user_id ON bookmark_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_name ON bookmark_folders(name);

-- 启用行级安全 (RLS)
ALTER TABLE bookmark_folders ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
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