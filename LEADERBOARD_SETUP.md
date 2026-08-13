# 匿名云端排行榜部署说明

本项目使用 Supabase，适合 GitHub Pages 这类纯静态站点。前端只使用 **Project URL** 和 **anon public key**；这两项可公开。绝不可使用或提交 `service_role` 密钥。

## 1. 创建数据库

1. 登录 [Supabase](https://supabase.com/)，新建一个项目。
2. 进入 **SQL Editor**，粘贴并执行仓库根目录的 `supabase-schema.sql`。
3. 该脚本会启用 RLS。访客不能直接读写数据，只能执行经过校验的两个排行榜函数。

## 2. 配置网页

在 Supabase 的 **Project Settings → API** 找到：

- Project URL
- anon / public key

编辑 `leaderboard-config.js`：

```js
window.__JOURNEY_LEADERBOARD_CONFIG__ = {
  supabaseUrl: "https://你的项目ID.supabase.co",
  supabaseAnonKey: "eyJ...",
  gameVersion: "v9"
};
```

保存并推送到 GitHub 的 `main` 分支。GitHub Pages 自动发布后，用户在第 9 幕结尾即可匿名提交并查看排名。

## 数据与防刷规则

- 保存：随机匿名设备 ID、可选昵称、体力/从容/准备/默契、总分、版本、完成时间。
- 不保存：姓名、手机号、邮箱或任何登录资料。
- 每个匿名设备在同一游戏版本仅保留一条记录；数据库同时校验每项分数范围为 0–100。
- 排名按总分降序；同分按较早完成时间优先；显示前 100 名，且额外返回当前用户的实际排名。

匿名机制无法完全阻止清除浏览器数据后重新参与；如需更强的反刷能力，应在 Supabase Edge Function 前加入 CAPTCHA 或账户验证。
