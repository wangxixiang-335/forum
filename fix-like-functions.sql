-- 创建点赞计数相关的函数和触发器
-- 如果这些函数已存在，这个脚本会更新它们

-- 1. 创建增加点赞数的函数
CREATE OR REPLACE FUNCTION increment_like_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE posts 
    SET like_count = like_count + 1 
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- 2. 创建减少点赞数的函数
CREATE OR REPLACE FUNCTION decrement_like_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE posts 
    SET like_count = CASE 
        WHEN like_count > 0 THEN like_count - 1
        ELSE 0
    END
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建增加浏览量的函数
CREATE OR REPLACE FUNCTION increment_view_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE posts 
    SET view_count = view_count + 1 
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- 4. 删除现有的触发器（如果存在）
DROP TRIGGER IF EXISTS update_post_like_count_trigger ON interactions;
DROP TRIGGER IF EXISTS update_comment_like_count_trigger ON interactions;

-- 5. 创建处理帖子点赞计数的触发器函数
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 新增点赞记录
        UPDATE posts 
        SET like_count = like_count + 1 
        WHERE id = NEW.target_id AND NEW.target_type = 'post' AND NEW.interaction_type = 'like';
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- 删除点赞记录
        UPDATE posts 
        SET like_count = CASE 
            WHEN like_count > 0 THEN like_count - 1
            ELSE 0
        END
        WHERE id = OLD.target_id AND OLD.target_type = 'post' AND OLD.interaction_type = 'like';
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建处理评论点赞计数的触发器函数
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 新增点赞记录
        UPDATE comments 
        SET like_count = like_count + 1 
        WHERE id = NEW.target_id AND NEW.target_type = 'comment' AND NEW.interaction_type = 'like';
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- 删除点赞记录
        UPDATE comments 
        SET like_count = CASE 
            WHEN like_count > 0 THEN like_count - 1
            ELSE 0
        END
        WHERE id = OLD.target_id AND OLD.target_type = 'comment' AND OLD.interaction_type = 'like';
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建触发器
CREATE TRIGGER update_post_like_count_trigger 
    AFTER INSERT OR DELETE ON interactions
    FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

CREATE TRIGGER update_comment_like_count_trigger 
    AFTER INSERT OR DELETE ON interactions
    FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- 8. 测试函数
-- 注意：这些测试语句在实际执行时应该注释掉或删除
-- SELECT increment_like_count('your-post-id-here');
-- SELECT decrement_like_count('your-post-id-here');
-- SELECT increment_view_count('your-post-id-here');