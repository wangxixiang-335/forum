import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBookmarkFolders() {
  try {
    console.log('测试bookmark_folders表功能...');
    
    // 先登录测试用户
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'testbookmark@example.com',
      password: 'test123456'
    });
    
    if (signInError) {
      console.log('登录测试用户失败:', signInError);
      return;
    }
    
    console.log('测试用户登录成功，用户ID:', signInData.user.id);
    
    // 1. 检查表是否存在
    try {
      const { data: testData, error: testError } = await supabase
        .from('bookmark_folders')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.log('bookmark_folders表不存在或无法访问:', testError);
        if (testError.code === 'PGRST116') {
          console.log('需要创建bookmark_folders表');
        }
        return;
      }
      console.log('bookmark_folders表存在');
    } catch (e) {
      console.log('检查表时出错:', e);
      return;
    }
    
    // 2. 尝试创建收藏夹
    console.log('尝试创建收藏夹...');
    const { data: insertData, error: insertError } = await supabase
      .from('bookmark_folders')
      .insert({
        name: '测试收藏夹_' + Date.now()
      })
      .select('*')
      .single();
    
    if (insertError) {
      console.log('创建收藏夹失败:', insertError);
      console.log('错误代码:', insertError.code);
      console.log('错误详情:', insertError.details);
      
      if (insertError.code === '42501') {
        console.log('RLS策略问题，需要修复RLS策略');
      }
    } else {
      console.log('创建收藏夹成功:', insertData);
      
      // 3. 查询收藏夹
      const { data: folders, error: fetchError } = await supabase
        .from('bookmark_folders')
        .select('*')
        .eq('user_id', signInData.user.id);
      
      if (fetchError) {
        console.log('查询收藏夹失败:', fetchError);
      } else {
        console.log('查询收藏夹成功:', folders);
      }
    }
    
    // 4. 清理测试数据
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

testBookmarkFolders();