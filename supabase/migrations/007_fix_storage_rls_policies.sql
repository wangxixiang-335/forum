-- 修复存储桶RLS策略
-- 注意：这些策略需要在Supabase控制台中手动配置存储桶后生效

-- 创建存储桶策略函数（需要在Supabase控制台手动创建存储桶后运行）
-- 存储桶名称：post-images

-- 策略1：任何人都可以查看存储桶中的文件
-- 在Supabase控制台中，为post-images存储桶添加以下策略：
-- Policy Name: "任何人都可以查看帖子图片"
-- Operation: SELECT
-- Expression: true

-- 策略2：认证用户可以上传文件到存储桶
-- Policy Name: "认证用户可以上传帖子图片"
-- Operation: INSERT
-- Expression: auth.role() = 'authenticated'

-- 策略3：用户只能更新自己上传的文件
-- Policy Name: "用户只能更新自己的图片"
-- Operation: UPDATE
-- Expression: auth.uid() = (SELECT user_id FROM post_images WHERE image_url LIKE '%' || name || '%')

-- 策略4：用户只能删除自己上传的文件
-- Policy Name: "用户只能删除自己的图片"
-- Operation: DELETE
-- Expression: auth.uid() = (SELECT user_id FROM post_images WHERE image_url LIKE '%' || name || '%')

-- 由于存储桶策略需要在Supabase控制台中手动配置，这里提供配置说明：
-- 1. 登录Supabase控制台
-- 2. 进入Storage → Buckets
-- 3. 创建名为"post-images"的存储桶（如果不存在）
-- 4. 为存储桶配置上述RLS策略
-- 5. 确保存储桶设置为公开（Public）

-- 创建辅助函数来帮助管理存储桶文件与数据库记录的关联
CREATE OR REPLACE FUNCTION get_user_id_from_image_path(file_path TEXT)
RETURNS UUID AS $$
DECLARE
    user_id_result UUID;
    post_id_part TEXT;
BEGIN
    -- 从文件路径中提取post_id
    -- 文件路径格式：post-images/{post_id}/{filename}
    post_id_part := split_part(split_part(file_path, '/', 2), '/', 1);
    
    -- 从post_images表中查找对应的user_id
    SELECT user_id INTO user_id_result
    FROM post_images 
    WHERE post_id::text = post_id_part
    LIMIT 1;
    
    RETURN user_id_result;
EXCEPTION
    WHEN others THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建存储桶策略的替代方案：使用存储桶级别的认证
-- 在Supabase控制台中配置存储桶时，可以使用以下表达式：
-- INSERT: auth.role() = 'authenticated'
-- UPDATE: auth.uid() = (SELECT user_id FROM post_images WHERE image_url LIKE '%' || name || '%')
-- DELETE: auth.uid() = (SELECT user_id FROM post_images WHERE image_url LIKE '%' || name || '%')

-- 注意：如果存储桶策略配置仍然有问题，可以考虑以下替代方案：
-- 1. 使用服务端密钥进行文件上传（绕过RLS）
-- 2. 创建自定义的存储桶管理API
-- 3. 使用预签名URL进行文件上传