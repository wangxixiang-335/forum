-- 修复书签表的外键关系问题
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 首先检查现有表结构
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bookmarks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. 删除可能存在的外键约束（如果有的话）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookmarks_target_id_fkey' 
        AND table_name = 'bookmarks'
    ) THEN
        ALTER TABLE bookmarks DROP CONSTRAINT bookmarks_target_id_fkey;
    END IF;
END $$;

-- 3. 由于 target_id 需要引用多个表，我们不能使用标准外键约束
-- 但我们可以创建一个函数来确保引用完整性

-- 创建验证函数确保 target_id 引用有效的帖子或评论
CREATE OR REPLACE FUNCTION validate_bookmark_target()
RETURNS TRIGGER AS $$
BEGIN
    -- 检查 target_type 和 target_id 的组合是否有效
    IF NEW.target_type = 'post' THEN
        IF NOT EXISTS (SELECT 1 FROM posts WHERE id = NEW.target_id) THEN
            RAISE EXCEPTION 'Post with ID % does not exist', NEW.target_id;
        END IF;
    ELSIF NEW.target_type = 'comment' THEN
        IF NOT EXISTS (SELECT 1 FROM comments WHERE id = NEW.target_id) THEN
            RAISE EXCEPTION 'Comment with ID % does not exist', NEW.target_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器来执行验证
DROP TRIGGER IF EXISTS validate_bookmark_target_trigger ON bookmarks;
CREATE TRIGGER validate_bookmark_target_trigger
    BEFORE INSERT OR UPDATE ON bookmarks
    FOR EACH ROW EXECUTE FUNCTION validate_bookmark_target();

-- 4. 为了支持 PostgREST 的关系查询，我们需要创建视图
CREATE OR REPLACE VIEW bookmarks_with_relations AS
SELECT 
    b.*,
    -- 帖子信息
    CASE 
        WHEN b.target_type = 'post' THEN json_build_object(
            'id', p.id,
            'title', p.title,
            'content', p.content,
            'created_at', p.created_at,
            'like_count', p.like_count,
            'comment_count', p.comment_count
        )
        ELSE NULL
    END as post_data,
    -- 评论信息
    CASE 
        WHEN b.target_type = 'comment' THEN json_build_object(
            'id', c.id,
            'content', c.content,
            'created_at', c.created_at,
            'like_count', c.like_count
        )
        ELSE NULL
    END as comment_data
FROM bookmarks b
LEFT JOIN posts p ON b.target_type = 'post' AND b.target_id = p.id
LEFT JOIN comments c ON b.target_type = 'comment' AND b.target_id = c.id;

-- 5. 为视图创建 RLS 策略
ALTER VIEW bookmarks_with_relations SET (security_barrier = true);

-- 6. 重新创建 bookmarks 表的 RLS 策略以确保它们正确
DROP POLICY IF EXISTS "用户只能查看自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以创建收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以更新自己的收藏" ON bookmarks;
DROP POLICY IF EXISTS "用户可以删除自己的收藏" ON bookmarks;

CREATE POLICY "用户只能查看自己的收藏" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "用户可以创建收藏" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可以更新自己的收藏" ON bookmarks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "用户可以删除自己的收藏" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- 7. 验证修复结果
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

-- 8. 测试视图查询
SELECT COUNT(*) as total_bookmarks 
FROM bookmarks_with_relations 
WHERE user_id = auth.uid();