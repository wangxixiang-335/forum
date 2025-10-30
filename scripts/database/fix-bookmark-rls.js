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

async function fixBookmarkRLS() {
  try {
    console.log('修复bookmarks表的RLS策略...');
    
    // 读取SQL文件
    const sqlPath = join(__dirname, '../../fix-bookmark-rls.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    console.log('请在Supabase控制台的SQL编辑器中执行以下SQL:');
    console.log('========================================');
    console.log(sql);
    console.log('========================================');
    console.log('执行完成后，bookmarks表的RLS策略将被修复');
    
  } catch (error) {
    console.error('修复RLS策略时出错:', error);
  }
}

fixBookmarkRLS();