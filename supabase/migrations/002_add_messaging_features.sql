-- 添加互动沟通功能
-- 迁移文件：002_add_messaging_features.sql

-- 1. 创建私信表 (messages)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted_by_sender BOOLEAN DEFAULT FALSE,
    is_deleted_by_receiver BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 防止自己给自己发消息
    CHECK (sender_id != receiver_id)
);

-- 2. 创建会话表 (conversations) - 用于跟踪私信会话
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted_by_user1 BOOLEAN DEFAULT FALSE,
    is_deleted_by_user2 BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 确保每对用户只有一个会话
    UNIQUE(user1_id, user2_id),
    -- 防止自己跟自己创建会话
    CHECK (user1_id != user2_id)
);

-- 3. 为收藏功能添加更好的支持 - 创建收藏夹表
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id UUID NOT NULL,
    folder_name TEXT DEFAULT '默认收藏夹',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 防止重复收藏
    UNIQUE(user_id, target_type, target_id)
);

-- 创建索引以优化查询性能

-- messages表索引
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);

-- conversations表索引
CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user1_id, user2_id);

-- bookmarks表索引
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_target ON bookmarks(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(user_id, folder_name);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);

-- 启用行级安全 (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略

-- messages表策略
CREATE POLICY "用户只能查看自己发送或接收的消息" ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "用户只能发送消息" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "发送者可以更新未读状态和删除自己的消息" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- conversations表策略
CREATE POLICY "用户只能查看自己参与的会话" ON conversations
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "用户可以创建会话" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "用户可以更新自己参与的会话" ON conversations
    FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- bookmarks表策略
CREATE POLICY "用户只能查看自己的收藏" ON bookmarks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建收藏" ON bookmarks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的收藏" ON bookmarks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的收藏" ON bookmarks
    FOR DELETE USING (auth.uid() = user_id);

-- 创建更新触发器
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建自动管理会话的函数
CREATE OR REPLACE FUNCTION manage_conversation()
RETURNS TRIGGER AS $$
BEGIN
    -- 当发送新消息时，更新或创建会话
    INSERT INTO conversations (user1_id, user2_id, last_message_id, last_message_at)
    VALUES (
        LEAST(NEW.sender_id, NEW.receiver_id),
        GREATEST(NEW.sender_id, NEW.receiver_id),
        NEW.id,
        NEW.created_at
    )
    ON CONFLICT (user1_id, user2_id) 
    DO UPDATE SET 
        last_message_id = NEW.id,
        last_message_at = NEW.created_at,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 在消息插入后自动管理会话
CREATE TRIGGER manage_conversation_trigger 
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION manage_conversation();

-- 创建获取未读消息数量的函数
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM messages 
    WHERE receiver_id = p_user_id 
    AND is_read = FALSE 
    AND is_deleted_by_receiver = FALSE;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建标记消息为已读的函数
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_sender_id UUID, p_receiver_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE messages 
    SET is_read = TRUE 
    WHERE sender_id = p_sender_id 
    AND receiver_id = p_receiver_id 
    AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加评论点赞支持（如果还没有的话）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'like_count'
    ) THEN
        ALTER TABLE comments ADD COLUMN like_count INTEGER DEFAULT 0 CHECK (like_count >= 0);
    END IF;
END $$;

-- 创建处理评论点赞计数的触发器函数
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments 
        SET like_count = like_count + 1 
        WHERE id = NEW.target_id AND NEW.target_type = 'comment' AND NEW.interaction_type = 'like';
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments 
        SET like_count = like_count - 1 
        WHERE id = OLD.target_id AND OLD.target_type = 'comment' AND OLD.interaction_type = 'like';
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 为评论点赞创建触发器
DROP TRIGGER IF EXISTS update_comment_like_count_trigger ON interactions;
CREATE TRIGGER update_comment_like_count_trigger 
    AFTER INSERT OR DELETE ON interactions
    FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();