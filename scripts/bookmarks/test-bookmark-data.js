import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBookmarkData() {
  try {
    console.log('开始检查收藏数据...');
    
    // 1. 检查bookmarks表
    console.log('\n=== 检查bookmarks表 ===');
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('*');
    
    if (bookmarksError) {
      console.error('查询bookmarks表失败:', bookmarksError);
    } else {
      console.log(`bookmarks表中有 ${bookmarks.length} 条记录`);
      console.log('bookmarks数据:', bookmarks);
    }
    
    // 2. 检查bookmark_folders表是否存在
    console.log('\n=== 检查bookmark_folders表 ===');
    try {
      const { data: folders, error: foldersError } = await supabase
        .from('bookmark_folders')
        .select('*');
      
      if (foldersError) {
        console.error('bookmark_folders表不存在或查询失败:', foldersError);
      } else {
        console.log(`bookmark_folders表中有 ${folders.length} 条记录`);
        console.log('folders数据:', folders);
      }
    } catch (folderTableError) {
      console.error('bookmark_folders表不存在:', folderTableError);
    }
    
    // 3. 检查posts表
    console.log('\n=== 检查posts表 ===');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, content')
      .limit(5);
    
    if (postsError) {
      console.error('查询posts表失败:', postsError);
    } else {
      console.log(`posts表中有示例数据:`, posts);
    }
    
    // 4. 检查用户收藏的详细信息
    console.log('\n=== 检查用户收藏的详细信息 ===');
    if (bookmarks && bookmarks.length > 0) {
      for (const bookmark of bookmarks) {
        console.log(`\n收藏记录: ${bookmark.id}`);
        console.log(`- 用户ID: ${bookmark.user_id}`);
        console.log(`- 目标类型: ${bookmark.target_type}`);
        console.log(`- 目标ID: ${bookmark.target_id}`);
        console.log(`- 收藏夹: ${bookmark.folder_name}`);
        
        // 检查关联的帖子或评论是否存在
        if (bookmark.target_type === 'post') {
          const { data: postData, error: postError } = await supabase
            .from('posts')
            .select('id, title, content')
            .eq('id', bookmark.target_id)
            .single();
          
          if (postError) {
            console.log(`- 关联的帖子不存在: ${postError.message}`);
          } else {
            console.log(`- 关联的帖子标题: ${postData.title}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

testBookmarkData();