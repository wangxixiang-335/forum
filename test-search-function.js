import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearchFunction() {
  try {
    console.log('=== 测试搜索功能 ===');
    
    // 1. 测试帖子搜索
    console.log('\n1. 测试帖子搜索:');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .or('title.ilike.%测试%,content.ilike.%测试%')
      .limit(5);
    
    if (postsError) {
      console.error('帖子搜索失败:', postsError);
    } else {
      console.log(`找到 ${posts?.length || 0} 个匹配的帖子`);
      posts?.forEach(post => {
        console.log(`- 标题: ${post.title}, ID: ${post.id}`);
      });
    }
    
    // 2. 测试用户搜索
    console.log('\n2. 测试用户搜索:');
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', '%test%')
      .limit(5);
    
    if (usersError) {
      console.error('用户搜索失败:', usersError);
    } else {
      console.log(`找到 ${users?.length || 0} 个匹配的用户`);
      users?.forEach(user => {
        console.log(`- 用户名: ${user.username}, ID: ${user.id}`);
      });
    }
    
    // 3. 测试评论搜索
    console.log('\n3. 测试评论搜索:');
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .ilike('content', '%测试%')
      .limit(5);
    
    if (commentsError) {
      console.error('评论搜索失败:', commentsError);
    } else {
      console.log(`找到 ${comments?.length || 0} 个匹配的评论`);
      comments?.forEach(comment => {
        console.log(`- 内容: ${comment.content?.substring(0, 50)}..., ID: ${comment.id}`);
      });
    }
    
    // 4. 测试获取热门标签
    console.log('\n4. 测试获取热门标签:');
    const { data: tagPosts, error: tagError } = await supabase
      .from('posts')
      .select('tags')
      .not('tags', 'eq', '{}')
      .limit(100);
    
    if (tagError) {
      console.error('获取标签失败:', tagError);
    } else {
      // 统计标签频率
      const tagCounts = {};
      tagPosts?.forEach(post => {
        post.tags?.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
      
      // 排序并返回热门标签
      const popularTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));
      
      console.log(`找到 ${popularTags.length} 个热门标签:`);
      popularTags.forEach(({ tag, count }) => {
        console.log(`- ${tag}: ${count} 次使用`);
      });
    }
    
  } catch (error) {
    console.error('测试搜索功能时出错:', error);
  }
}

testSearchFunction();