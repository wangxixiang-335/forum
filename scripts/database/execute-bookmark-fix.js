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

async function executeBookmarkFix() {
  try {
    console.log('========================================');
    console.log('论坛收藏功能完整修复脚本');
    console.log('========================================');
    console.log('');
    console.log('请按以下步骤执行修复：');
    console.log('');
    console.log('1. 打开 Supabase 控制台');
    console.log('2. 进入 SQL 编辑器');
    console.log('3. 复制并执行以下 SQL 脚本');
    console.log('');
    
    // 读取SQL文件
    const sqlPath = join(__dirname, '../../fix-bookmark-complete.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    console.log('----------------------------------------');
    console.log('SQL 脚本内容：');
    console.log('----------------------------------------');
    console.log(sql);
    console.log('----------------------------------------');
    console.log('');
    console.log('执行完成后，收藏功能将完全修复！');
    console.log('');
    console.log('修复内容包括：');
    console.log('✓ 创建和配置 bookmark_folders 表');
    console.log('✓ 修复 bookmarks 表的 RLS 策略');
    console.log('✓ 创建必要的索引和触发器');
    console.log('✓ 添加辅助函数');
    console.log('✓ 数据迁移和清理');
    console.log('✓ 验证脚本执行结果');
    console.log('');
    console.log('注意：执行 SQL 后，请刷新应用页面以使更改生效。');
    
  } catch (error) {
    console.error('执行修复脚本时出错:', error);
  }
}

executeBookmarkFix();