import { supabase } from '@/services/supabase'

/**
 * Supabase配置验证器
 */
export interface ConfigValidationResult {
  isValid: boolean
  issues: ConfigIssue[]
  recommendations: string[]
}

export interface ConfigIssue {
  type: 'error' | 'warning' | 'info'
  message: string
  field?: string
  fix?: string
}

/**
 * 验证Supabase配置
 */
export async function validateSupabaseConfig(): Promise<ConfigValidationResult> {
  const issues: ConfigIssue[] = []
  const recommendations: string[] = []

  // 检查环境变量
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  // 1. 检查URL配置
  if (!supabaseUrl) {
    issues.push({
      type: 'error',
      message: 'VITE_SUPABASE_URL环境变量未配置',
      field: 'VITE_SUPABASE_URL',
      fix: '请在.env文件中设置正确的Supabase项目URL'
    })
  } else if (supabaseUrl.includes('default.supabase.co')) {
    issues.push({
      type: 'warning',
      message: '使用的是默认Supabase URL，可能无法正常工作',
      field: 'VITE_SUPABASE_URL',
      fix: '请替换为真实的Supabase项目URL'
    })
  } else if (!supabaseUrl.startsWith('https://')) {
    issues.push({
      type: 'error',
      message: 'Supabase URL必须以https://开头',
      field: 'VITE_SUPABASE_URL',
      fix: '请确保URL格式正确：https://your-project-ref.supabase.co'
    })
  }

  // 2. 检查Anon Key配置
  if (!supabaseKey) {
    issues.push({
      type: 'error',
      message: 'VITE_SUPABASE_ANON_KEY环境变量未配置',
      field: 'VITE_SUPABASE_ANON_KEY',
      fix: '请在.env文件中设置正确的Supabase匿名密钥'
    })
  } else if (supabaseKey.includes('default')) {
    issues.push({
      type: 'warning',
      message: '使用的是默认Anon Key，可能无法正常工作',
      field: 'VITE_SUPABASE_ANON_KEY',
      fix: '请替换为真实的Supabase项目匿名密钥'
    })
  }

  // 3. 测试连接（只有在基本配置正确时）
  if (issues.filter(issue => issue.type === 'error').length === 0) {
    try {
      console.log('🔗 测试Supabase连接...')
      
      // 测试认证连接
      const { data: authData, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        issues.push({
          type: 'error',
          message: `认证连接失败: ${authError.message}`,
          field: 'auth',
          fix: '请检查Supabase项目配置和网络连接'
        })
      } else {
        console.log('✅ 认证连接测试通过')
      }

      // 测试数据库表访问
      const tables = ['profiles', 'posts', 'comments', 'interactions']
      const tableResults = []

      for (const tableName of tables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('count')
            .limit(1)
          
          if (error) {
            if (error.code === 'PGRST301') {
              issues.push({
                type: 'error',
                message: `表${tableName}不存在或无法访问`,
                field: tableName,
                fix: '请确保数据库迁移已执行，表结构已创建'
              })
            } else {
              issues.push({
                type: 'warning',
                message: `表${tableName}访问异常: ${error.message}`,
                field: tableName
              })
            }
          } else {
            tableResults.push({ table: tableName, accessible: true })
          }
        } catch (error: any) {
          issues.push({
            type: 'error',
            message: `表${tableName}测试异常: ${error.message}`,
            field: tableName
          })
        }
      }

      // 如果所有表都可访问，添加成功信息
      if (tableResults.length === tables.length) {
        recommendations.push('✅ 所有数据库表均可正常访问')
      }

      // 检查认证配置
      if (authData.session) {
        recommendations.push('🔐 用户已登录，认证功能正常')
      } else {
        recommendations.push('🔐 用户未登录，可以测试注册/登录功能')
      }

    } catch (error: any) {
      issues.push({
        type: 'error',
        message: `连接测试异常: ${error.message}`,
        fix: '请检查网络连接和Supabase服务状态'
      })
    }
  }

  // 4. 生成建议
  if (issues.length === 0) {
    recommendations.push('🎉 所有配置检查通过，应用可以正常运行')
  } else {
    const errorCount = issues.filter(issue => issue.type === 'error').length
    const warningCount = issues.filter(issue => issue.type === 'warning').length
    
    if (errorCount > 0) {
      recommendations.push(`⚠️ 发现${errorCount}个错误需要修复`)
    }
    if (warningCount > 0) {
      recommendations.push(`ℹ️ 发现${warningCount}个警告需要注意`)
    }
  }

  const isValid = issues.filter(issue => issue.type === 'error').length === 0

  return {
    isValid,
    issues,
    recommendations
  }
}

/**
 * 生成配置报告
 */
export function generateConfigReport(result: ConfigValidationResult): string {
  let report = '## Supabase配置验证报告\n\n'

  if (result.isValid) {
    report += '✅ **配置验证通过**\n\n'
  } else {
    report += '❌ **配置验证失败**\n\n'
  }

  // 问题汇总
  if (result.issues.length > 0) {
    report += '### 发现的问题\n'
    
    const errors = result.issues.filter(issue => issue.type === 'error')
    const warnings = result.issues.filter(issue => issue.type === 'warning')
    const infos = result.issues.filter(issue => issue.type === 'info')

    if (errors.length > 0) {
      report += '#### 错误\n'
      errors.forEach(issue => {
        report += `- ❌ ${issue.message}`
        if (issue.fix) report += `\n  💡 修复建议: ${issue.fix}`
        report += '\n'
      })
      report += '\n'
    }

    if (warnings.length > 0) {
      report += '#### 警告\n'
      warnings.forEach(issue => {
        report += `- ⚠️ ${issue.message}`
        if (issue.fix) report += `\n  💡 建议: ${issue.fix}`
        report += '\n'
      })
      report += '\n'
    }

    if (infos.length > 0) {
      report += '#### 信息\n'
      infos.forEach(issue => {
        report += `- ℹ️ ${issue.message}\n`
      })
      report += '\n'
    }
  }

  // 建议
  if (result.recommendations.length > 0) {
    report += '### 建议\n'
    result.recommendations.forEach(rec => {
      report += `- ${rec}\n`
    })
  }

  // 环境信息
  report += '\n### 环境信息\n'
  report += `- 当前环境: ${import.meta.env.MODE}\n`
  report += `- Supabase URL: ${import.meta.env.VITE_SUPABASE_URL || '未配置'}\n`
  report += `- Anon Key: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? '已配置' : '未配置'}\n`

  return report
}

/**
 * 在控制台输出配置报告
 */
export async function logConfigReport(): Promise<void> {
  console.log('🔧 开始Supabase配置验证...')
  
  const result = await validateSupabaseConfig()
  const report = generateConfigReport(result)
  
  console.log(report)
  
  if (result.isValid) {
    console.log('✅ Supabase配置验证通过，应用可以正常运行')
  } else {
    console.warn('❌ Supabase配置验证失败，请检查上述问题')
  }
}

// 开发模式下自动运行配置检查
if (import.meta.env.DEV) {
  setTimeout(() => {
    logConfigReport()
  }, 1000)
}