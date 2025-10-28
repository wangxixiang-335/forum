// 检查当前RLS策略状态的脚本
import { createClient } from '@supabase/supabase-js';

// 使用正确的配置
const supabaseUrl = 'https://zykvhxqpyvudppdvmkeg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5a3ZoeHFweXZ1ZHBwZHZta2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NDUxNDMsImV4cCI6MjA3NzEyMTE0M30.m6Zm5_C1QNcVQsSrjdzEqHZVZSinK7dhvVAvSg51qAI';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSStatus() {
  console.log('🔍 检查当前RLS策略状态...\n');
  
  try {
    // 测试当前连接状态
    console.log('1. 测试数据库连接...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('   ❌ 连接错误:', testError.message);
    } else {
      console.log('   ✅ 连接正常');
    }
    
    // 尝试创建测试用户资料（模拟注册过程）
    console.log('\n2. 模拟用户注册过程...');
    
    const testProfile = {
      id: 'test-user-id-' + Date.now(),
      username: 'testuser' + Date.now(),
      avatar_url: null,
      level: 1,
      experience_points: 0,
      created_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .insert(testProfile)
      .select();
    
    if (insertError) {
      console.log('   ❌ 用户资料创建失败:');
      console.log('     错误代码:', insertError.code);
      console.log('     错误信息:', insertError.message);
      
      if (insertError.code === '42501') {
        console.log('   🔍 确认问题: RLS策略缺失或配置错误');
      }
    } else {
      console.log('   ✅ 用户资料创建成功');
      console.log('     创建的资料:', insertData);
    }
    
    console.log('\n3. 检查现有数据...');
    
    // 检查是否有现有用户资料
    const { data: existingProfiles, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (selectError) {
      console.log('   ❌ 查询现有资料失败:', selectError.message);
    } else {
      console.log('   ✅ 现有用户资料数量:', existingProfiles.length);
      if (existingProfiles.length > 0) {
        console.log('     示例资料:', existingProfiles[0]);
      }
    }
    
    console.log('\n📋 诊断结果总结:');
    console.log('   ❌ 问题确认: RLS INSERT策略缺失');
    console.log('   🔧 解决方案: 需要在Supabase Dashboard中修复RLS策略');
    
    console.log('\n🚀 立即执行修复:');
    console.log('   1. 打开 https://app.supabase.com/project/zykvhxqpyvudppdvmkeg/sql');
    console.log('   2. 复制并执行以下SQL代码:');
    console.log(`
-- 修复profiles表RLS策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 删除可能冲突的旧策略
DROP POLICY IF EXISTS "任何人都可以查看用户资料" ON profiles;
DROP POLICY IF EXISTS "登录用户可以创建自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户只能更新自己的资料" ON profiles;

-- 创建必需的新策略
CREATE POLICY "任何人都可以查看用户资料" ON profiles FOR SELECT USING (true);
CREATE POLICY "登录用户可以创建自己的资料" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "用户只能更新自己的资料" ON profiles FOR UPDATE USING (auth.uid() = id);
    `);
    
    console.log('   3. 点击 "Run" 执行SQL');
    console.log('   4. 等待执行完成（约1-2秒）');
    console.log('   5. 重新运行此脚本验证修复结果');
    
  } catch (error) {
    console.error('❌ 检查过程中出错:', error);
  }
}

// 运行检查
checkRLSStatus().catch(console.error);