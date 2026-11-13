#!/usr/bin/env node
import { run } from '@bunelix/cli';
const args = process.argv.slice(2);
await run(['new', ...args]);
