import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBookmarkLoading() {
  try {
    console.log('开始调试收藏夹加载问题...');
    
    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('无法获取用户信息:', userError);
      return;
    }
    
    console.log('当前用户ID:', user.id);
    
    // 获取收藏记录
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (bookmarksError) {
      console.log('获取收藏记录失败:', bookmarksError);
      return;
    }
    
    console.log('收藏记录:', bookmarks);
    
    if (!bookmarks || bookmarks.length === 0) {
      console.log('没有收藏记录');
      return;
    }
    
    // 检查每个收藏记录的帖子数据
    for (const bookmark of bookmarks) {
      console.log(`\n检查收藏记录 ${bookmark.id}:`);
      console.log('- 目标类型:', bookmark.target_type);
      console.log('- 目标ID:', bookmark.target_id);
      console.log('- 收藏夹:', bookmark.folder_name);
      
      if (bookmark.target_type === 'post') {
        // 获取帖子数据
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('id, title, content, created_at, like_count, comment_count')
          .eq('id', bookmark.target_id)
          .single();
        
        if (postError) {
          console.log('- 获取帖子失败:', postError);
          console.log('- 错误代码:', postError.code);
          console.log('- 错误详情:', postError.details);
          console.log('- 错误提示:', postError.hint);
        } else {
          console.log('- 帖子标题:', postData.title);
          console.log('- 帖子内容长度:', postData.content?.length || 0);
          console.log('- 点赞数:', postData.like_count);
          console.log('- 评论数:', postData.comment_count);
        }
      }
    }
    
  } catch (error) {
    console.error('调试过程中出错:', error);
  }
}

debugBookmarkLoading();