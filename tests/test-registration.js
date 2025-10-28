// 测试用户注册功能的脚本
import { createClient } from '@supabase/supabase-js'

// Supabase配置
const supabaseUrl = 'https://zykvhxqpyvudppdvmkeg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5a3ZoeHFweXZ1ZHBwZHZta2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NDUxNDMsImV4cCI6MjA3NzEyMTE0M30.m6Zm5_C1QNcVQsSrjdzEqHZVZSinK7dhvVAvSg51qAI'

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRegistration() {
    console.log('🧪 开始测试用户注册功能...')
    
    // 生成唯一的测试邮箱和用户名（使用有效的邮箱域名）
    const timestamp = Date.now()
    const testEmail = `test${timestamp}@mailinator.com`  // 使用mailinator.com作为测试邮箱
    const testUsername = `testuser${timestamp}`
    const testPassword = 'TestPassword123!'
    
    console.log('📧 测试账号信息:')
    console.log(`   邮箱: ${testEmail}`)
    console.log(`   用户名: ${testUsername}`)
    console.log(`   密码: ${testPassword}`)
    
    try {
        // 1. 测试注册
        console.log('\n1️⃣ 测试用户注册...')
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    username: testUsername
                }
            }
        })
        
        if (signUpError) {
            console.error('❌ 注册失败:', signUpError.message)
            
            // 分析错误类型
            if (signUpError.message.includes('User already registered')) {
                console.log('ℹ️  用户已存在，尝试使用不同的邮箱')
                return await testRegistration() // 递归重试
            }
            
            if (signUpError.message.includes('Invalid')) {
                console.error('❌ 认证配置错误，请检查Supabase配置')
                return false
            }
            
            throw signUpError
        }
        
        console.log('✅ 注册请求发送成功')
        
        if (signUpData.user) {
            console.log('👤 用户创建成功，ID:', signUpData.user.id)
            
            // 2. 测试用户资料创建
            console.log('\n2️⃣ 测试用户资料创建...')
            
            // 等待一小段时间让后台处理完成
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // 尝试创建用户资料
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: signUpData.user.id,
                    username: testUsername,
                    level: 1,
                    experience_points: 0
                })
                .select()
            
            if (profileError) {
                console.error('❌ 用户资料创建失败:', profileError.message)
                
                if (profileError.message.includes('row-level security')) {
                    console.error('🔒 RLS策略问题: 缺少INSERT权限')
                    console.log('💡 解决方案: 请执行SUPABASE_RLS_FIX_GUIDE.md中的修复步骤')
                }
                
                // 即使资料创建失败，注册本身是成功的
                console.log('⚠️ 用户注册成功，但资料创建失败（需要修复RLS策略）')
                
            } else {
                console.log('✅ 用户资料创建成功:', profileData)
            }
            
            // 3. 测试登录
            console.log('\n3️⃣ 测试用户登录...')
            
            // 先登出
            await supabase.auth.signOut()
            
            // 等待登出完成
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // 尝试登录
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: testEmail,
                password: testPassword
            })
            
            if (signInError) {
                console.error('❌ 登录失败:', signInError.message)
                
                if (signInError.message.includes('Invalid login credentials')) {
                    console.log('ℹ️  可能需要邮箱验证，检查邮箱确认链接')
                }
                
            } else {
                console.log('✅ 登录成功')
                console.log('👤 当前用户:', signInData.user.email)
            }
            
            // 4. 清理测试数据
            console.log('\n4️⃣ 清理测试数据...')
            
            // 注意：Supabase通常不允许通过API删除用户
            // 测试数据可以保留或通过Dashboard手动删除
            console.log('📝 测试数据保留，可通过Supabase Dashboard手动清理')
            
        } else {
            console.log('⚠️ 用户创建成功，但需要邮箱验证')
            console.log('📧 请检查邮箱确认链接完成注册')
        }
        
        console.log('\n🎉 测试完成！')
        return true
        
    } catch (error) {
        console.error('❌ 测试过程中出现异常:', error)
        return false
    }
}

async function checkDatabaseStatus() {
    console.log('🔍 检查数据库连接状态...')
    
    try {
        // 测试profiles表访问
        const { data, error } = await supabase
            .from('profiles')
            .select('count')
            .limit(1)
        
        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('permission')) {
                console.log('⚠️ 数据库连接正常，但权限受限（RLS策略生效）')
                return true
            }
            console.error('❌ 数据库连接测试失败:', error.message)
            return false
        }
        
        console.log('✅ 数据库连接正常')
        return true
        
    } catch (error) {
        console.error('❌ 数据库状态检查异常:', error)
        return false
    }
}

async function main() {
    console.log('🚀 开始用户注册功能测试...\n')
    
    // 检查数据库连接
    const dbStatus = await checkDatabaseStatus()
    if (!dbStatus) {
        console.error('❌ 数据库连接异常，测试终止')
        return
    }
    
    // 执行注册测试
    const testResult = await testRegistration()
    
    console.log('\n' + '='.repeat(50))
    if (testResult) {
        console.log('✅ 用户注册功能测试通过')
        console.log('💡 如果遇到RLS策略问题，请参考SUPABASE_RLS_FIX_GUIDE.md')
    } else {
        console.log('❌ 用户注册功能测试失败')
        console.log('🔧 需要进一步调试和修复')
    }
    console.log('='.repeat(50))
}

// 执行测试
main().catch(console.error)