import { supabase } from '@/services/supabase'

/**
 * 数据库迁移执行器
 */
export interface MigrationResult {
  success: boolean
  message: string
  details?: string
  executedMigrations?: string[]
  errors?: MigrationError[]
}

export interface MigrationError {
  migration: string
  error: string
  sql?: string
}

/**
 * 执行数据库迁移
 */
export async function runMigrations(): Promise<MigrationResult> {
  console.log('🚀 开始执行数据库迁移...')
  
  const executedMigrations: string[] = []
  const errors: MigrationError[] = []

  try {
    // 检查迁移文件是否存在
    const migrationFiles = await getMigrationFiles()
    
    if (migrationFiles.length === 0) {
      return {
        success: false,
        message: '未找到迁移文件',
        details: '请确保supabase/migrations目录下有SQL迁移文件'
      }
    }

    console.log(`📁 找到 ${migrationFiles.length} 个迁移文件`)

    // 按文件名排序执行迁移
    migrationFiles.sort()

    for (const migrationFile of migrationFiles) {
      try {
        console.log(`🔧 执行迁移: ${migrationFile}`)
        
        const sqlContent = await getMigrationSQL(migrationFile)
        if (!sqlContent) {
          throw new Error(`无法读取迁移文件: ${migrationFile}`)
        }

        // 执行SQL
        const { error } = await supabase.rpc('exec_sql', { sql: sqlContent })
        
        if (error) {
          // 如果exec_sql函数不存在，尝试直接执行SQL
          if (error.message.includes('function "exec_sql" does not exist')) {
            await executeRawSQL(sqlContent)
          } else {
            throw error
          }
        }

        executedMigrations.push(migrationFile)
        console.log(`✅ 迁移执行成功: ${migrationFile}`)
        
      } catch (error: any) {
        console.error(`❌ 迁移执行失败: ${migrationFile}`, error)
        errors.push({
          migration: migrationFile,
          error: error.message,
          sql: await getMigrationSQL(migrationFile)
        })
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: `迁移执行完成，但有 ${errors.length} 个错误`,
        executedMigrations,
        errors
      }
    }

    return {
      success: true,
      message: `所有迁移执行成功 (${executedMigrations.length} 个文件)`,
      executedMigrations,
      details: '数据库表结构已创建，RLS策略已配置'
    }

  } catch (error: any) {
    console.error('❌ 迁移执行异常:', error)
    return {
      success: false,
      message: '迁移执行异常',
      details: error.message,
      errors
    }
  }
}

/**
 * 获取迁移文件列表
 */
async function getMigrationFiles(): Promise<string[]> {
  // 这里应该从文件系统读取，但浏览器环境无法直接访问
  // 在实际项目中，可以通过API或构建时处理
  
  // 模拟返回迁移文件列表
  return ['001_create_tables.sql']
}

/**
 * 获取迁移文件内容
 */
