#!/usr/bin/env node
/**
 * scripts/fund-payment-pool.js
 * PlastiCatch — Fund the Payment Pool for Collector Payouts
 *
 * Transfers HBAR from the operator to the payment pool account.
 * Run: node scripts/fund-payment-pool.js [amount-in-hbar]
 * Default amount: 100 HBAR
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
    Client,
    PrivateKey,
    AccountId,
    TransferTransaction,
    Hbar,
    AccountBalanceQuery,
} from "@hashgraph/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

function parsePrivateKey(keyStr) {
    if (!keyStr) throw new Error("Private key not set");
    try { return PrivateKey.fromStringECDSA(keyStr); } catch { }
    try { return PrivateKey.fromStringDer(keyStr); } catch { }
    try { return PrivateKey.fromString(keyStr); } catch { }
    throw new Error("Cannot parse private key");
}

async function main() {
    const operatorIdStr = process.env.HEDERA_OPERATOR_ID;
    const operatorKeyStr = process.env.HEDERA_OPERATOR_KEY;
    const poolAccountStr = process.env.VITE_PAYMENT_POOL_ACCOUNT;

    if (!operatorIdStr || !operatorKeyStr) {
        console.error("❌  HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in .env");
        process.exit(1);
    }

    if (!poolAccountStr || poolAccountStr.includes("REPLACE")) {
        console.error("❌  VITE_PAYMENT_POOL_ACCOUNT not set. Run node scripts/init-hedera.js first.");
        process.exit(1);
    }

    const amountHbar = parseFloat(process.argv[2] || "100");
    if (isNaN(amountHbar) || amountHbar <= 0) {
        console.error("❌  Invalid amount. Usage: node scripts/fund-payment-pool.js [amount-hbar]");
        process.exit(1);
    }

    console.log("💰  PlastiCatch — Fund Payment Pool");
    console.log(`    From:   ${operatorIdStr}`);
    console.log(`    To:     ${poolAccountStr}`);
    console.log(`    Amount: ${amountHbar} HBAR\n`);

    const operatorId = AccountId.fromString(operatorIdStr);
    const operatorKey = parsePrivateKey(operatorKeyStr);
    const poolAccount = AccountId.fromString(poolAccountStr);

    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    // Check operator balance first
    const operatorBalance = await new AccountBalanceQuery()
        .setAccountId(operatorId)
        .execute(client);
    console.log(`    Operator balance: ${operatorBalance.hbars.toString()}`);

    if (operatorBalance.hbars.toBigNumber() < amountHbar) {
        console.error(`❌  Insufficient balance. Need ${amountHbar} HBAR, have ${operatorBalance.hbars.toString()}`);
        client.close();
        process.exit(1);
    }

    // Transfer HBAR to payment pool
    const tx = new TransferTransaction()
        .addHbarTransfer(operatorId, new Hbar(-amountHbar))
        .addHbarTransfer(poolAccount, new Hbar(amountHbar))
        .setTransactionMemo("PlastiCatch Payment Pool Fund");

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);

    console.log(`\n✅  Transfer successful!`);
    console.log(`    Transaction ID: ${response.transactionId}`);
    console.log(`    Status:         ${receipt.status}`);

    // Check pool balance after funding
    const poolBalance = await new AccountBalanceQuery()
        .setAccountId(poolAccount)
        .execute(client);
    console.log(`    Pool balance now: ${poolBalance.hbars.toString()}`);

    client.close();
    console.log("\n🎉  Payment pool funded! Next: npm run deploy:contracts");
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
