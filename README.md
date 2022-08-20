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

This package may also help with the common issue of injecting GOOGLE_APPLICATION_CREDENTIALS (the path to 
a Google service account credentials JSON file) or a Firebase credentials file into your application. See 
the "The author's use case" below.

## Live demo

Take a look at the live demo at https://smuggler.brian-dlee.dev. 

The code is in the [demo directory](demo).

## Getting started

```shell
npm i --save @briandlee/smuggler
```

## Config File: `.smuggler.json`

The following properties are allows in the config file. 

_Note: if neither `includeVariablePrefix` or `includeFiles` are supplied, there is nothing for Smuggler to do._

| option                             | required | description                                               |
|------------------------------------|----------|-----------------------------------------------------------|
| `encryptionKeyEnvironmentVariable` | yes      | The environment variable that contains the encryption key | 
| `encryptionIVEnvironmentVariable`  | yes      | The environment variable that contains the encryption iv  |
| `includeVariablePrefix`            | no       | A prefix used to match environment variables to smuggle   |
| `includeFiles`                     | no       | A list of files to smuggle (as base64)                    |

### `includeFiles`

Entries in `includeFiles` can take on one of two forms:

**type: `file`**

This is used for files that exist on disk somewhere. The file indicated by `path` will be
read and converted to base64 before it's encrypted into the smuggler data file under the name
indicated by `variable`. If the file does not exist or cannot be read, the operation will fail.

```typescript
interface File {
  type: "file";
  path: string;
  variable: string;
}
```

**type: `variable`**

This is used for files that exist on disk somewhere, but their path is stored in an environment variable.
The variable indicated by `name` will be read, the file it refers to will then be read, and finally it is 
converted to base64 and encrypted into the smuggler data file under the name
indicated by `variable`, if supplied, or `name` otherwise. If the variable is not defined, the file does not exist or 
the file cannot be read, the operation will fail.

```typescript
interface Variable {
  type: "variable";
  variable?: string;
  name: string;
}
```

## CLI

### Operation: `prepare`

Use `prepare` to store environment variables and files into an encrypted file that can be uploaded as part of 
your deployment.

This is part of step-1, in a 2 phase deployment. During part 1, expose sensitive variables to the build
environment where they can be read and exported in an encrypted format before being uploaded to the build system
(i.e. Vercel) to be packaged with the application during the application build phase.

### Operation: `generate`

Use `generate` to convert prepared data from phase 1 into application files that can be bundled with your application.
Without this step, the encoded variables do not become part of the application and will be shaken as part of builder
optimization. If you did not prepare the data beforehand, this step can also do both the preparation and generation.

It's important to run this step as part of the normal development process. Without the generated files that result
from this step, the application will not run if smuggler is invoked. Even an empty generated file will close 
the circuit. A common remedy is to include `smuggler generate` as part of `prestart` in your package.json.

### Operation: `read`

Use `read` to inspect the contents of data resulting from the `prepare` step. This is only used a debugging tool.

## Following the author's use case

### Creating the config file

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
  "includeVariablePrefix": "VERCEL_SECRET__",
  "includeFiles": [
    { "type": "variable", "name":  "GOOGLE_APPLICATION_CREDENTIALS", "variable": "GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON_BASE64" }
  ]
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

_Note: All variables you intend to inject into your build must be available during the `prepare` phase_

```shell
npx -y @briandlee/smuggler prepare
```

### Add `smuggler generate` to your build phase

This step copies configuration from the intermediate storage location to the build storage location

A good place for this is in `prebuild` in your `package.json`.

```json
  "scripts": {
    "prebuild": "smuggler generate",
```

> I also add it to `prestart` so the necessary files for startup with smuggler are always present.

### Load the configuration at runtime

The data is pre-processed into source code at build time (when smuggler create is ran). Calling read will call this
compiled loader, decode the data and return it. In many cases, you may want to cache this result so you do not end
up decoding data multiple times during your apps execution unless you are worried about the vulnerability of holding
secret data in memory or if your config data is really large.

Your key and iv values must be available for read to work.

```typescript
import { writeFileSync } from "fs";
import { read, withDefaultReadOptions } from '@briandlee/smuggler';
import { randomString } from "~/utils/my-random-lib"

const data = read(withDefaultReadOptions({
  key: process.env.VERCEL_ENCRYPTION_KEY,
  iv: process.env.VERCEL_ENCRYPTION_IV
}));

// Read and write my Google service account credentials
if (data.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON_BASE64) {
  const filePath = `/tmp/${randomString(64)}.json`;
  writeFileSync(
    filePath,
    Buffer.from(data.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON_BASE64, 'base64')
  );
  process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
}
```

### An Example

See the [example](example/prisma-app) for an illustration for how the package is designed to be used.

## Caveats

 - At the time of writing this, I'm using Remix (which uses esbuild). If you are using another framework that uses a 
   different build system you encounter a situation where the smuggler data is pruned from the final build (maybe in the 
   case of Next.js and their use of [nft](https://github.com/vercel/nft)).

## TODO

 - [ ] Support additional encryption methods

----

Made by [me](https://brian-dlee.dev).
