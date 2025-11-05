import { DataSource } from 'typeorm';
import { User } from './auth/entities/user.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'auth_db',
  entities: [User],
  migrations: ['dist/migrations/*.js'],
  subscribers: [],
  synchronize: false,
  logging: false,
  migrationsRun: true,
});
