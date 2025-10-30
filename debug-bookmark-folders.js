import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBookmarkFolders() {
  try {
    console.log('=== 调试收藏夹数据结构 ===');
    
    // 1. 获取所有收藏记录
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('*');
    
    if (bookmarksError) {
      console.error('获取收藏记录失败:', bookmarksError);
      return;
    }
    
    console.log(`找到 ${bookmarks.length} 条收藏记录:`);
    bookmarks.forEach((bookmark, index) => {
      console.log(`\n收藏记录 ${index + 1}:`);
      console.log(`- ID: ${bookmark.id}`);
      console.log(`- 用户ID: ${bookmark.user_id}`);
      console.log(`- 目标类型: ${bookmark.target_type}`);
      console.log(`- 目标ID: ${bookmark.target_id}`);
      console.log(`- 收藏夹名称: "${bookmark.folder_name}"`);
      console.log(`- 创建时间: ${bookmark.created_at}`);
    });
    
    // 2. 按收藏夹分组统计
    const folderGroups = {};
    bookmarks.forEach(bookmark => {
      if (!folderGroups[bookmark.folder_name]) {
        folderGroups[bookmark.folder_name] = [];
      }
      folderGroups[bookmark.folder_name].push(bookmark);
    });
    
    console.log('\n=== 按收藏夹分组统计 ===');
    Object.keys(folderGroups).forEach(folderName => {
      console.log(`收藏夹 "${folderName}": ${folderGroups[folderName].length} 个收藏`);
      folderGroups[folderName].forEach(bookmark => {
        console.log(`  - ${bookmark.target_type}: ${bookmark.target_id}`);
      });
    });
    
    // 3. 检查是否有收藏记录的folder_name为空或undefined
    const invalidBookmarks = bookmarks.filter(b => !b.folder_name || b.folder_name.trim() === '');
    if (invalidBookmarks.length > 0) {
      console.log(`\n⚠️ 发现 ${invalidBookmarks.length} 条无效的收藏记录（folder_name为空）:`);
      invalidBookmarks.forEach(bookmark => {
        console.log(`- ID: ${bookmark.id}, folder_name: "${bookmark.folder_name}"`);
      });
    }
    
  } catch (error) {
    console.error('调试过程中出错:', error);
  }
}

debugBookmarkFolders();