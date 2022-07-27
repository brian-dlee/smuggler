# Smuggler

Smuggle encrypted environment variables into your deployment.

## Why?

Vercel has a 4KB restriction to the total size of all environment variables. This limitation is especially
troublesome if you use Firebase or Google service account authentication or if you require SSL certificates
as part of your production application (such as with Google Cloud SQL and Prisma).

https://vercel.com/support/articles/how-do-i-workaround-vercel-s-4-kb-environment-variables-limit

This problem and workaround are well-advertised on several issues in GitHub and a support article provided directly
by Vercel. The recommended work around feels hacky to introduce into your code. Furthermore, depending on your
build system an actual `import` might be required in order for the build process to not leave the configuration
files behind when the final product is uploaded.

In an attempt to address this with my own organization and provide a stable solution for others to use, `smuggler`
was created.

## Getting started

```shell
npm i --save @briandlee/smuggler
```

### Create your config file

In my case, I prefix variables I want to feed into `smuggler` with `VERCEL_SECRET__`, and I store the `key` and `iv`
parameters for encryption/decryption in the variables `VERCEL_ENCRYPTION_KEY` and `VERCEL_ENCRYPTION_IV` as recommended
in the support article. If you are using this for Vercel you might want to follow the instructions for creating these
variables as outlined in the article. I've retained the encryption algorithm recommended there which requires the `key`
and `iv` parameters to be 16 character secrets.

> The algorithm used in the project can be configured, but the project has not been tailored for those customizations.
> So make sure you generate your secrets accordingly.

```json
{
  "encryptionKeyEnvironmentVariable": "VERCEL_ENCRYPTION_KEY",
  "encryptionIVEnvironmentVariable": "VERCEL_ENCRYPTION_IV",
  "includeVariablePrefix": "VERCEL_SECRET__"
}
```

### Execute `smuggler create` during your build phase

All necessary variables must be available during the build phase. With Vercel's CLI you can use `-b` or `--build-env`
to create them for the build phase only.

> Most deployments might happen solely on Vercel's end with a Git integration, but the execution is broken into 2 phases
> so it can be executed in multiple phase if necessary

This step creates the encrypted data in the intermediate storage location.

```shell
npx -y @briandlee/smuggler create
```

### Add `smuggler copy` to your build phase

This step copies configuration from the intermediate storage location to the build storage location

A good place for this is in `prebuild` in your `package.json`.

```json
  "scripts": {
    "prebuild": "smuggler copy",
```

### Load the configuration at startup

**Synchronous**

These APIs are available if you need to load secrets when the serverless function starts up and need to access
variables synchronously. In the case of Prisma, the variables will need to be read and written to tmp files immediately 
so the instance is prepared to handle any incoming requests.

```typescript
import { readSync, withDefaultReadOptions } from '@briandlee/smuggler';

const data = readSync(withDefaultReadOptions({ 
  key: process.env.VERCEL_ENCRYPTION_KEY, 
  iv: process.env.VERCEL_ENCRYPTION_IV 
}));
```

**Asynchronous**

If you are serving configuration to your frontend, you'll likely hook up to an API endpiont. In this case (and probably most cases),
when you want to avoid synchronous calls and these functions can be used. 

```typescript
import { read, withDefaultReadOptions } from '@briandlee/smuggler';

async function handle() {
  return json(
    await read(withDefaultReadOptions({
      key: process.env.VERCEL_ENCRYPTION_KEY,
      iv: process.env.VERCEL_ENCRYPTION_IV
    }))
  );
}
```
   
### The author's use case

See the [example](example/prisma-app) for an illustration for how the package is designed to be used.

## Caveats

- At the time of writing this, I'm using Remix. If you are using another framework that uses a different build system 
  you encounter a situation where the smuggler data is pruned from the final build (maybe in the case of Next.js and 
  their use of [nft](https://github.com/vercel/nft)).
- I'm using the Vercel CLI to deploy my builds instead of a git-based trigger. I like the control this provides when 
  linking to the rest of my organizations CI. If you use a git-based trigger and don't have a place to pre-process your 
  environment variables it should still work, but you'll probably find that the 2-step (create then copy) steps are unnecessary. 
  I've added a TODO to the project that I can add if someone else finds use of this project.

## TODO

 - [ ] Make intermediate phase optional
 - [ ] Support additional encryption methods
