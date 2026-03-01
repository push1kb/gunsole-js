import chalk from "chalk";
import { gunsole } from "./client.js";
import { getBucketColor, levelColors } from "./format.js";
import { buckets, logs } from "./logs.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const delaySec = Number.parseFloat(args[0] ?? "0");

  console.log();
  console.log(chalk.bold("  ⚡ Log Blaster"));
  console.log(
    chalk.dim(
      `  ${logs.length} logs · ${buckets.length} buckets · mode: local`
    )
  );
  if (delaySec > 0) {
    console.log(chalk.dim(`  delay: ${delaySec}s between logs`));
  }
  console.log(chalk.dim(`  ${"─".repeat(56)}`));
  console.log();

  for (let i = 0; i < logs.length; i++) {
    const { level, bucket, message, context, tags } = logs[i];
    const opts = { bucket, message, context, tags };

    switch (level) {
      case "info":
        gunsole.info(opts);
        break;
      case "debug":
        gunsole.debug(opts);
        break;
      case "warn":
        gunsole.warn(opts);
        break;
      case "error":
        gunsole.error(opts);
        break;
    }

    const levelStr = level.toUpperCase() as keyof typeof levelColors;
    const colorLevel = levelColors[levelStr];
    const colorBucket = getBucketColor(bucket, buckets);
    const num = chalk.dim(String(i + 1).padStart(3));

    console.log(
      `  ${num}  ${colorLevel(levelStr.padEnd(5))}  ${colorBucket(bucket.padEnd(14))} ${message}`
    );

    if (delaySec > 0 && i < logs.length - 1) {
      await sleep(delaySec * 1000);
    }
  }

  console.log();
  console.log(chalk.dim("  Flushing remaining logs..."));
  try {
    await gunsole.flush();
    console.log(
      `${chalk.green.bold("  ✔ Done!")}${chalk.dim(" All 100 logs sent.")}`
    );
  } catch (err) {
    console.error(chalk.red.bold("  ✖ Flush failed:"), err);
  }
  console.log();
  gunsole.destroy();
}

main();
