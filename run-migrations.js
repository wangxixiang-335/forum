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

async function runMigrations() {
  console.log('🔄 开始执行数据库迁移...')
  
  try {
    // 1. 添加signature字段
    console.log('\n1️⃣ 添加signature字段...')
    const { error: signatureError } = await supabase
      .from('profiles')
      .select('signature')
      .limit(1)
    
    if (signatureError && signatureError.message.includes('column "signature" does not exist')) {
      console.log('⚠️ signature字段不存在，需要手动添加')
      console.log('请在Supabase控制台SQL编辑器中执行:')
      console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature TEXT;')
      console.log('COMMENT ON COLUMN profiles.signature IS \'用户个性签名，Lv.5解锁\';')
    } else if (signatureError) {
      console.error('❌ 检查signature字段时出错:', signatureError.message)
    } else {
      console.log('✅ signature字段已存在')
    }
    
    // 2. 检查theme_color字段
    console.log('\n2️⃣ 检查theme_color字段...')
    const { error: themeError } = await supabase
      .from('profiles')
      .select('theme_color')
      .limit(1)
    
    if (themeError && themeError.message.includes('column "theme_color" does not exist')) {
      console.log('⚠️ theme_color字段不存在，需要手动添加')
      console.log('请在Supabase控制台SQL编辑器中执行:')
      console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7) DEFAULT \'#6366f1\';')
    } else if (themeError) {
      console.error('❌ 检查theme_color字段时出错:', themeError.message)
    } else {
      console.log('✅ theme_color字段已存在')
    }
    
    // 3. 检查必要的函数
    console.log('\n3️⃣ 检查数据库函数...')
    
    const functions = [
      'get_table_columns',
      'exec_sql'
    ]
    
    for (const funcName of functions) {
      try {
        const { data, error } = await supabase.rpc(funcName, { 
          sql: 'SELECT 1;' 
        })
        
        if (error) {
          console.log(`⚠️ 函数 ${funcName} 不存在或无法执行`)
        } else {
          console.log(`✅ 函数 ${funcName} 可用`)
        }
      } catch (e) {
        console.log(`⚠️ 函数 ${funcName} 检查失败`)
      }
    }
    
    // 4. 检查RLS策略
    console.log('\n4️⃣ 检查RLS策略...')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!userError && user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        console.log('⚠️ 无法访问用户profile，可能需要调整RLS策略')
        console.log('错误:', profileError.message)
      } else {
        console.log('✅ 可以访问用户profile')
      }
    } else {
      console.log('⚠️ 用户未登录，跳过RLS检查')
    }
    
    console.log('\n🎉 迁移检查完成!')
    
  } catch (error) {
    console.error('❌ 迁移过程中出错:', error)
  }
}

runMigrations()