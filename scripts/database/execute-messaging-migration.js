// 数据库迁移执行脚本
// 用于执行002_add_messaging_features.sql迁移

import { supabase } from '../src/services/supabase.js'

async function executeMigration() {
  console.log('🚀 开始执行数据库迁移...')
  
  try {
    // 检查是否已经存在messages表
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'messages')
    
    if (tableError) {
      console.error('检查表失败:', tableError)
      return
    }
    
    if (tables && tables.length > 0) {
      console.log('✅ 数据库表已存在，跳过迁移')
      return
    }
    
    // 读取迁移文件内容
    const migrationSQL = `
-- 创建私信表 (messages)
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

-- 创建会话表 (conversations)
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

-- 创建收藏夹表 (bookmarks)
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user1_id, user2_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_target ON bookmarks(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(user_id, folder_name);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);

-- 启用RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "用户只能查看自己发送或接收的消息" ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "用户只能发送消息" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "发送者可以更新未读状态和删除自己的消息" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "用户只能查看自己参与的会话" ON conversations
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "用户可以创建会话" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "用户可以更新自己参与的会话" ON conversations
    FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

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
    `
    
    // 执行迁移
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ 迁移执行失败:', error)
      console.log('请手动在Supabase控制台中执行以下SQL:')
      console.log(migrationSQL)
    } else {
      console.log('✅ 数据库迁移执行成功!')
    }
    
  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error)
  }
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  executeMigration()
}

export { executeMigration }