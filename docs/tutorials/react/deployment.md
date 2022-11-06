# Deployment

Let's deploy the todo app to [Heroku](https://www.heroku.com/).

## Connect to Postgres
Up until now, the todo app has been using a plain JSON file to store the list of tasks. **In production, we'd like to use a `Postgres` database table instead.**

1. Install `postgres-node` ("pg").

```sh
npm i pg
npm i --save-dev @types/pg
```

2. Adding the highlighted code to the `api` server module.

*src/server/api.ts*
```ts{5,8-12}
import { remultExpress } from "remult/remult-express";
import { Task } from "../shared/Task";
import { TasksController } from "../shared/TasksController";
import { AuthController } from "../shared/AuthController";
import { createPostgresConnection } from "remult/postgres";

export const api = remultExpress({
   dataProvider: async () => {
      if (process.env["NODE_ENV"] === "production")
            return createPostgresConnection({ configuration: "heroku" });
      return undefined;
   },
   entities: [Task],
   controllers: [TasksController, AuthController],
   initApi: async remult => {
      const taskRepo = remult.repo(Task);
      if (await taskRepo.count() === 0) {
            await taskRepo.insert([
               { title: "Task a" },
               { title: "Task b", completed: true },
               { title: "Task c" },
               { title: "Task d" },
               { title: "Task e", completed: true }
            ]);
      }
   }
});
```

The `{ configuration: "heroku" }` argument passed to Remult's `createPostgresConnection()` tells Remult to use the `DATABASE_URL` environment variable as the `connectionString` for Postgres. (See [Heroku documentation](https://devcenter.heroku.com/articles/connecting-heroku-postgres#connecting-in-node-js).)

In development, the `dataProvider` function returns `undefined`, causing Remult to continue to use the default JSON-file database.

::: tip Learn more
See [documentation](../../docs/databases.md) for the (long) list of relational and non-relational databases Remult supports.
:::

## Prepare for Production

In this tutorial, we'll deploy both the React app and the API server as [one server-side app](https://create-react-app.dev/docs/deployment/#other-solutions), and redirect all non-API requests to return the React app.

In addition, to follow a few basic production best practices, we'll use [compression](https://www.npmjs.com/package/compression) middleware to improve performance, [helmet](https://www.npmjs.com/package/helmet) middleware for security, and redirect all non-HTTPS requests to HTTPS using [heroku-ssl-redirect](https://www.npmjs.com/package/heroku-ssl-redirect).

1. Install `compression`, `helmet` and `heroku-ssl-redirect`.

```sh
npm i compression helmet heroku-ssl-redirect
npm i @types/compression --save-dev
```

2. Add the highlighted code lines to `src/server/index.ts`, and modify the `app.listen` function's `port` argument to prefer a port number provided by the production host's `PORT` environment variable.

*src/server/index.ts*
```ts{4-7,10-12,20-23,25}
import express from 'express';
import { api } from './api';
import { expressjwt } from 'express-jwt';
import helmet from 'helmet';
import compression from 'compression';
import sslRedirect from 'heroku-ssl-redirect';
import path from 'path';

const app = express();
app.use(sslRedirect());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(expressjwt({
      secret: process.env['JWT_SECRET'] || "my secret",
      credentialsRequired: false,
      algorithms: ['HS256']
}));
app.use(api);

app.use(express.static(path.join(__dirname, '../../build')));
app.get('/*', function (req, res) {
   res.sendFile(path.join(__dirname, '../../build', 'index.html'));
});

app.listen(process.env["PORT"] || 3002, () => console.log("Server started"));
```

3. Add the highlighted lines to the server's TypeScript configuration file, to prepare it for production builds using TypeScript:

*tsconfig.server.json*
```json{6-11}
{
   "extends": "./tsconfig.json",
   "compilerOptions": {
      "module": "commonjs",
      "emitDecoratorMetadata": true,
      "noEmit": false,
      "outDir": "dist"
   },
   "include": [
      "src/server/index.ts"
   ]
}
```

4. Add the `dist` folder to the `.gitignore` file.

*.gitignore*
```
/dist
```

5. Modify the project's `build` npm script to additionally transpile the API server's TypeScript code to JavaScript (using `tsc`).

*package.json*
```json
"build": "react-scripts build && tsc -p tsconfig.server.json"
```

6. Modify the project's `start` npm script to start the production Node.js server.

*package.json*
```json
"start": "node dist/server/"
```

The todo app is now ready for deployment to production.

## Deploy to Heroku

In order to deploy the todo app to [heroku](https://www.heroku.com/) you'll need a `heroku` account. You'll also need [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) and [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#download-and-install) installed.

1. Create a Heroku `app`.

```sh
heroku create
```

2. Set the jwt authentication to something random - you can use an [online UUID generator](https://www.uuidgenerator.net/).

```sh
heroku config:set JWT_SECRET=random-secret
```

3. Provision a dev postgres database on Heroku.

```sh
heroku addons:create heroku-postgresql:hobby-dev
```

4. Commit the changes to git and deploy to Heroku using `git push`.

```sh
git add .
git commit -m "todo app tutorial"
git push heroku master
```

5. Open the deployed app using `heroku apps:open` command.

```sh
heroku apps:open
```

::: warning Note
If you run into trouble deploying the app to Heroku, try using Heroku's [documentation](https://devcenter.heroku.com/articles/git).
:::

That's it - our application is deployed to production, play with it and enjoy.

To see a larger more complex code base, visit our [CRM example project](https://www.github.com/remult/crm-demo)

Love Remult?&nbsp;<a href="https://github.com/remult/remult" target="_blank" rel="noopener"> Give our repo a star.⭐</a>
