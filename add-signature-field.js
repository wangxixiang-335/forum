// 直接执行 signature 字段添加的脚本
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addSignatureField() {
  console.log('🔄 尝试添加 signature 字段...')
  
  try {
    // 尝试添加 signature 字段
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature TEXT;`
    })
    
    if (error) {
      console.log('⚠️ 使用 RPC 失败，尝试直接 SQL...')
      
      // 使用 REST API 直接执行
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature TEXT;`
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      console.log('✅ Signature 字段添加成功')
    } else {
      console.log('✅ Signature 字段添加成功')
    }
    
    // 检查字段是否存在
    const { data, error: checkError } = await supabase
      .from('profiles')
      .select('signature')
      .limit(1)
    
    if (checkError) {
      console.log('⚠️ 检查字段时出错:', checkError.message)
    } else {
      console.log('✅ Signature 字段验证成功')
    }
    
  } catch (error) {
    console.error('❌ 添加 signature 字段失败:', error.message)
    
    // 尝试通过 Supabase Dashboard 的 SQL 编辑器手动执行
    console.log(`
💡 请手动在 Supabase Dashboard 中执行以下 SQL：

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature TEXT;
COMMENT ON COLUMN profiles.signature IS '用户个性签名，Lv.5解锁';
    `)
  }
}

addSignatureField()