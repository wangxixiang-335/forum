import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookmarkFoldersStructure() {
  try {
    console.log('检查bookmark_folders表结构...');
    
    // 尝试获取表结构信息
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'bookmark_folders' });
    
    if (columnsError) {
      console.log('无法获取表结构，尝试其他方法:', columnsError.message);
      
      // 尝试插入一条测试记录来检查表结构
      const testId = '00000000-0000-0000-0000-000000000000';
      const { data: testData, error: testError } = await supabase
        .from('bookmark_folders')
        .insert({
          user_id: testId,
          name: '测试收藏夹'
        })
        .select()
        .single();
      
      if (testError) {
        console.log('插入测试记录失败:', testError);
        
        // 检查是否是因为表不存在
        if (testError.code === 'PGRST116' || testError.message.includes('relation') && testError.message.includes('does not exist')) {
          console.log('bookmark_folders表不存在，需要创建');
          
          // 尝试创建表
          const { error: createError } = await supabase.rpc('exec_sql', {
            sql: `
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
            `
          });
          
          if (createError) {
            console.log('创建表失败:', createError);
          } else {
            console.log('bookmark_folders表创建成功');
          }
        }
      } else {
        console.log('插入测试记录成功，表结构正常');
        // 删除测试记录
        await supabase
          .from('bookmark_folders')
          .delete()
          .eq('id', testData.id);
      }
    } else {
      console.log('bookmark_folders表结构:', columns);
    }
    
  } catch (error) {
    console.error('检查bookmark_folders表结构时出错:', error);
  }
}

checkBookmarkFoldersStructure();