import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// 加载环境变量
config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndFixSignatureField() {
  console.log('🔄 检查个性签名字段...')
  
  try {
    // 1. 检查profiles表结构
    console.log('\n📋 检查profiles表结构...')
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'profiles' })
    
    if (columnError) {
      console.log('⚠️ 无法直接检查表结构，尝试其他方法...')
    } else {
      const hasSignature = columns.some(col => col.column_name === 'signature')
      console.log('Signature字段存在:', hasSignature)
    }
    
    // 2. 尝试查询signature字段
    console.log('\n🔍 测试signature字段查询...')
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id, signature')
      .limit(1)
    
    if (testError) {
      console.error('❌ Signature字段查询失败:', testError.message)
      
      if (testError.message.includes('column "signature" does not exist')) {
        console.log('🔧 尝试添加signature字段...')
        
        // 尝试添加字段
        const { error: addError } = await supabase
          .rpc('exec_sql', {
            sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature TEXT;'
          })
        
        if (addError) {
          console.error('❌ 添加signature字段失败:', addError.message)
          
          // 尝试直接SQL
          try {
            const { error: directError } = await supabase
              .from('profiles')
              .select('id')
              .limit(1)
            
            if (!directError) {
              console.log('✅ 可以连接数据库，但需要手动添加signature字段')
              console.log('请在Supabase控制台中执行:')
              console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature TEXT;')
            }
          } catch (e) {
            console.error('❌ 数据库连接问题:', e.message)
          }
        } else {
          console.log('✅ Signature字段添加成功')
        }
      }
    } else {
      console.log('✅ Signature字段存在且可查询')
    }
    
    // 3. 测试更新操作
    console.log('\n✏️ 测试signature更新操作...')
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ signature: '测试签名', updated_at: new Date().toISOString() })
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .select()
    
    if (updateError) {
      if (updateError.code === 'PGRST116') {
        console.log('⚠️ 测试用户不存在，但更新语法正确')
      } else {
        console.error('❌ 更新操作失败:', updateError.message)
      }
    } else {
      console.log('✅ 更新操作语法正确')
    }
    
    // 4. 检查权限
    console.log('\n🔐 检查RLS权限...')
    const { data: rlsData, error: rlsError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (rlsError) {
      console.error('❌ RLS权限检查失败:', rlsError.message)
      if (rlsError.message.includes('permission denied')) {
        console.log('🔧 可能需要调整RLS策略')
        console.log('建议在Supabase控制台中检查profiles表的RLS策略')
      }
    } else {
      console.log('✅ 基本查询权限正常')
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出错:', error.message)
  }
}

checkAndFixSignatureField()