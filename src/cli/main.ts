import { runCli } from "./run-cli";

const argv = process.argv.slice(2);

runCli(argv).then((exitCode) => {
  process.exitCode = exitCode;
});
