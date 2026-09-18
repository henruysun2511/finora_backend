import { DataSource } from 'typeorm';
import { DatabaseConfig } from '../config/database.config';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: DatabaseConfig.URL,
  ssl:
    DatabaseConfig.URL.includes('sslmode=require') ||
    DatabaseConfig.URL.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
