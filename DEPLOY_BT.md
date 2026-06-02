# 宝塔部署说明

这个项目是单体 `Next.js` 应用：

- 页面由 `Next.js` 提供
- 后端接口就是同一进程下的 `app/api/*`
- 生产环境只需要启动一个服务，监听 `127.0.0.1:3003`

## 1. 环境准备

- Node.js `18.18+`，建议 Node.js `20`
- `pnpm` `10`

安装依赖：

```bash
pnpm install
```

## 2. 环境变量

参考 [.env.example](/root/ICPC-Camp-Registration-Form/.env.example) 创建生产环境变量：

```env
ADMIN_PASSWORD=你的后台密码
ADMIN_SESSION_SECRET=一段随机长字符串
WEBHOOK_SECRET=wh_secret_change_me
DB_PATH=./data/registrations.db
```

`ADMIN_SESSION_SECRET` 必须单独设置，生产环境不要继续使用默认值。

## 3. 构建

```bash
pnpm build
```

构建后推荐直接用下面的方式启动：

```bash
pnpm start:3003
```

## 4. 宝塔 Node 项目配置

如果你用宝塔的 Node 项目管理，推荐：

- 项目目录：项目根目录
- 启动命令：`pnpm start:3003`
- 运行端口：`3003`
- 运行地址：`127.0.0.1`
- 部署前命令：`pnpm install && pnpm build`

如果你用 PM2，也可以直接加载 [ecosystem.config.cjs](/root/ICPC-Camp-Registration-Form/ecosystem.config.cjs)。

## 5. 反向代理

因为 `/api` 也是同一个 Next 服务提供，所以域名整体反代到 `127.0.0.1:3003` 即可。

如果你想显式把后端写成 `/api` 反代，可以用下面这份 Nginx 示例：

```nginx
server {
    listen 80;
    server_name icpc.lijie.space;

    client_max_body_size 20m;

    location /api/ {
        proxy_pass http://127.0.0.1:3003/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

更简单的做法是只保留一个 `location /`，同样能正常访问 `/api/*`。

## 6. 生产注意事项

- 后台鉴权现在使用服务端 Cookie，会读取 `ADMIN_PASSWORD`
- 不要再使用 `NEXT_PUBLIC_ADMIN_PASSWORD`
- SQLite 数据库文件默认在 `data/registrations.db`
- 升级代码后需要重新执行 `pnpm build`
- 当前项目依赖 `better-sqlite3`，生产环境优先使用 `pnpm start:3003`，不要优先走 `standalone`
