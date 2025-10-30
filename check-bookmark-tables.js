import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    console.log('检查数据库表结构...');
    
    // 检查 bookmark_folders 表是否存在
    const { data: foldersTable, error: foldersError } = await supabase
      .from('bookmark_folders')
      .select('id')
      .limit(1);
    
    if (foldersError) {
      console.log('bookmark_folders 表不存在或无法访问:', foldersError);
    } else {
      console.log('bookmark_folders 表存在');
    }
    
    // 检查 bookmarks 表是否存在
    const { data: bookmarksTable, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('id')
      .limit(1);
    
    if (bookmarksError) {
      console.log('bookmarks 表不存在或无法访问:', bookmarksError);
    } else {
      console.log('bookmarks 表存在');
    }
    
    // 检查用户收藏夹数据
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('当前用户ID:', user.id);
      
      // 尝试获取用户的收藏夹
      const { data: userFolders, error: userFoldersError } = await supabase
        .from('bookmark_folders')
        .select('*')
        .eq('user_id', user.id);
      
      if (userFoldersError) {
        console.log('获取用户收藏夹失败:', userFoldersError);
      } else {
        console.log('用户收藏夹:', userFolders);
      }
      
      // 尝试获取用户的收藏记录
      const { data: userBookmarks, error: userBookmarksError } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .limit(5);
      
      if (userBookmarksError) {
        console.log('获取用户收藏记录失败:', userBookmarksError);
      } else {
        console.log('用户收藏记录:', userBookmarks);
      }
    }
    
  } catch (error) {
    console.error('检查表时出错:', error);
  }
}

checkTables();