import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './orm-config';

export const getTypeOrmModule = () => TypeOrmModule.forRoot(dataSourceOptions);
