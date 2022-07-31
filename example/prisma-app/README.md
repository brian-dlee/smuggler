## An example using Prisma

### The quick version

1. Download environment variables or secrets from a secret storage provider
2. Preprocess variables and generate smuggler data
3. Upload the build to Vercel with smuggler data and remainder of environment variables kept as standard environment variables
4. In Vercel's build phase, copy smuggler data into node_modules (so they are kept in Serverless functions environment)
5. At runtime, use smuggler to read smuggler data

### The long version

I download all secrets from secret storage (in my case we are using [Doppler](https://www.doppler.com/)), and I split out the variables marked
as "secrets" as indicated by a prefix `VERCEL_SECRET__`. After I have each of these, as well as the encryption key and iv
(`VERCEL_ENCRYPTION_KEY` and `VERCEL_ENCRYPTION_IV`), I invoke `smuggler` to create the encrypted data using `smuggler prepare`.

At this point, I have a `.smuggler` directory in the project root (which is ignored by .gitignore) and I start the Vercel deployment using the CLI.
The CLI has a `-e` flag to supply environment variables. This is where I feed all variables without `VERCEL_SECRET__` in as `-e` options. I also
feed `VERCEL_ENCRYPTION_KEY` and `VERCEL_ENCRYPTION_IV` in as `-e` options so they are available at runtime to decode the smuggler data. Since the
`.smuggler` data is within the project and not inside the `node_modules` directory it's uploaded to Vercel.

My `package.json` includes `smuggler generate` in the `prebuild` phase. This will compile the data in `.smuggler` 
to a source file in `node_modules/.smuggler`. I do this because if the smuggler files are not considered as part of the code 
by your build system it may get left behind and will not exist when the Serverless function is executed. I got the idea from 
Prisma, in how they generate files at build time to the location `node_modules/.prisma`.

After the build completes, `.smuggler` data is now encoded inside a package in `node_modules` and is a part of the final build. 
At runtime, I chose to use delay startup by using synchronous calls to load smuggler data as soon as the function starts. It's a
good idea to consider caching calls to smuggler, so you don't decode data from encrypted files or having to do expensive
disk access more often then necessary.
