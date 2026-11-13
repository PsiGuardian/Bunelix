import type { BunelixBundle } from '@bunelix/core';
import { WelcomeBundle } from './welcome.js';
import { CounterBundle } from './counter.js';
export const bundles: BunelixBundle[] = [WelcomeBundle, CounterBundle];
