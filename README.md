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

## Live demo

Take a look at the live demo at https://smuggler.brian-dlee.dev. 

The code is in the [demo directory](demo).

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

### Execute `smuggler prepare` during your CI's build phase

All necessary variables must be available during the build phase. With Vercel's CLI you can use `-b` or `--build-env`
to create them for the build phase only.

Most deployments might happen solely on Vercel's end with a Git integration, but this won't work if you have environment
variables exceeding 4KB because there is no where to add them unless they are in version control. If you are
venturing down this avenue you've probably found you need to run custom CI calling Vercel's CLI when necessary.
`prepare` should be used during this phase prior to calling Vercel's CLI to commence the build.

This step creates the encrypted data in the intermediate storage location.

```shell
npx -y @briandlee/smuggler prepare
```

### Add `smuggler create` to your build phase

This step copies configuration from the intermediate storage location to the build storage location

A good place for this is in `prebuild` in your `package.json`.

```json
  "scripts": {
    "prebuild": "smuggler create",
```

> I also add it to `predev` to assist developers.

### Load the configuration at runtime

The data is pre-processed into source code at build time (when smuggler create is ran). Calling read will call this
compiled loader, decode the data and return it. In many cases, you may want to cache this result so you do not end
up decoding data multiple times during your apps execution unless you are worried about the vulnerability of holding
secret data in memory or if your config data is really large.

Your key and iv values must be available for read to work.

```typescript
import { read, withDefaultReadOptions } from '@briandlee/smuggler';

const data = read(withDefaultReadOptions({ 
  key: process.env.VERCEL_ENCRYPTION_KEY, 
  iv: process.env.VERCEL_ENCRYPTION_IV 
}));
```

### The author's use case

See the [example](example/prisma-app) for an illustration for how the package is designed to be used.

## Caveats

- At the time of writing this, I'm using Remix. If you are using another framework that uses a different build system 
  you encounter a situation where the smuggler data is pruned from the final build (maybe in the case of Next.js and 
  their use of [nft](https://github.com/vercel/nft)).

## TODO

 - [ ] Support additional encryption methods

----

Made by [me](https://brian-dlee.dev).
