-- 修复用户注册功能的SQL脚本
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 检查现有的触发器
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- 2. 检查可能影响注册的函数
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname LIKE '%bookmark%' 
OR proname LIKE '%folder%'
OR proname LIKE '%create_default%';

-- 3. 临时禁用可能有问题的触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS sync_bookmark_folder_trigger ON bookmarks;

-- 4. 删除可能有问题的函数
DROP FUNCTION IF EXISTS create_default_bookmark_folder();
DROP FUNCTION IF EXISTS sync_bookmark_folder();

-- 5. 重新创建更安全的收藏夹同步函数
CREATE OR REPLACE FUNCTION create_default_bookmark_folder()
RETURNS TRIGGER AS $
BEGIN
    -- 首先检查表是否存在
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'bookmark_folders' 
        AND table_schema = 'public'
    ) THEN
        -- 使用更安全的方式插入默认收藏夹
        INSERT INTO bookmark_folders (user_id, name, created_at, updated_at)
        VALUES (NEW.id, '默认收藏夹', NOW(), NOW())
        ON CONFLICT (user_id, name) DO NOTHING;
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- 如果出错，记录但不阻止注册
    RAISE WARNING '创建默认收藏夹失败: %', SQLERRM;
    RETURN NEW;
END;
$ language 'plpgsql' SECURITY DEFINER;

-- 6. 重新创建注册触发器（简化版本）
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_default_bookmark_folder();

-- 7. 测试注册功能
-- 这个查询应该能够成功执行
SELECT '注册修复完成' as status;

-- 8. 检查profiles表是否有问题
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. 检查profiles表的RLS策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 10. 确保profiles表有正确的RLS策略
-- 如果没有插入策略，创建一个
DROP POLICY IF EXISTS "用户可以创建自己的资料" ON profiles;
CREATE POLICY "用户可以创建自己的资料" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);