-- 为profiles表添加个性化色彩字段
ALTER TABLE profiles ADD COLUMN theme_color VARCHAR(7) DEFAULT '#1890ff';

-- 添加注释说明
COMMENT ON COLUMN profiles.theme_color IS '用户个性化主题色彩，十六进制格式，Lv.7解锁';