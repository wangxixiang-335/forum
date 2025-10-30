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

async function emergencyBookmarkFix() {
  try {
    console.log('========================================');
    console.log('紧急修复bookmarks表RLS策略');
    console.log('========================================');
    console.log('');
    console.log('⚠️  重要提示：');
    console.log('这个脚本将完全重置bookmarks表的RLS策略');
    console.log('请立即在Supabase控制台执行以下SQL');
    console.log('');
    
    // 读取SQL文件
    const sqlPath = join(__dirname, '../../emergency-bookmark-fix.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    console.log('----------------------------------------');
    console.log('紧急修复SQL：');
    console.log('----------------------------------------');
    console.log(sql);
    console.log('----------------------------------------');
    console.log('');
    console.log('执行后，用户将能够：');
    console.log('✓ 创建新的收藏记录');
    console.log('✓ 查看自己的收藏');
    console.log('✓ 每个用户只能看到自己的收藏');
    console.log('');
    console.log('请立即执行此SQL以修复收藏功能！');
    
  } catch (error) {
    console.error('执行紧急修复时出错:', error);
  }
}

emergencyBookmarkFix();