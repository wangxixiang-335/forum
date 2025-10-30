import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAllBookmarkTables() {
  try {
    console.log('修复所有bookmark相关表...');
    
    // 读取SQL文件
    const sqlPath = join(__dirname, '../../fix-all-bookmark-tables.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    console.log('请在Supabase控制台的SQL编辑器中执行以下SQL:');
    console.log('================================================');
    console.log(sql);
    console.log('================================================');
    console.log('');
    console.log('执行完成后，bookmark_folders和bookmarks表的功能将被修复');
    console.log('用户将能够：');
    console.log('1. 创建和管理收藏夹');
    console.log('2. 收藏帖子和评论');
    console.log('3. 查看自己的收藏内容');
    
  } catch (error) {
    console.error('修复bookmark表时出错:', error);
  }
}

fixAllBookmarkTables();