import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestBookmark() {
  try {
    console.log('开始添加测试收藏...');
    
    // 1. 先获取一个帖子ID
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title')
      .limit(1);
    
    if (postsError) {
      console.error('获取帖子失败:', postsError);
      return;
    }
    
    if (!posts || posts.length === 0) {
      console.error('没有可用的帖子');
      return;
    }
    
    const post = posts[0];
    console.log(`使用帖子: ${post.title} (ID: ${post.id})`);
    
    // 2. 添加一个测试收藏记录
    // 注意：这里使用一个固定的用户ID，实际应用中应该是登录用户的ID
    const testUserId = '00000000-0000-0000-0000-000000000000'; // 这是一个示例用户ID
    
    const { data: bookmark, error: bookmarkError } = await supabase
      .from('bookmarks')
      .insert({
        user_id: testUserId,
        target_type: 'post',
        target_id: post.id,
        folder_name: '默认收藏夹',
        note: '这是一个测试收藏'
      })
      .select()
      .single();
    
    if (bookmarkError) {
      console.error('添加收藏失败:', bookmarkError);
      
      // 如果是唯一约束错误，说明已经存在
      if (bookmarkError.code === '23505') {
        console.log('收藏记录已存在');
      }
    } else {
      console.log('成功添加收藏记录:', bookmark);
    }
    
    // 3. 再次检查收藏数据
    console.log('\n=== 检查更新后的收藏数据 ===');
    const { data: allBookmarks, error: allBookmarksError } = await supabase
      .from('bookmarks')
      .select('*');
    
    if (allBookmarksError) {
      console.error('查询收藏失败:', allBookmarksError);
    } else {
      console.log(`现在bookmarks表中有 ${allBookmarks.length} 条记录`);
      allBookmarks.forEach(b => {
        console.log(`- 收藏夹: ${b.folder_name}, 目标类型: ${b.target_type}, 目标ID: ${b.target_id}`);
      });
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

addTestBookmark();