import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookmarkFoldersTable() {
  try {
    console.log('检查bookmark_folders表状态...');
    
    // 1. 检查表是否存在
    console.log('\n=== 检查bookmark_folders表结构 ===');
    const { data: tableInfo, error: tableError } = await supabase
      .from('bookmark_folders')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('bookmark_folders表不存在或无法访问:', tableError);
      return;
    }
    
    console.log('bookmark_folders表存在且可访问');
    
    // 2. 检查表中的数据
    console.log('\n=== 检查bookmark_folders表数据 ===');
    const { data: folders, error: foldersError } = await supabase
      .from('bookmark_folders')
      .select('*');
    
    if (foldersError) {
      console.error('查询bookmark_folders表数据失败:', foldersError);
    } else {
      console.log(`bookmark_folders表中有 ${folders.length} 条记录`);
      folders.forEach(folder => {
        console.log(`- ID: ${folder.id}, 用户ID: ${folder.user_id}, 名称: ${folder.name}, 创建时间: ${folder.created_at}`);
      });
    }
    
    // 3. 检查bookmarks表中的folder_name分布
    console.log('\n=== 检查bookmarks表中的folder_name分布 ===');
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('user_id, folder_name');
    
    if (bookmarksError) {
      console.error('查询bookmarks表失败:', bookmarksError);
    } else {
      console.log(`bookmarks表中有 ${bookmarks.length} 条记录`);
      
      // 统计每个用户的收藏夹分布
      const userFolders = {};
      bookmarks.forEach(bookmark => {
        const userId = bookmark.user_id;
        if (!userFolders[userId]) {
          userFolders[userId] = {};
        }
        if (!userFolders[userId][bookmark.folder_name]) {
          userFolders[userId][bookmark.folder_name] = 0;
        }
        userFolders[userId][bookmark.folder_name]++;
      });
      
      console.log('用户收藏夹分布:');
      Object.keys(userFolders).forEach(userId => {
        console.log(`用户 ${userId}:`);
        Object.keys(userFolders[userId]).forEach(folderName => {
          console.log(`  - ${folderName}: ${userFolders[userId][folderName]} 个收藏`);
        });
      });
    }
    
    // 4. 检查是否有数据不一致
    console.log('\n=== 检查数据一致性 ===');
    if (folders && bookmarks) {
      const folderNamesInFolders = new Set(folders.map(f => f.name));
      const folderNamesInBookmarks = new Set(bookmarks.map(b => b.folder_name));
      
      const missingInFolders = [...folderNamesInBookmarks].filter(name => !folderNamesInFolders.has(name));
      const extraInFolders = [...folderNamesInFolders].filter(name => !folderNamesInBookmarks.has(name));
      
      if (missingInFolders.length > 0) {
        console.log('在bookmarks表中存在但在bookmark_folders表中不存在的收藏夹:', missingInFolders);
      }
      
      if (extraInFolders.length > 0) {
        console.log('在bookmark_folders表中存在但在bookmarks表中不使用的收藏夹:', extraInFolders);
      }
      
      if (missingInFolders.length === 0 && extraInFolders.length === 0) {
        console.log('数据一致性检查通过');
      }
    }
    
  } catch (error) {
    console.error('检查过程中出错:', error);
  }
}

checkBookmarkFoldersTable();