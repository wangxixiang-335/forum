// 测试所有可能的Supabase配置
import { createClient } from '@supabase/supabase-js'

// 所有可能的配置
const configs = [
  {
    name: '配置1 (lsnunsxhnazfnyxayfmd)',
    url: 'https://lsnunsxhnazfnyxayfmd.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbnVuc3hobmF6Zm55eGF5Zm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDMyNTIsImV4cCI6MjA3NjA3OTI1Mn0._ooE6qigwspvhejS1JDJDwKbXcgfyIW2C5HnuBdBwMM'
  },
  {
    name: '配置2 (bkintupjzbcjiqvzricz)',
    url: 'https://bkintupjzbcjiqvzricz.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o'
  }
]

async function testConfig(config) {
  console.log(`\n🔧 测试配置: ${config.name}`)
  console.log(`URL: ${config.url}`)
  
  const supabase = createClient(config.url, config.key)
  
  try {
    // 测试认证连接
    const authStart = Date.now()
    const { data: authData, error: authError } = await supabase.auth.getSession()
    const authTime = Date.now() - authStart
    
    if (authError) {
      console.log(`❌ 认证失败: ${authError.message}`)
      return false
    }
    
    console.log(`✅ 认证成功 (${authTime}ms)`)
    
    // 测试实际的数据查询
    const queryStart = Date.now()
    const { data: posts, error: queryError } = await supabase
      .from('posts')
      .select('id')
      .limit(1)
    const queryTime = Date.now() - queryStart
    
    if (queryError) {
      console.log(`❌ 数据查询失败: ${queryError.message}`)
      console.log(`错误代码: ${queryError.code}`)
      
      if (queryError.code === 'PGRST301') {
        console.log('💡 表可能不存在，但连接是有效的')
        return true
      }
      return false
    }
    
    console.log(`✅ 数据查询成功 (${queryTime}ms)`)
    console.log(`查询结果: ${JSON.stringify(posts)}`)
    return true
    
  } catch (error) {
    console.log(`❌ 测试异常: ${error.message}`)
    if (error.cause) {
      console.log(`底层错误: ${error.cause.message}`)
    }
    return false
  }
}

async function main() {
  console.log('🔍 测试所有Supabase配置...')
  
  let validConfig = null
  
  for (const config of configs) {
    const isValid = await testConfig(config)
    if (isValid) {
      validConfig = config
      console.log(`\n🎉 找到有效配置: ${config.name}`)
      break
    }
  }
  
  if (validConfig) {
    console.log('\n📋 有效配置信息:')
    console.log(`URL: ${validConfig.url}`)
    console.log(`Key: ${validConfig.key.substring(0, 20)}...`)
    
    console.log('\n💡 建议操作:')
    console.log('1. 更新 .env 文件使用此配置')
    console.log('2. 运行数据库迁移脚本创建表')
    console.log('3. 测试帖子创建功能')
  } else {
    console.log('\n❌ 没有找到有效的配置')
    console.log('💡 请检查:')
    console.log('1. Supabase项目是否已创建并运行')
    console.log('2. 网络连接是否正常')
    console.log('3. 防火墙或代理设置')
  }
}

main().catch(console.error)