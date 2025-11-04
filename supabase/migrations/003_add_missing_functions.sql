-- 添加缺失的数据库函数
-- 迁移文件：003_add_missing_functions.sql

-- 1. 创建 increment_view_count 函数
CREATE OR REPLACE FUNCTION increment_view_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE posts 
    SET view_count = view_count + 1 
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 创建获取帖子统计信息的函数
CREATE OR REPLACE FUNCTION get_post_stats(p_post_id UUID)
RETURNS TABLE(
    like_count INTEGER,
    comment_count INTEGER,
    view_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.like_count,
        p.comment_count,
        p.view_count
    FROM posts p
    WHERE p.id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建搜索帖子的函数
CREATE OR REPLACE FUNCTION search_posts(
    p_search_term TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    content TEXT,
    tags TEXT[],
    like_count INTEGER,
    comment_count INTEGER,
    view_count INTEGER,
    created_at TIMESTAMPTZ,
    username TEXT,
    avatar_url TEXT,
    level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.content,
        p.tags,
        p.like_count,
        p.comment_count,
        p.view_count,
        p.created_at,
        pr.username,
        pr.avatar_url,
        pr.level
    FROM posts p
    JOIN profiles pr ON p.user_id = pr.id
    WHERE 
        p.title ILIKE '%' || p_search_term || '%'
        OR p.content ILIKE '%' || p_search_term || '%'
        OR p.tags @> ARRAY[p_search_term]
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建获取热门帖子的函数
CREATE OR REPLACE FUNCTION get_popular_posts(
    p_time_range TEXT DEFAULT 'week',
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    content TEXT,
    tags TEXT[],
    like_count INTEGER,
    comment_count INTEGER,
    view_count INTEGER,
    created_at TIMESTAMPTZ,
    username TEXT,
    avatar_url TEXT,
    level INTEGER
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    -- 根据时间范围计算起始日期
    CASE p_time_range
        WHEN 'today' THEN
            start_date := NOW() - INTERVAL '1 day';
        WHEN 'week' THEN
            start_date := NOW() - INTERVAL '7 days';
        WHEN 'month' THEN
            start_date := NOW() - INTERVAL '30 days';
        WHEN 'year' THEN
            start_date := NOW() - INTERVAL '365 days';
        ELSE
            start_date := NOW() - INTERVAL '7 days'; -- 默认一周
    END CASE;

    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.content,
        p.tags,
        p.like_count,
        p.comment_count,
        p.view_count,
        p.created_at,
        pr.username,
        pr.avatar_url,
        pr.level
    FROM posts p
    JOIN profiles pr ON p.user_id = pr.id
    WHERE p.created_at >= start_date
    ORDER BY (p.like_count + p.comment_count * 2 + p.view_count * 0.1) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 创建更新用户经验的函数
CREATE OR REPLACE FUNCTION update_user_experience(
    p_user_id UUID,
    p_experience_points INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles 
    SET 
        experience_points = experience_points + p_experience_points,
        level = GREATEST(1, FLOOR((experience_points + p_experience_points) / 100) + 1)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 创建获取用户统计信息的函数
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE(
    post_count BIGINT,
    comment_count BIGINT,
    total_likes BIGINT,
    total_views BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(COUNT(DISTINCT p.id), 0)::BIGINT as post_count,
        COALESCE(COUNT(DISTINCT c.id), 0)::BIGINT as comment_count,
        COALESCE(SUM(p.like_count), 0)::BIGINT as total_likes,
        COALESCE(SUM(p.view_count), 0)::BIGINT as total_views
    FROM profiles pr
    LEFT JOIN posts p ON pr.id = p.user_id
    LEFT JOIN comments c ON pr.id = c.user_id
    WHERE pr.id = p_user_id
    GROUP BY pr.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建清理过期数据的函数
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- 删除30天前的软删除消息
    UPDATE messages 
    SET is_deleted_by_sender = TRUE, is_deleted_by_receiver = TRUE
    WHERE (is_deleted_by_sender = TRUE OR is_deleted_by_receiver = TRUE)
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- 删除软删除的会话
    UPDATE conversations 
    SET is_deleted_by_user1 = TRUE, is_deleted_by_user2 = TRUE
    WHERE (is_deleted_by_user1 = TRUE OR is_deleted_by_user2 = TRUE)
    AND last_message_at < NOW() - INTERVAL '30 days';
    
    -- 记录清理操作
    INSERT INTO system_logs (action, details) 
    VALUES ('cleanup_old_data', '清理了过期数据');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 创建系统日志表（如果不存在）
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为系统日志表启用RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- 系统日志策略：只有管理员可以查看（如果不存在则创建）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_logs' AND policyname = '只有管理员可以查看系统日志'
    ) THEN
        CREATE POLICY "只有管理员可以查看系统日志" ON system_logs
            FOR SELECT USING (EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND level >= 10
            ));
    END IF;
END $$;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);

-- 添加注释说明函数用途
COMMENT ON FUNCTION increment_view_count IS '增加帖子浏览量';
COMMENT ON FUNCTION get_post_stats IS '获取帖子统计信息';
COMMENT ON FUNCTION search_posts IS '搜索帖子';
COMMENT ON FUNCTION get_popular_posts IS '获取热门帖子';
COMMENT ON FUNCTION update_user_experience IS '更新用户经验值';
COMMENT ON FUNCTION get_user_stats IS '获取用户统计信息';
COMMENT ON FUNCTION cleanup_old_data IS '清理过期数据';

-- 输出迁移完成信息
DO $$
BEGIN
    RAISE NOTICE '迁移003_add_missing_functions.sql执行完成';
END $$;