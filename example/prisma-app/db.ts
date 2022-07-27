import { PrismaClient } from '@prisma/client';

const {
  APP_DB_USER: user,
  APP_DB_PASSWORD: password,
  APP_DB_HOST: host,
  APP_DB_PORT: port,
  APP_DB_NAME: db,
  APP_DB_SSL_P12_FILE: p12,
  APP_DB_SSL_SERVER_CA_FILE: ca,
  APP_DB_SSL_P12_PASSPHRASE: p12Passphrase,
} = process.env;

export default new PrismaClient({
  datasources: {
    db: {
      url: `mysql://${user}:${password}@${host}:${port}/${db}?sslidentity=${p12}&sslcert=${ca}&sslpassword=${p12Passphrase}`,
    },
  },
});
