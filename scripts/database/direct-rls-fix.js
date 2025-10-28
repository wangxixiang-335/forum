// 直接修复RLS策略的脚本
import { createClient } from '@supabase/supabase-js';

// 从环境变量获取配置
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zykvhxqpyvudppdvmkeg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5a3ZocXhweXZ1ZHBwdHZta2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTQyNjcsImV4cCI6MjA3NzEzMDI2N30.0qJ7v7v8v8v8v8v8v8v8v8v8v8v8v8v8v8v8v8v8';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRLSPolicies() {
  console.log('🔧 开始修复RLS策略...');
  
  try {
    // 首先检查当前的表和策略
    console.log('📋 检查当前数据库状态...');
    
    // 检查profiles表是否存在
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('❌ 检查表失败:', tablesError);
      return;
    }
    
    console.log('📊 当前表:', tables.map(t => t.table_name));
    
    // 检查现有的RLS策略
    const { data: policies, error: policiesError } = await supabase
      .from('information_schema.table_privileges')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles');
    
    if (policiesError) {
      console.error('❌ 检查策略失败:', policiesError);
    } else {
      console.log('🔐 当前profiles表权限:', policies);
    }
    
    // 使用SQL查询检查RLS状态
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('get_rls_status', { table_name: 'profiles' });
    
    if (rlsError) {
      console.log('ℹ️  RLS状态检查失败（可能没有该函数）:', rlsError.message);
    }
    
    console.log('✅ 数据库状态检查完成');
    
    // 提供修复建议
    console.log('\n📋 修复建议:');
    console.log('1. 登录Supabase Dashboard: https://app.supabase.com');
    console.log('2. 选择项目: zykvhxqpyvudppdvmkeg');
    console.log('3. 进入 Table Editor → profiles 表');
    console.log('4. 点击 "Policies" 标签');
    console.log('5. 创建以下策略:');
    console.log('   - SELECT策略: 任何人都可以查看用户资料');
    console.log('   - INSERT策略: 登录用户可以创建自己的资料 (auth.uid() = id)');
    console.log('   - UPDATE策略: 用户只能更新自己的资料 (auth.uid() = id)');
    
    console.log('\n💡 或者使用SQL在Supabase SQL Editor中执行:');
    console.log(`
-- 启用RLS
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
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
  }
}

// 运行修复
fixRLSPolicies().catch(console.error);