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

async function createBookmarkFoldersTable() {
  try {
    console.log('开始创建bookmark_folders表...');
    
    // 读取SQL文件
    const sqlPath = join(__dirname, '../../create-bookmark-folders.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    console.log('执行SQL:', sql);
    
    // 使用service role key来执行SQL（如果有的话）
    // 这里我们使用一个简单的方法：尝试插入一条记录来触发表创建
    // 但由于RLS策略，我们需要先登录
    
    // 首先尝试使用管理员权限执行SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.log('无法使用exec_sql，尝试其他方法:', error.message);
      
      // 如果exec_sql不可用，我们需要手动在Supabase控制台中执行SQL
      console.log('请在Supabase控制台的SQL编辑器中执行以下SQL:');
      console.log('----------------------------------------');
      console.log(sql);
      console.log('----------------------------------------');
      console.log('执行完成后，bookmark_folders表将被创建');
    } else {
      console.log('bookmark_folders表创建成功');
    }
    
  } catch (error) {
    console.error('创建bookmark_folders表时出错:', error);
  }
}

createBookmarkFoldersTable();