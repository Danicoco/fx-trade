import { MigrationInterface, QueryRunner } from "typeorm";

export class WalletBalances1770284786191 implements MigrationInterface {
    name = 'WalletBalances1770284786191'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "wallet-balances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "wallet" uuid NOT NULL, "currency" character varying NOT NULL DEFAULT 'NGN', "balance" numeric(10,2) NOT NULL, "ledgerBalance" numeric(10,2) NOT NULL, CONSTRAINT "PK_0c99116db889e22b8d66451dfcc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "promo"`);
        await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "balance"`);
        await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "promoBalance"`);
        await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "lastTransactionId"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "referredBy" uuid`);
        await queryRunner.query(`ALTER TABLE "wallets" ADD "status" character varying NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "provider" character varying`);
        await queryRunner.query(`ALTER TABLE "withdrawal_requests" ADD "isAutoWithdrawn" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "firstName" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "lastName" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "phoneNumber" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "fee" SET DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "fee" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "phoneNumber" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "lastName" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "firstName" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "withdrawal_requests" DROP COLUMN "isAutoWithdrawn"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "provider"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referredBy"`);
        await queryRunner.query(`ALTER TABLE "wallets" ADD "lastTransactionId" character varying`);
        await queryRunner.query(`ALTER TABLE "wallets" ADD "promoBalance" numeric(10,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "wallets" ADD "balance" numeric(10,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "promo" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "username" character varying NOT NULL`);
        await queryRunner.query(`DROP TABLE "wallet-balances"`);
    }

}
