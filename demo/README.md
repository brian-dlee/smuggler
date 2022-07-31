# Smuggler Demo

## Deployment

Open a terminal and run
```sh
npm install
npm run dev
```

The `.smuggler/data.enc` has been committed in this project to ease deployment (so I don't have to build a 2-phase deployment and use Vercel's CLI). 
Normally this would be generated on demand from a `.env` file or a set of defined environment variables and the `smuggler prepare` command would
be used to create the file. I've used `smuggler prepare` to create the file. I just committed the result for demonstration purposes.

Review `app/entry.server.tsx` for an example on how to hook the smuggler data loading into the boot sequence.

Open up the home page, to see a demonstrate of the secret variables making their way to the client.
