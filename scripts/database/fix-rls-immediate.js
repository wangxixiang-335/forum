// 立即修复RLS策略的脚本
import { createClient } from '@supabase/supabase-js';

// 使用正确的配置
const supabaseUrl = 'https://zykvhxqpyvudppdvmkeg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5a3ZoeHFweXZ1ZHBwZHZta2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NDUxNDMsImV4cCI6MjA3NzEyMTE0M30.m6Zm5_C1QNcVQsSrjdzEqHZVZSinK7dhvVAvSg51qAI';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRLSPolicies() {
  console.log('🔧 开始修复RLS策略...');
  
  try {
    // 测试连接
    console.log('🔗 测试Supabase连接...');
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('📊 连接测试结果:', error.message);
      
      if (error.message.includes('RLS')) {
        console.log('✅ 确认问题：RLS策略缺失或配置错误');
      }
    } else {
      console.log('✅ 连接正常');
    }
    
    console.log('\n📋 问题分析：');
    console.log('❌ 错误代码: 42501 (RLS策略违规)');
    console.log('❌ 错误信息: new row violates row-level security policy for table "profiles"');
    console.log('❌ 根本原因: profiles表缺少INSERT RLS策略');
    
    console.log('\n🛠️ 解决方案：');
    console.log('1. 登录Supabase Dashboard: https://app.supabase.com');
    console.log('2. 选择项目: zykvhxqpyvudppdvmkeg');
    console.log('3. 进入 Table Editor → profiles 表');
    console.log('4. 点击 "Policies" 标签');
    console.log('5. 点击 "New Policy" 创建以下策略:');
    
    console.log('\n📝 需要创建的RLS策略：');
    console.log('');
    console.log('策略名称: "任何人都可以查看用户资料"');
    console.log('操作类型: SELECT');
    console.log('使用表达式: true');
    console.log('');
    console.log('策略名称: "登录用户可以创建自己的资料"');
    console.log('操作类型: INSERT');
    console.log('检查表达式: auth.uid() = id');
    console.log('');
    console.log('策略名称: "用户只能更新自己的资料"');
    console.log('操作类型: UPDATE');
    console.log('使用表达式: auth.uid() = id');
    
    console.log('\n💡 或者使用SQL在Supabase SQL Editor中执行：');
    console.log(`
-- 确保RLS已启用
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS "任何人都可以查看用户资料" ON profiles;
DROP POLICY IF EXISTS "登录用户可以创建自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户只能更新自己的资料" ON profiles;

-- 创建新策略
CREATE POLICY "任何人都可以查看用户资料" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "登录用户可以创建自己的资料" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "用户只能更新自己的资料" ON profiles
    FOR UPDATE USING (auth.uid() = id);
    `);
    
    console.log('\n🚀 立即修复步骤：');
    console.log('1. 复制上面的SQL代码');
    console.log('2. 打开 https://app.supabase.com/project/zykvhxqpyvudppdvmkeg/sql');
    console.log('3. 粘贴SQL代码并点击 "Run"');
    console.log('4. 等待执行完成（约1-2秒）');
    console.log('5. 重新测试用户注册功能');
    
    console.log('\n✅ 修复后预期结果：');
    console.log('- 新用户注册时能成功创建用户资料');
    console.log('- 不再出现 "row-level security policy" 错误');
    console.log('- 用户资料能正常保存到Supabase数据库');
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
  }
}

// 运行修复
fixRLSPolicies().catch(console.error);