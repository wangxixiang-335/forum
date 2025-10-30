import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixRLS() {
  try {
    console.log('检查bookmark_folders表的RLS策略...');
    
    // 先尝试登录一个测试用户
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123456'
    });
    
    if (signInError) {
      console.log('无法登录测试用户:', signInError.message);
      console.log('尝试使用其他方法检查表结构...');
      
      // 尝试检查当前用户
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('没有登录用户，无法检查RLS策略');
        console.log('请先登录应用，然后再次尝试创建收藏夹');
        return;
      }
      
      console.log('当前用户ID:', user.id);
      
      // 尝试获取用户的收藏夹
      const { data: folders, error: foldersError } = await supabase
        .from('bookmark_folders')
        .select('*')
        .eq('user_id', user.id);
      
      if (foldersError) {
        console.log('获取收藏夹失败:', foldersError);
        
        if (foldersError.code === 'PGRST116') {
          console.log('bookmark_folders表不存在，需要创建');
          console.log('请在Supabase控制台执行以下SQL:');
          console.log('----------------------------------------');
          console.log(`
CREATE TABLE IF NOT EXISTS bookmark_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_bookmark_folders_user_id ON bookmark_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_name ON bookmark_folders(name);

ALTER TABLE bookmark_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的收藏夹" ON bookmark_folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建收藏夹" ON bookmark_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的收藏夹" ON bookmark_folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的收藏夹" ON bookmark_folders
    FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_bookmark_folders_updated_at BEFORE UPDATE ON bookmark_folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          `);
          console.log('----------------------------------------');
        } else {
          console.log('RLS策略可能有问题，请检查策略设置');
        }
      } else {
        console.log('bookmark_folders表存在，获取到收藏夹:', folders);
      }
    } else {
      console.log('测试用户登录成功');
      
      // 尝试创建测试收藏夹
      const { data: testData, error: testError } = await supabase
        .from('bookmark_folders')
        .insert({
          name: '测试收藏夹_' + Date.now()
        })
        .select()
        .single();
      
      if (testError) {
        console.log('创建测试收藏夹失败:', testError);
      } else {
        console.log('创建测试收藏夹成功:', testData);
        
        // 删除测试收藏夹
        await supabase
          .from('bookmark_folders')
          .delete()
          .eq('id', testData.id);
        
        console.log('测试收藏夹已删除');
      }
      
      // 登出测试用户
      await supabase.auth.signOut();
    }
    
  } catch (error) {
    console.error('检查RLS策略时出错:', error);
  }
}

checkAndFixRLS();