async function getMigrationSQL(filename: string): Promise<string | null> {
  try {
    // 在实际项目中，应该从文件系统或API获取
    // 这里返回硬编码的SQL内容
    
    if (filename === '001_create_tables.sql') {
      return `
        -- 创建论坛数据库表结构
        -- 迁移文件：001_create_tables.sql

        -- 1. 创建用户扩展信息表 (profiles)
        CREATE TABLE IF NOT EXISTS profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            username TEXT UNIQUE NOT NULL,
            avatar_url TEXT,
            level INTEGER DEFAULT 1 CHECK (level >= 1),
            experience_points INTEGER DEFAULT 0 CHECK (experience_points >= 0),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- 2. 创建帖子表 (posts)
        CREATE TABLE IF NOT EXISTS posts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
            content TEXT NOT NULL CHECK (char_length(content) >= 1),
            tags TEXT[] DEFAULT '{}',
            like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
            comment_count INTEGER DEFAULT 0 CHECK (comment_count >= 0),
            view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
            is_pinned BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- 3. 创建评论表 (comments)
        CREATE TABLE IF NOT EXISTS comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
            parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
            like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
            is_pinned BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- 4. 创建互动表 (interactions)
        CREATE TABLE IF NOT EXISTS interactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
            target_id UUID NOT NULL,
            interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'bookmark', 'share')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            
            -- 防止重复操作的唯一约束
            UNIQUE(user_id, target_type, target_id, interaction_type)
        );

        -- 创建索引以优化查询性能
        CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
        CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level);
        CREATE INDEX IF NOT EXISTS idx_profiles_experience ON profiles(experience_points);
        CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_like_count ON posts(like_count DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_comment_count ON posts(comment_count DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);
        CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
        CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
        CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
        CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
        CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_comments_like_count ON comments(like_count DESC);
        CREATE INDEX IF NOT EXISTS idx_comments_is_pinned ON comments(is_pinned);
        CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_interactions_target ON interactions(target_type, target_id);
        CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type);
        CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);

        -- 启用行级安全 (RLS)
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

        -- 创建RLS策略
        
        -- profiles表策略
        CREATE POLICY "任何人都可以查看用户资料" ON profiles
            FOR SELECT USING (true);

        CREATE POLICY "登录用户可以创建自己的资料" ON profiles
            FOR INSERT WITH CHECK (auth.uid() = id);

        CREATE POLICY "用户只能更新自己的资料" ON profiles
            FOR UPDATE USING (auth.uid() = id);

        -- posts表策略
        CREATE POLICY "任何人都可以查看帖子" ON posts
            FOR SELECT USING (true);

        CREATE POLICY "登录用户可以创建帖子" ON posts
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "用户只能更新自己的帖子" ON posts
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "用户只能删除自己的帖子" ON posts
            FOR DELETE USING (auth.uid() = user_id);

        -- comments表策略
        CREATE POLICY "任何人都可以查看评论" ON comments
            FOR SELECT USING (true);

        CREATE POLICY "登录用户可以创建评论" ON comments
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "用户只能更新自己的评论" ON comments
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "用户只能删除自己的评论" ON comments
            FOR DELETE USING (auth.uid() = user_id);

        -- interactions表策略
        CREATE POLICY "用户只能查看自己的互动记录" ON interactions
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "登录用户可以创建互动" ON interactions
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "用户只能删除自己的互动记录" ON interactions
            FOR DELETE USING (auth.uid() = user_id);
      `
    }
    
    return null
  } catch (error) {
    console.error(`❌ 读取迁移文件失败: ${filename}`, error)
    return null
  }
}

/**
 * 执行原始SQL
 */
async function executeRawSQL(sql: string): Promise<void> {
  // 将SQL分割成单独的语句
  const statements = sql.split(';').filter(stmt => stmt.trim())
  
  for (const statement of statements) {
    if (statement.trim()) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
      
      if (error) {
        // 如果还是失败，尝试使用SQL API
        throw new Error(`SQL执行失败: ${error.message}`)
      }
    }
  }
}

/**
 * 检查数据库表状态
 */
export async function checkDatabaseStatus(): Promise<{
  tablesExist: boolean
  tables: { name: string; exists: boolean; rowCount?: number }[]
}> {
  const tables = ['profiles', 'posts', 'comments', 'interactions']
  const tableStatus = []

  for (const tableName of tables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      tableStatus.push({
        name: tableName,
        exists: !error,
        rowCount: data ? data.length : 0
      })
    } catch (error) {
      tableStatus.push({
        name: tableName,
        exists: false,
        rowCount: 0
      })
    }
  }

  const tablesExist = tableStatus.every(table => table.exists)

  return {
    tablesExist,
    tables: tableStatus
  }
}

/**
 * 在控制台输出迁移状态
 */
export async function logMigrationStatus(): Promise<void> {
  console.log('🔍 检查数据库迁移状态...')
  
  const dbStatus = await checkDatabaseStatus()
  
  console.log('📊 数据库表状态:')
  dbStatus.tables.forEach(table => {
    const status = table.exists ? '✅' : '❌'
    console.log(`  ${status} ${table.name}: ${table.exists ? '存在' : '不存在'}`)
  })
  
  if (!dbStatus.tablesExist) {
    console.log('⚠️ 部分表不存在，需要执行迁移')
    
    const runMigration = confirm('是否立即执行数据库迁移？')
    if (runMigration) {
      await runMigrations()
    }
  } else {
    console.log('✅ 所有数据库表均已存在')
  }
}

// 开发模式下自动检查迁移状态
if (import.meta.env.DEV) {
  setTimeout(() => {
    logMigrationStatus()
  }, 2000)
}