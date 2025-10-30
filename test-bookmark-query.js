import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBookmarkQuery() {
  try {
    console.log('测试bookmarks表查询...');
    
    // 不需要登录，直接查询所有数据来测试
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('*')
      .limit(10);
    
    if (bookmarksError) {
      console.log('查询bookmarks表失败:', bookmarksError);
      return;
    }
    
    console.log('bookmarks表数据:', bookmarks);
    
    if (!bookmarks || bookmarks.length === 0) {
      console.log('bookmarks表中没有数据');
      return;
    }
    
    // 检查posts表
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title')
      .limit(10);
    
    if (postsError) {
      console.log('查询posts表失败:', postsError);
      return;
    }
    
    console.log('posts表数据:', posts);
    
    // 检查关联关系
    for (const bookmark of bookmarks.slice(0, 3)) {
      console.log(`\n检查收藏记录 ${bookmark.id}:`);
      console.log('- 目标类型:', bookmark.target_type);
      console.log('- 目标ID:', bookmark.target_id);
      console.log('- 收藏夹:', bookmark.folder_name);
      
      if (bookmark.target_type === 'post') {
        const postExists = posts.some(p => p.id === bookmark.target_id);
        console.log('- 帖子是否存在:', postExists);
        
        if (postExists) {
          const post = posts.find(p => p.id === bookmark.target_id);
          console.log('- 帖子标题:', post.title);
        }
      }
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

testBookmarkQuery();