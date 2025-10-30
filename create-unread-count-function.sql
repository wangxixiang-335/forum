-- 创建获取未读消息数量的RPC函数
-- 在 Supabase SQL 编辑器中执行此脚本

-- 创建获取未读消息数量的函数
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
    target_user_id UUID;
BEGIN
    -- 如果没有提供用户ID，使用当前认证用户
    target_user_id := COALESCE(p_user_id, auth.uid());
    
    -- 查询未读消息数量
    SELECT COUNT(*) INTO unread_count
    FROM messages 
    WHERE receiver_id = target_user_id 
    AND is_read = FALSE 
    AND is_deleted_by_receiver = FALSE;
    
    RETURN COALESCE(unread_count, 0);
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
WHERE proname = 'get_unread_message_count';

-- 测试函数（需要认证用户）
-- SELECT get_unread_message_count();