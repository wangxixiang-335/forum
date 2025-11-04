// 个性签名修复脚本 - 在浏览器控制台中运行
// 使用方法：复制此代码到浏览器开发者工具的控制台中执行

async function fixSignatureField() {
  console.log('🔧 开始修复个性签名保存问题...')
  
  try {
    // 检查supabase对象是否存在
    if (typeof supabase === 'undefined') {
      console.error('❌ supabase对象未定义，请确保在应用页面中运行此脚本')
      return
    }
    
    // 1. 检查当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ 请先登录')
      return
    }
    
    console.log('✅ 当前用户:', user.id)
    
    // 2. 检查profiles表是否存在signature字段
    console.log('\n🔍 检查signature字段...')
    
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('signature')
      .eq('id', user.id)
      .single()
    
    if (testError) {
      console.error('❌ 字段检查失败:', testError)
      
      if (testError.code === 'PGRST116') {
        console.log('⚠️ signature字段不存在，尝试创建...')
        
        // 尝试通过SQL执行添加字段
        const { data: sqlData, error: sqlError } = await supabase
          .rpc('exec_sql', {
            sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature TEXT;'
          })
        
        if (sqlError) {
          console.error('❌ 无法自动添加字段，请手动在Supabase控制台执行:')
          console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature TEXT;')
          console.log('COMMENT ON COLUMN profiles.signature IS \'用户个性签名，Lv.5解锁\';')
        } else {
          console.log('✅ signature字段添加成功')
        }
      }
    } else {
      console.log('✅ signature字段存在')
    }
    
    // 3. 测试更新操作
    console.log('\n✏️ 测试更新操作...')
    
    const testSignature = '测试签名_' + Date.now()
    
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        signature: testSignature,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
    
    if (updateError) {
      console.error('❌ 更新失败:', updateError)
      
      if (updateError.code === '42501') {
        console.log('⚠️ 权限不足，需要检查RLS策略')
        console.log('请在Supabase控制台检查profiles表的RLS策略，确保用户可以更新自己的profile')
      }
    } else {
      console.log('✅ 更新成功:', updateData)
      
      // 4. 验证更新
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('signature')
        .eq('id', user.id)
        .single()
      
      if (verifyError) {
        console.error('❌ 验证失败:', verifyError)
      } else {
        console.log('✅ 验证成功，当前签名:', verifyData.signature)
      }
    }
    
    // 5. 检查本地存储
    console.log('\n💾 检查本地存储...')
    const localSignature = localStorage.getItem('userSignature')
    console.log('本地存储的签名:', localSignature)
    
    console.log('\n🎉 修复检查完成!')
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error)
  }
}

// 执行修复
fixSignatureField()

// 提供手动修复函数
window.fixSignature = {
  // 手动添加signature字段
  addField: async () => {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature TEXT;'
      })
    if (error) {
      console.error('添加字段失败:', error)
    } else {
      console.log('字段添加成功')
    }
  },
  
  // 手动测试更新
  testUpdate: async (signature) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('请先登录')
      return
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        signature: signature,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
    
    if (error) {
      console.error('更新失败:', error)
    } else {
      console.log('更新成功:', data)
    }
  }
}

console.log('🔧 修复工具已加载，可以使用 fixSignature.addField() 和 fixSignature.testUpdate("你的签名")')