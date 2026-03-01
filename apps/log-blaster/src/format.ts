import chalk from "chalk";

const levelColors = {
  INFO: chalk.cyan,
  DEBUG: chalk.gray,
  WARN: chalk.yellow,
  ERROR: chalk.red,
} as const;

const bucketColors = [
  chalk.magenta,
  chalk.blue,
  chalk.green,
  chalk.yellowBright,
  chalk.cyanBright,
  chalk.redBright,
  chalk.magentaBright,
  chalk.blueBright,
  chalk.greenBright,
  chalk.white,
];

function getBucketColor(bucket: string, buckets: string[]) {
  const idx = buckets.indexOf(bucket);
  return bucketColors[idx % bucketColors.length];
}

export { levelColors, getBucketColor };
