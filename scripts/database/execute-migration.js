// 数据库迁移执行脚本
import { runMigrations } from './dist/utils/migrationRunner.js';

async function executeMigration() {
  console.log('🚀 开始执行数据库迁移...');
  
  try {
    const result = await runMigrations();
    
    if (result.success) {
      console.log('✅ 迁移执行成功:', result.message);
      console.log('📋 执行的迁移文件:', result.executedMigrations);
    } else {
      console.error('❌ 迁移执行失败:', result.message);
      if (result.errors) {
        result.errors.forEach(error => {
          console.error(`  - ${error.migration}: ${error.error}`);
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ 迁移执行异常:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  executeMigration().catch(console.error);
}

export { executeMigration };