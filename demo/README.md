# Smuggler Demo

## Deployment

Open a terminal and run
```sh
npm install
npm run dev
```

The `.smuggler/data.enc` has been committed in this project to ease deployment. Normally this would be generated on demand from a
`.env` file or a set of defined environment variables.

Review `app/entry.server.tsx` for an example on how to hook the smuggler data loading into the boot sequence.

Open up the home page, to see a demonstrate of the secret variables making their way to the client.
