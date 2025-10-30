-- 创建搜索建议功能
-- 在 Supabase SQL 编辑器中执行此脚本

-- 创建搜索建议函数
CREATE OR REPLACE FUNCTION get_search_suggestions(
    limit_count INTEGER DEFAULT 10,
    partial_query TEXT DEFAULT ''
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    content_preview TEXT,
    type TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- 如果查询为空，返回最近的帖子
    IF partial_query IS NULL OR trim(partial_query) = '' THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.title,
            LEFT(p.content, 100) as content_preview,
            'post' as type,
            p.created_at
        FROM posts p
        ORDER BY p.created_at DESC
        LIMIT limit_count;
    ELSE
        -- 搜索匹配的帖子
        RETURN QUERY
        SELECT 
            p.id,
            p.title,
            LEFT(p.content, 100) as content_preview,
            'post' as type,
            p.created_at
        FROM posts p
        WHERE 
            p.title ILIKE '%' || partial_query || '%'
            OR p.content ILIKE '%' || partial_query || '%'
        ORDER BY 
            CASE 
                WHEN p.title ILIKE '%' || partial_query || '%' THEN 1
                ELSE 2
            END,
            p.created_at DESC
        LIMIT limit_count;
        
        -- 如果帖子结果不足，添加评论结果
        IF (SELECT COUNT(*) FROM (
            SELECT 
                p.id,
                p.title,
                LEFT(p.content, 100) as content_preview,
                'post' as type,
                p.created_at
            FROM posts p
            WHERE 
                p.title ILIKE '%' || partial_query || '%'
                OR p.content ILIKE '%' || partial_query || '%'
            ORDER BY 
                CASE 
                    WHEN p.title ILIKE '%' || partial_query || '%' THEN 1
                    ELSE 2
                END,
                p.created_at DESC
            LIMIT limit_count
        ) post_results) < limit_count THEN
            
            RETURN QUERY
            SELECT 
                c.id,
                LEFT(c.content, 50) as title,
                LEFT(c.content, 100) as content_preview,
                'comment' as type,
                c.created_at
            FROM comments c
            WHERE 
                c.content ILIKE '%' || partial_query || '%'
                AND NOT EXISTS (
                    SELECT 1 FROM posts p 
                    WHERE p.id = c.post_id
                    AND (p.title ILIKE '%' || partial_query || '%'
                         OR p.content ILIKE '%' || partial_query || '%')
                )
            ORDER BY c.created_at DESC
            LIMIT (limit_count - (
                SELECT COUNT(*) FROM (
                    SELECT 
                        p.id,
                        p.title,
                        LEFT(p.content, 100) as content_preview,
                        'post' as type,
                        p.created_at
                    FROM posts p
                    WHERE 
                        p.title ILIKE '%' || partial_query || '%'
                        OR p.content ILIKE '%' || partial_query || '%'
                    ORDER BY 
                        CASE 
                            WHEN p.title ILIKE '%' || partial_query || '%' THEN 1
                            ELSE 2
                        END,
                        p.created_at DESC
                    LIMIT limit_count
                ) post_results
            ));
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建全文搜索函数（更高级的搜索）
CREATE OR REPLACE FUNCTION search_posts_and_comments(
    search_query TEXT,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    content TEXT,
    type TEXT,
    post_id UUID,
    created_at TIMESTAMPTZ,
    author_username TEXT,
    relevance_score REAL
) AS $$
BEGIN
    RETURN QUERY
    WITH search_results AS (
        -- 搜索帖子
        SELECT 
            p.id,
            p.title,
            p.content,
            'post' as type,
            p.id as post_id,
            p.created_at,
            pr.username as author_username,
            CASE 
                WHEN p.title ILIKE '%' || search_query || '%' THEN 1.0
                WHEN p.content ILIKE '%' || search_query || '%' THEN 0.8
                ELSE 0.5
            END as relevance_score
        FROM posts p
        JOIN profiles pr ON p.user_id = pr.id
        WHERE 
            p.title ILIKE '%' || search_query || '%'
            OR p.content ILIKE '%' || search_query || '%'
        
        UNION ALL
        
        -- 搜索评论
        SELECT 
            c.id,
            LEFT(c.content, 50) as title,
            c.content,
            'comment' as type,
            c.post_id,
            c.created_at,
            pr.username as author_username,
            CASE 
                WHEN c.content ILIKE '%' || search_query || '%' THEN 0.9
                ELSE 0.6
            END as relevance_score
        FROM comments c
        JOIN profiles pr ON c.user_id = pr.id
        WHERE c.content ILIKE '%' || search_query || '%'
    )
    SELECT 
        id,
        title,
        content,
        type,
        post_id,
        created_at,
        author_username,
        relevance_score
    FROM search_results
    ORDER BY relevance_score DESC, created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建热门标签函数
CREATE OR REPLACE FUNCTION get_popular_tags(
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
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
        WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
    ) tag_counts
    GROUP BY tag
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 验证函数是否创建成功
SELECT 
    proname,
    prokind,
    prosecdef,
    pronargs,
    proargtypes
FROM pg_proc 
WHERE proname IN ('get_search_suggestions', 'search_posts_and_comments', 'get_popular_tags')
ORDER BY proname;