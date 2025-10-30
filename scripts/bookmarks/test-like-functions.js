import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLikeFunctions() {
  try {
    console.log('=== 测试点赞相关函数 ===');
    
    // 1. 检查 increment_like_count 函数
    console.log('\n1. 测试 increment_like_count 函数:');
    try {
      const { data, error } = await supabase.rpc('increment_like_count', { 
        post_id: '491dbb1c-5a7b-40ab-8557-b2ebd821605a' // 使用一个测试帖子ID
      });
      
      if (error) {
        console.error('increment_like_count 函数不存在或出错:', error);
      } else {
        console.log('increment_like_count 函数执行成功:', data);
      }
    } catch (err) {
      console.error('调用 increment_like_count 时出错:', err);
    }
    
    // 2. 检查 decrement_like_count 函数
    console.log('\n2. 测试 decrement_like_count 函数:');
    try {
      const { data, error } = await supabase.rpc('decrement_like_count', { 
        post_id: '491dbb1c-5a7b-40ab-8557-b2ebd821605a' // 使用一个测试帖子ID
      });
      
      if (error) {
        console.error('decrement_like_count 函数不存在或出错:', error);
      } else {
        console.log('decrement_like_count 函数执行成功:', data);
      }
    } catch (err) {
      console.error('调用 decrement_like_count 时出错:', err);
    }
    
    // 3. 检查 increment_view_count 函数
    console.log('\n3. 测试 increment_view_count 函数:');
    try {
      const { data, error } = await supabase.rpc('increment_view_count', { 
        post_id: '491dbb1c-5a7b-40ab-8557-b2ebd821605a' // 使用一个测试帖子ID
      });
      
      if (error) {
        console.error('increment_view_count 函数不存在或出错:', error);
      } else {
        console.log('increment_view_count 函数执行成功:', data);
      }
    } catch (err) {
      console.error('调用 increment_view_count 时出错:', err);
    }
    
    // 4. 检查当前帖子的点赞数
    console.log('\n4. 检查当前帖子的点赞数:');
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('id, title, like_count')
      .eq('id', '491dbb1c-5a7b-40ab-8557-b2ebd821605a')
      .single();
    
    if (postError) {
      console.error('获取帖子数据失败:', postError);
    } else {
      console.log('帖子数据:', postData);
    }
    
    // 5. 检查点赞记录
    console.log('\n5. 检查点赞记录:');
    const { data: likeData, error: likeError } = await supabase
      .from('interactions')
      .select('*')
      .eq('target_type', 'post')
      .eq('target_id', '491dbb1c-5a7b-40ab-8557-b2ebd821605a')
      .eq('interaction_type', 'like');
    
    if (likeError) {
      console.error('获取点赞记录失败:', likeError);
    } else {
      console.log(`找到 ${likeData?.length || 0} 条点赞记录:`);
      likeData?.forEach(like => {
        console.log(`- 用户ID: ${like.user_id}, 点赞时间: ${like.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

testLikeFunctions();