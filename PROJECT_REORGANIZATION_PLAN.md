# 项目文件重组计划

## 📁 当前问题分析

项目根目录存在大量临时文件、调试脚本和文档，需要重新组织以提高可维护性。

## 🗂️ 重组方案

### 1. 创建专用目录结构

```
forum/
├── src/                    # 源代码目录（保持不变）
├── scripts/                # 脚本文件目录
│   ├── database/           # 数据库相关脚本
│   ├── deployment/         # 部署脚本
│   └── utils/              # 工具脚本
├── docs/                   # 文档目录
│   ├── setup/             # 设置文档
│   ├── troubleshooting/    # 故障排除文档
│   └── api/                # API文档
├── tests/                  # 测试文件目录
├── config/                 # 配置文件目录
└── temp/                   # 临时文件目录（可删除）
```

### 2. 文件分类迁移计划

#### 脚本文件 → scripts/
- `check-rls-status.js` → `scripts/database/check-rls-status.js`
- `direct-rls-fix.js` → `scripts/database/direct-rls-fix.js`
- `fix-rls-immediate.js` → `scripts/database/fix-rls-immediate.js`
- `test-registration.js` → `scripts/tests/test-registration.js`
- `execute-migration.js` → `scripts/database/execute-migration.js`

#### 文档文件 → docs/
- `IMMEDIATE_RLS_FIX_GUIDE.md` → `docs/troubleshooting/rls-fix-guide.md`
- `REGISTRATION_FIX_SUMMARY.md` → `docs/troubleshooting/registration-fix.md`
- `SUPABASE_RLS_FIX_GUIDE.md` → `docs/setup/supabase-rls-setup.md`
- `SUPABASE_CONNECTION_GUIDE.md` → `docs/setup/supabase-connection.md`
- `SUPABASE_SETUP.md` → `docs/setup/supabase-setup.md`

#### 临时/调试文件 → temp/（可删除）
- `check-api-key.mjs`
- `check-posts-table.mjs`
- `debug-comment-ui.mjs`
- `direct-sql-fix.js`
- `fix-project-id.mjs`
- `fix-rls-cjs.js`
- `fix-rls-policies.js`
- `setup-database.mjs`
- `supabase-test.html`
- `test-comment-function.mjs`
- `test-connection.js`
- `test-connection.mjs`
- `test-dns.mjs`
- `test-new-connection.mjs`

### 3. 保留的重要文件

#### 根目录保留文件
- `package.json` - 项目配置
- `package-lock.json` - 依赖锁定
- `index.html` - 入口文件
- `vite.config.ts` - 构建配置
- `tsconfig.json` - TypeScript配置
- `.env` - 环境变量
- `.gitignore` - Git忽略规则
- `README.md` - 项目说明
- `需求文档.md` - 需求文档

#### src/目录结构（保持不变，已良好组织）
- `components/` - Vue组件
- `views/` - 页面视图
- `stores/` - 状态管理
- `services/` - 服务层
- `utils/` - 工具函数
- `router/` - 路由配置
- `types/` - 类型定义

## 🚀 执行步骤

### 第一步：创建目录结构
```bash
mkdir scripts docs tests config temp
mkdir scripts/database scripts/deployment scripts/utils
docs/setup docs/troubleshooting docs/api
```

### 第二步：移动文件
按照上述分类方案移动文件到对应目录

### 第三步：更新引用路径
检查并更新可能存在的文件引用

### 第四步：清理临时文件
确认功能正常后删除temp/目录

## ✅ 重组后的优势

1. **清晰的结构** - 文件按功能分类，易于查找
2. **易于维护** - 相关文件集中管理
3. **减少混乱** - 根目录保持整洁
4. **便于扩展** - 新增文件有明确位置
5. **团队协作** - 标准化的目录结构

## ⚠️ 注意事项

- 移动文件前确保没有运行中的进程
- 更新package.json中的脚本路径（如果需要）
- 检查Vite配置中的路径引用
- 保留.gitignore规则

## 📋 验证清单

- [ ] 创建所有必要的目录
- [ ] 移动脚本文件到scripts/
- [ ] 移动文档文件到docs/
- [ ] 移动临时文件到temp/
- [ ] 验证应用功能正常
- [ ] 更新相关配置文件
- [ ] 清理temp/目录（可选）