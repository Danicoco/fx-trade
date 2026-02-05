import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as entities from './entities';

dotenv.config();

const isCli = !!process.argv.find(
  (arg) => arg.includes('migration') || arg.includes('typeorm'),
);

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities,
  migrations: isCli ? ['libs/typeorm/src/migrations/*.ts'] : [],
  synchronize: false,
  logging: false,
  ssl: {
    rejectUnauthorized: true,
  },
};

const AppDataSource = new DataSource(dataSourceOptions);

AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');
  })
  .catch((err) => {
    console.error(
      'Error during Data Source initialization',
      JSON.stringify(err),
    );
  });

export default AppDataSource;
