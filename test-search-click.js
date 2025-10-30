// 测试路由跳转功能
// 这个脚本模拟搜索结果的点击事件

// 模拟搜索结果数据
const mockSearchResults = [
  {
    type: 'post',
    id: '491dbb1c-5a7b-40ab-8557-b2ebd821605a',
    title: '测试帖子',
    content: '这是一个测试帖子',
    created_at: '2025-10-29T08:31:36.249254+00:00',
    updated_at: '2025-10-29T08:31:36.249254+00:00',
    user_id: '6ecaea50-f0dd-4a4b-8887-308493d8fc7a',
    username: 'testuser',
    avatar_url: null,
    level: 2,
    like_count: 2,
    comment_count: 0,
    view_count: 1,
    tags: [],
    is_pinned: false
  }
];

// 模拟 handleResultClick 函数
function handleResultClick(result) {
  console.log('handleResultClick 被调用:', result);
  
  // 检查 result 对象的结构
  console.log('result.type:', result.type);
  console.log('result.id:', result.id);
  console.log('result.title:', result.title);
  
  // 检查必需的字段
  if (!result.id) {
    console.error('❌ 错误：result.id 为空');
    return;
  }
  
  if (!result.type) {
    console.error('❌ 错误：result.type 为空');
    return;
  }
  
  // 生成路由路径
  let routePath = '';
  switch (result.type) {
    case 'post':
      routePath = `/post/${result.id}`;
      break;
    case 'user':
      routePath = `/profile/${result.user_data?.id}`;
      break;
    case 'comment':
      if (result.post_id) {
        routePath = `/post/${result.post_id}#comment-${result.id}`;
      }
      break;
    default:
      console.error('❌ 错误：未知的 result.type:', result.type);
      return;
  }
  
  if (!routePath) {
    console.error('❌ 错误：无法生成路由路径');
    return;
  }
  
  console.log('✅ 路由路径生成成功:', routePath);
  
  // 验证路由路径格式
  const validRoutes = [
    /^\/post\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    /^\/profile\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    /^\/post\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}#comment-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  ];
  
  const isValidRoute = validRoutes.some(regex => regex.test(routePath));
  if (isValidRoute) {
    console.log('✅ 路由路径格式验证通过');
  } else {
    console.error('❌ 路由路径格式验证失败:', routePath);
  }
  
  return routePath;
}

// 测试搜索结果点击
console.log('=== 测试搜索结果点击功能 ===\n');

mockSearchResults.forEach((result, index) => {
  console.log(`\n测试搜索结果 ${index + 1}:`);
  const routePath = handleResultClick(result);
  if (routePath) {
    console.log(`预期行为：跳转到 ${routePath}`);
  }
});

// 测试异常情况
console.log('\n=== 测试异常情况 ===\n');

// 测试缺少 ID 的情况
console.log('\n测试缺少 ID 的情况:');
const resultWithoutId = { ...mockSearchResults[0], id: null };
handleResultClick(resultWithoutId);

// 测试缺少 type 的情况
console.log('\n测试缺少 type 的情况:');
const resultWithoutType = { ...mockSearchResults[0], type: null };
handleResultClick(resultWithoutType);

// 测试未知 type 的情况
console.log('\n测试未知 type 的情况:');
const resultWithUnknownType = { ...mockSearchResults[0], type: 'unknown' };
handleResultClick(resultWithUnknownType);

console.log('\n测试完成！');