import init from './config';

/* eslint-disable import/first */
init();

import db from './db';

export default async function (): Response {
  return json(await db.user.findOne({ where: { id: 1 } }));
}
