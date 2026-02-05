import { exec } from 'child_process';

const argv = process.argv.slice(2);
const subcommand = argv[0];
const migrationName = argv[1];

if (subcommand !== 'migration:revert' && !migrationName) {
  console.error('Please provide a migration name');
  process.exit(1);
}

const migrationsDir = 'libs/typeorm/src/migrations';

const dataSource = 'libs/typeorm/src/orm-config.ts';

const subcommandsMap = {
  'migration:generate': `ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate ${migrationsDir}/${migrationName} -d ${dataSource}`,
  'migration:create': `ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:create ${migrationsDir}/${migrationName}`,
  'migration:revert': `ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:revert -d ${dataSource}`,
};

const command = subcommandsMap[subcommand as keyof typeof subcommandsMap];

if (!command) {
  console.error('Invalid subcommand');
  process.exit(1);
}

console.log(command);

const cmd = exec(command);
cmd.stdout?.pipe(process.stdout);
cmd.stderr?.pipe(process.stderr);
