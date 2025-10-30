-- 添加搜索功能的数据库优化脚本
-- 执行此脚本到 Supabase SQL 编辑器中以增强搜索性能

-- 1. 为帖子表添加全文搜索索引
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING gin(to_tsvector('chinese', title || ' ' || content));

-- 2. 为评论表添加全文搜索索引
CREATE INDEX IF NOT EXISTS idx_comments_search ON comments USING gin(to_tsvector('chinese', content));

-- 3. 为用户名添加搜索索引
CREATE INDEX IF NOT EXISTS idx_profiles_username_search ON profiles USING gin(to_tsvector('chinese', username));

-- 4. 创建高级搜索函数
CREATE OR REPLACE FUNCTION advanced_search_posts(
    search_query TEXT DEFAULT NULL,
    tag_filter TEXT[] DEFAULT NULL,
    time_filter TEXT DEFAULT NULL,
    sort_by TEXT DEFAULT 'relevance',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    level INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    view_count INTEGER,
    tags TEXT[],
    is_pinned BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.content,
        p.user_id,
        pr.username,
        pr.avatar_url,
        pr.level,
        p.like_count,
        p.comment_count,
        p.view_count,
        p.tags,
        p.is_pinned,
        p.created_at,
        p.updated_at,
        CASE 
            WHEN search_query IS NOT NULL THEN 
                ts_rank(to_tsvector('chinese', p.title || ' ' || p.content), plainto_tsquery('chinese', search_query))
            ELSE 0 
        END as relevance_score
    FROM posts p
    JOIN profiles pr ON p.user_id = pr.id
    WHERE 
        -- 搜索条件
        (search_query IS NULL OR to_tsvector('chinese', p.title || ' ' || p.content) @@ plainto_tsquery('chinese', search_query))
        -- 标签过滤
        AND (tag_filter IS NULL OR p.tags && tag_filter)
        -- 时间过滤
        AND (
            time_filter IS NULL OR
            (time_filter = 'today' AND p.created_at >= CURRENT_DATE) OR
            (time_filter = 'week' AND p.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
            (time_filter = 'month' AND p.created_at >= CURRENT_DATE - INTERVAL '1 month') OR
            (time_filter = 'year' AND p.created_at >= CURRENT_DATE - INTERVAL '1 year')
        )
    ORDER BY
        CASE 
            WHEN sort_by = 'relevance' AND search_query IS NOT NULL THEN ts_rank(to_tsvector('chinese', p.title || ' ' || p.content), plainto_tsquery('chinese', search_query))
            WHEN sort_by = 'newest' THEN p.created_at
            WHEN sort_by = 'oldest' THEN p.created_at
            WHEN sort_by = 'most_liked' THEN p.like_count
            WHEN sort_by = 'most_commented' THEN p.comment_count
            WHEN sort_by = 'most_viewed' THEN p.view_count
            ELSE p.is_pinned DESC, p.created_at DESC
        END DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建用户搜索函数
CREATE OR REPLACE FUNCTION search_users(
    search_query TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    avatar_url TEXT,
    level INTEGER,
    experience_points INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id,
        pr.username,
        pr.avatar_url,
        pr.level,
        pr.experience_points,
        pr.created_at,
        pr.updated_at,
        CASE 
            WHEN search_query IS NOT NULL THEN 
                ts_rank(to_tsvector('chinese', pr.username), plainto_tsquery('chinese', search_query))
            ELSE 0 
        END as relevance_score
    FROM profiles pr
    WHERE 
        search_query IS NULL OR to_tsvector('chinese', pr.username) @@ plainto_tsquery('chinese', search_query)
    ORDER BY
        CASE 
            WHEN search_query IS NOT NULL THEN ts_rank(to_tsvector('chinese', pr.username), plainto_tsquery('chinese', search_query))
            ELSE pr.experience_points
        END DESC,
        pr.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建评论搜索函数
CREATE OR REPLACE FUNCTION search_comments(
    search_query TEXT DEFAULT NULL,
    time_filter TEXT DEFAULT NULL,
    sort_by TEXT DEFAULT 'relevance',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    level INTEGER,
    post_id UUID,
    post_title TEXT,
    parent_id UUID,
    like_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.content,
        c.user_id,
        pr.username,
        pr.avatar_url,
        pr.level,
        c.post_id,
        p.title as post_title,
        c.parent_id,
        c.like_count,
        c.created_at,
        c.updated_at,
        CASE 
            WHEN search_query IS NOT NULL THEN 
                ts_rank(to_tsvector('chinese', c.content), plainto_tsquery('chinese', search_query))
            ELSE 0 
        END as relevance_score
    FROM comments c
    JOIN profiles pr ON c.user_id = pr.id
    JOIN posts p ON c.post_id = p.id
    WHERE 
        -- 搜索条件
        (search_query IS NULL OR to_tsvector('chinese', c.content) @@ plainto_tsquery('chinese', search_query))
        -- 时间过滤
        AND (
            time_filter IS NULL OR
            (time_filter = 'today' AND c.created_at >= CURRENT_DATE) OR
            (time_filter = 'week' AND c.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
            (time_filter = 'month' AND c.created_at >= CURRENT_DATE - INTERVAL '1 month') OR
            (time_filter = 'year' AND c.created_at >= CURRENT_DATE - INTERVAL '1 year')
        )
    ORDER BY
        CASE 
            WHEN sort_by = 'relevance' AND search_query IS NOT NULL THEN ts_rank(to_tsvector('chinese', c.content), plainto_tsquery('chinese', search_query))
            WHEN sort_by = 'newest' THEN c.created_at
            WHEN sort_by = 'oldest' THEN c.created_at
            WHEN sort_by = 'most_liked' THEN c.like_count
            ELSE c.created_at DESC
        END DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建获取热门标签的函数
CREATE OR REPLACE FUNCTION get_popular_tags(
    limit_count INTEGER DEFAULT 20,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    tag TEXT,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tag,
        COUNT(*) as count
    FROM (
        SELECT unnest(tags) as tag
        FROM posts
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ) as tag_counts
    GROUP BY tag
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建搜索统计函数
CREATE OR REPLACE FUNCTION get_search_stats()
RETURNS TABLE (
    total_posts BIGINT,
    total_users BIGINT,
    total_comments BIGINT,
    posts_today BIGINT,
    comments_today BIGINT,
    active_users_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM posts) as total_posts,
        (SELECT COUNT(*) FROM profiles) as total_users,
        (SELECT COUNT(*) FROM comments) as total_comments,
        (SELECT COUNT(*) FROM posts WHERE created_at >= CURRENT_DATE) as posts_today,
        (SELECT COUNT(*) FROM comments WHERE created_at >= CURRENT_DATE) as comments_today,
        (SELECT COUNT(DISTINCT user_id) FROM posts WHERE created_at >= CURRENT_DATE) as active_users_today;
END;
$$ LANGUAGE plpgsql;

-- 9. 创建复合索引用于排序优化
CREATE INDEX IF NOT EXISTS idx_posts_composite ON posts (is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_likes ON posts (like_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_comments ON posts (comment_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_views ON posts (view_count DESC);

CREATE INDEX IF NOT EXISTS idx_comments_created ON comments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_likes ON comments (like_count DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_exp ON profiles (experience_points DESC);

-- 10. 创建搜索建议函数
CREATE OR REPLACE FUNCTION get_search_suggestions(
    partial_query TEXT,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    suggestion TEXT,
    type TEXT,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    -- 帖子标题建议
    SELECT DISTINCT 
        substring(title from 1 for 50) as suggestion,
        'post' as type,
        COUNT(*) as count
    FROM posts
    WHERE title ILIKE '%' || partial_query || '%'
    GROUP BY substring(title from 1 for 50)
    
    UNION ALL
    
    -- 用户名建议
    SELECT 
        username as suggestion,
        'user' as type,
        1 as count
    FROM profiles
    WHERE username ILIKE '%' || partial_query || '%'
    
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 11. 为搜索函数添加适当的权限
GRANT EXECUTE ON FUNCTION advanced_search_posts TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_users TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_comments TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_popular_tags TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_search_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_search_suggestions TO authenticated, anon;

-- 12. 验证函数是否创建成功
SELECT 
    proname as function_name,
    pronargs as argument_count
FROM pg_proc 
WHERE proname IN ('advanced_search_posts', 'search_users', 'search_comments', 'get_popular_tags', 'get_search_stats', 'get_search_suggestions')
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;