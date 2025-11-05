-- 添加图片支持功能
-- 创建帖子图片表
CREATE TABLE IF NOT EXISTS post_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为帖子表添加图片相关字段
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS has_images BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_user_id ON post_images(user_id);
CREATE INDEX IF NOT EXISTS idx_post_images_created_at ON post_images(created_at);

-- 创建存储桶策略（需要在Supabase控制台手动创建存储桶）
-- 注意：以下策略需要在Supabase控制台中手动配置

-- 启用RLS
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- 创建策略：任何人都可以查看帖子图片
CREATE POLICY "任何人都可以查看帖子图片" ON post_images
    FOR SELECT USING (true);

-- 创建策略：认证用户可以插入图片
CREATE POLICY "认证用户可以插入图片" ON post_images
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 创建策略：用户只能更新自己的图片
CREATE POLICY "用户只能更新自己的图片" ON post_images
    FOR UPDATE USING (auth.uid() = user_id);

-- 创建策略：用户只能删除自己的图片
CREATE POLICY "用户只能删除自己的图片" ON post_images
    FOR DELETE USING (auth.uid() = user_id);

-- 创建函数：更新帖子图片状态
CREATE OR REPLACE FUNCTION update_post_image_status()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新帖子的has_images状态
    UPDATE posts 
    SET has_images = EXISTS (
        SELECT 1 FROM post_images WHERE post_id = NEW.post_id
    ),
    updated_at = NOW()
    WHERE id = NEW.post_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：插入图片后更新帖子状态
CREATE OR REPLACE TRIGGER after_post_image_insert
    AFTER INSERT ON post_images
    FOR EACH ROW
    EXECUTE FUNCTION update_post_image_status();

-- 创建触发器：删除图片后更新帖子状态
CREATE OR REPLACE TRIGGER after_post_image_delete
    AFTER DELETE ON post_images
    FOR EACH ROW
    EXECUTE FUNCTION update_post_image_status();

-- 创建函数：设置封面图片
CREATE OR REPLACE FUNCTION set_post_cover_image(post_uuid UUID, image_url TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE posts 
    SET cover_image_url = image_url,
        updated_at = NOW()
    WHERE id = post_uuid;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：获取帖子的图片列表
CREATE OR REPLACE FUNCTION get_post_images(post_uuid UUID)
RETURNS TABLE (
    id UUID,
    image_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    sort_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pi.id,
        pi.image_url,
        pi.file_name,
        pi.file_size,
        pi.mime_type,
        pi.width,
        pi.height,
        pi.alt_text,
        pi.sort_order,
        pi.created_at
    FROM post_images pi
    WHERE pi.post_id = post_uuid
    ORDER BY pi.sort_order, pi.created_at;
END;
$$ LANGUAGE plpgsql;