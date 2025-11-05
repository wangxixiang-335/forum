# Supabase 存储桶配置说明

## 概述
为了支持图片上传功能，需要在Supabase项目中配置存储桶。

## 配置步骤

### 1. 登录Supabase控制台
1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目

### 2. 创建存储桶
1. 在左侧菜单中点击 **Storage**
2. 点击 **Create a new bucket**
3. 填写以下信息：
   - **Bucket Name**: `post-images`
   - **Public**: 选择 **Yes**（允许公开访问图片）
   - **File size limit**: `5MB`（与前端限制保持一致）
   - **Allowed MIME types**: `image/*`

### 3. 配置存储策略（可选）
存储桶创建后会自动生成默认策略，如果需要自定义：

```sql
-- 允许任何人读取图片
CREATE POLICY "任何人都可以查看帖子图片" ON storage.objects
FOR SELECT USING (bucket_id = 'post-images');

-- 允许认证用户上传图片
CREATE POLICY "认证用户可以上传图片" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');

-- 允许用户更新自己的图片
CREATE POLICY "用户只能更新自己的图片" ON storage.objects
FOR UPDATE USING (bucket_id = 'post-images' AND auth.uid() = owner);

-- 允许用户删除自己的图片
CREATE POLICY "用户只能删除自己的图片" ON storage.objects
FOR DELETE USING (bucket_id = 'post-images' AND auth.uid() = owner);
```

### 4. 环境变量检查
确保你的 `.env` 文件包含正确的Supabase配置：

```env
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

## 测试配置

### 1. 验证存储桶访问
```javascript
// 在浏览器控制台中测试
const { data, error } = await supabase.storage.from('post-images').list()
console.log('存储桶内容:', data)
console.log('错误:', error)
```

### 2. 测试图片上传
```javascript
// 测试上传功能
const file = new File(['test'], 'test.txt', { type: 'text/plain' })
const { data, error } = await supabase.storage
  .from('post-images')
  .upload('test-file.txt', file)

console.log('上传结果:', data)
console.log('上传错误:', error)
```

## 故障排除

### 常见问题

1. **存储桶不存在错误**
   - 检查存储桶名称是否正确（区分大小写）
   - 确认存储桶已创建并设置为公开

2. **权限错误**
   - 检查存储策略是否正确配置
   - 确认用户已登录

3. **文件大小限制错误**
   - 检查存储桶的文件大小限制设置
   - 确认前端验证逻辑正确

4. **MIME类型错误**
   - 检查存储桶允许的MIME类型
   - 确认上传的文件类型在允许范围内

## 安全建议

1. **定期清理**：定期清理未使用的图片文件
2. **监控使用量**：监控存储使用量，避免超出免费额度
3. **备份策略**：考虑实施图片备份策略
4. **CDN配置**：考虑配置CDN以提高图片加载速度

## 相关文件

- `supabase/migrations/006_add_image_support.sql` - 数据库迁移文件
- `src/stores/posts.ts` - 帖子存储，包含图片上传逻辑
- `src/components/ImageUpload.vue` - 图片上传组件
- `src/components/CreatePostModal.vue` - 创建帖子模态框，集成图片上传