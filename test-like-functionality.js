import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLikeFunctionality() {
  try {
    console.log('=== 测试点赞功能 ===');
    
    const postId = '491dbb1c-5a7b-40ab-8557-b2ebd821605a'; // 测试帖子ID
    
    // 获取一个真实存在的用户ID
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.error('无法获取测试用户:', userError);
      return;
    }
    
    const testUserId = users[0].id;
    console.log('使用测试用户ID:', testUserId);
    
    // 1. 检查初始状态
    console.log('\n1. 检查初始状态:');
    const { data: initialPost, error: initialError } = await supabase
      .from('posts')
      .select('id, title, like_count')
      .eq('id', postId)
      .single();
    
    if (initialError) {
      console.error('获取初始状态失败:', initialError);
      return;
    }
    
    console.log('初始帖子状态:', initialPost);
    
    // 2. 添加点赞记录
    console.log('\n2. 添加点赞记录:');
    const { data: likeData, error: likeError } = await supabase
      .from('interactions')
      .insert({
        user_id: testUserId,
        target_type: 'post',
        target_id: postId,
        interaction_type: 'like'
      })
      .select();
    
    if (likeError) {
      console.error('添加点赞记录失败:', likeError);
      if (likeError.code === '23505') {
        console.log('点赞记录已存在，跳过添加步骤');
      } else {
        return;
      }
    } else {
      console.log('点赞记录添加成功:', likeData);
    }
    
    // 3. 检查点赞后的状态
    console.log('\n3. 检查点赞后的状态:');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待触发器执行
    
    const { data: afterLikePost, error: afterLikeError } = await supabase
      .from('posts')
      .select('id, title, like_count')
      .eq('id', postId)
      .single();
    
    if (afterLikeError) {
      console.error('获取点赞后状态失败:', afterLikeError);
    } else {
      console.log('点赞后帖子状态:', afterLikePost);
    }
    
    // 4. 删除点赞记录
    console.log('\n4. 删除点赞记录:');
    const { error: deleteError } = await supabase
      .from('interactions')
      .delete()
      .eq('user_id', testUserId)
      .eq('target_type', 'post')
      .eq('target_id', postId)
      .eq('interaction_type', 'like');
    
    if (deleteError) {
      console.error('删除点赞记录失败:', deleteError);
    } else {
      console.log('点赞记录删除成功');
    }
    
    // 5. 检查取消点赞后的状态
    console.log('\n5. 检查取消点赞后的状态:');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待触发器执行
    
    const { data: afterUnlikePost, error: afterUnlikeError } = await supabase
      .from('posts')
      .select('id, title, like_count')
      .eq('id', postId)
      .single();
    
    if (afterUnlikeError) {
      console.error('获取取消点赞后状态失败:', afterUnlikeError);
    } else {
      console.log('取消点赞后帖子状态:', afterUnlikePost);
    }
    
    // 6. 检查最终的点赞记录
    console.log('\n6. 检查最终的点赞记录:');
    const { data: finalLikes, error: finalLikesError } = await supabase
      .from('interactions')
      .select('*')
      .eq('target_type', 'post')
      .eq('target_id', postId)
      .eq('interaction_type', 'like');
    
    if (finalLikesError) {
      console.error('获取最终点赞记录失败:', finalLikesError);
    } else {
      console.log(`最终找到 ${finalLikes?.length || 0} 条点赞记录`);
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

testLikeFunctionality();