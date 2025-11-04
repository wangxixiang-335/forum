-- 为profiles表添加个性签名字段
ALTER TABLE profiles ADD COLUMN signature TEXT;

-- 添加注释说明
COMMENT ON COLUMN profiles.signature IS '用户个性签名，Lv.5解锁';