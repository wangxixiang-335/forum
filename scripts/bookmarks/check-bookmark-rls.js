import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookmarkRLS() {
  try {
    console.log('检查bookmarks表的RLS策略...');
    
    // 尝试使用service role key（如果有）
    // 或者检查RLS策略配置
    
    // 先尝试创建一个测试用户
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'testbookmark@example.com',
      password: 'test123456'
    });
    
    if (signUpError && !signUpError.message.includes('already registered')) {
      console.log('创建测试用户失败:', signUpError);
    } else {
      console.log('测试用户创建成功或已存在');
    }
    
    // 尝试登录测试用户
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'testbookmark@example.com',
      password: 'test123456'
    });
    
    if (signInError) {
      console.log('登录测试用户失败:', signInError);
      return;
    }
    
    console.log('测试用户登录成功，用户ID:', signInData.user.id);
    
    // 先创建profile记录
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: signInData.user.id,
        username: 'testuser_' + Date.now()
      });
    
    if (profileError) {
      console.log('创建profile失败:', profileError);
      return;
    }
    
    console.log('profile创建成功');
    
    // 创建测试帖子
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: signInData.user.id,
        title: '测试帖子',
        content: '这是一个测试帖子，用于验证收藏功能'
      })
      .select('id')
      .single();
    
    if (postError) {
      console.log('创建测试帖子失败:', postError);
    } else {
      console.log('测试帖子创建成功，ID:', postData.id);
      
      // 创建测试收藏
      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from('bookmarks')
        .insert({
          target_type: 'post',
          target_id: postData.id,
          folder_name: '测试收藏夹'
        })
        .select('*')
        .single();
      
      if (bookmarkError) {
        console.log('创建测试收藏失败:', bookmarkError);
        console.log('错误代码:', bookmarkError.code);
        console.log('错误详情:', bookmarkError.details);
      } else {
        console.log('测试收藏创建成功:', bookmarkData);
        
        // 尝试查询收藏
        const { data: fetchBookmarks, error: fetchError } = await supabase
          .from('bookmarks')
          .select('*')
          .eq('user_id', signInData.user.id);
        
        if (fetchError) {
          console.log('查询收藏失败:', fetchError);
        } else {
          console.log('查询收藏成功:', fetchBookmarks);
        }
      }
    }
    
    // 清理测试数据
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('检查RLS策略时出错:', error);
  }
}

checkBookmarkRLS();