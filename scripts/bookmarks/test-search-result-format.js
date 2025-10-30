import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearchResultFormat() {
  try {
    console.log('=== 测试搜索结果格式 ===');
    
    // 1. 模拟搜索功能获取帖子数据
    console.log('\n1. 获取搜索结果数据:');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (username, avatar_url, level)
      `)
      .ilike('title', '%测试%')
      .limit(3);
    
    if (postsError) {
      console.error('获取帖子失败:', postsError);
      return;
    }
    
    console.log(`找到 ${posts?.length || 0} 个帖子`);
    
    // 2. 检查数据格式
    posts?.forEach((post, index) => {
      console.log(`\n帖子 ${index + 1}:`);
      console.log('- ID:', post.id);
      console.log('- 标题:', post.title);
      console.log('- 用户名:', post.profiles?.username);
      console.log('- 用户等级:', post.profiles?.level);
      console.log('- 点赞数:', post.like_count);
      console.log('- 评论数:', post.comment_count);
      console.log('- 浏览数:', post.view_count);
      console.log('- 创建时间:', post.created_at);
      
      // 检查必需的字段
      const requiredFields = ['id', 'title', 'content', 'created_at'];
      const missingFields = requiredFields.filter(field => !post[field]);
      
      if (missingFields.length > 0) {
        console.log('- ⚠️ 缺少字段:', missingFields);
      } else {
        console.log('- ✅ 所有必需字段都存在');
      }
    });
    
    // 3. 测试搜索结果的数据转换
    console.log('\n2. 测试数据转换:');
    const searchResults = posts?.map(post => ({
      type: 'post',
      id: post.id,
      title: post.title,
      content: post.content,
      created_at: post.created_at,
      updated_at: post.updated_at,
      user_id: post.user_id,
      username: post.profiles?.username,
      avatar_url: post.profiles?.avatar_url,
      level: post.profiles?.level,
      like_count: post.like_count,
      comment_count: post.comment_count,
      view_count: post.view_count,
      tags: post.tags,
      is_pinned: post.is_pinned
    }));
    
    console.log('转换后的搜索结果:');
    searchResults?.forEach((result, index) => {
      console.log(`\n搜索结果 ${index + 1}:`);
      console.log('- 类型:', result.type);
      console.log('- ID:', result.id);
      console.log('- 标题:', result.title);
      console.log('- 用户名:', result.username);
      console.log('- 路由路径:', `/post/${result.id}`);
    });
    
    // 4. 测试路由跳转逻辑
    console.log('\n3. 测试路由跳转逻辑:');
    searchResults?.forEach((result, index) => {
      const routePath = `/post/${result.id}`;
      console.log(`搜索结果 ${index + 1} 的路由路径: ${routePath}`);
      
      // 验证ID格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(result.id)) {
        console.log(`✅ ID格式正确: ${result.id}`);
      } else {
        console.log(`❌ ID格式错误: ${result.id}`);
      }
    });
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

testSearchResultFormat();