import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserBookmarks() {
  try {
    console.log('测试用户收藏数据隔离...');
    
    // 创建两个测试用户
    const users = [];
    
    for (let i = 1; i <= 2; i++) {
      const email = `testuser${i}@example.com`;
      const password = 'test123456';
      
      // 注册用户
      await supabase.auth.signUp({
        email,
        password
      });
      
      // 登录用户
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        console.log(`用户${i}登录失败:`, signInError);
        continue;
      }
      
      console.log(`用户${i}登录成功，ID:`, signInData.user.id);
      users.push(signInData.user);
      
      // 创建profile
      await supabase
        .from('profiles')
        .insert({
          id: signInData.user.id,
          username: `testuser${i}`
        });
      
      // 创建测试帖子
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: signInData.user.id,
          title: `用户${i}的测试帖子`,
          content: `这是用户${i}创建的测试帖子内容`
        })
        .select('id')
        .single();
      
      if (postError) {
        console.log(`用户${i}创建帖子失败:`, postError);
        continue;
      }
      
      console.log(`用户${i}创建帖子成功，ID:`, postData.id);
      
      // 创建收藏
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
        console.log(`用户${i}创建收藏失败:`, bookmarkError);
      } else {
        console.log(`用户${i}创建收藏成功:`, bookmarkData);
      }
      
      // 登出
      await supabase.auth.signOut();
    }
    
    // 测试每个用户只能看到自己的收藏
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const email = `testuser${i + 1}@example.com`;
      
      // 重新登录
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email,
        password: 'test123456'
      });
      
      console.log(`\n测试用户${i + 1}的收藏数据:`);
      
      // 获取该用户的收藏
      const { data: bookmarks, error: fetchError } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', signInData.user.id);
      
      if (fetchError) {
        console.log(`获取用户${i + 1}收藏失败:`, fetchError);
      } else {
        console.log(`用户${i + 1}的收藏数量:`, bookmarks?.length || 0);
        bookmarks?.forEach((bookmark, index) => {
          console.log(`  收藏${index + 1}:`, {
            id: bookmark.id,
            user_id: bookmark.user_id,
            target_id: bookmark.target_id,
            folder_name: bookmark.folder_name
          });
        });
      }
      
      // 验证是否只能看到自己的收藏
      const hasOtherUserBookmarks = bookmarks?.some(b => b.user_id !== signInData.user.id);
      if (hasOtherUserBookmarks) {
        console.log(`❌ 用户${i + 1}看到了其他用户的收藏！`);
      } else {
        console.log(`✅ 用户${i + 1}只能看到自己的收藏`);
      }
      
      // 登出
      await supabase.auth.signOut();
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

testUserBookmarks();