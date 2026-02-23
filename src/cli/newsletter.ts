import type { AppConfig } from "./types";
import { dispatchDueNewsletterRuns } from "../lib/api/newsletter";

export const newsletterDispatchDue = async (config: AppConfig): Promise<{ dispatched: number }> => {
  const prevDb = process.env.APPCTL_DB_FILE;
  const prevEnv = process.env.APPCTL_ENV;

  process.env.APPCTL_DB_FILE = config.db.file;
  process.env.APPCTL_ENV = config.env;

  try {
    return await dispatchDueNewsletterRuns();
  } finally {
    if (prevDb === undefined) {
      delete process.env.APPCTL_DB_FILE;
    } else {
      process.env.APPCTL_DB_FILE = prevDb;
    }

    if (prevEnv === undefined) {
      delete process.env.APPCTL_ENV;
    } else {
      process.env.APPCTL_ENV = prevEnv;
    }
  }
};
