/** Bunelix public API v0.1 — imports from @bunelix/core only. */
export const BUNELIX_API_VERSION = 1 as const;

export class BunelixError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'BunelixError';
  }
}

export type Environment = 'development' | 'test' | 'production';
export type Capability = 'camera' | 'filesystem' | 'geolocation' | 'notifications' | 'storage';
export type KernelState = 'created' | 'starting' | 'running' | 'stopping' | 'stopped';
export type ServiceFactory<T = unknown> = (services: ServiceContainer) => T;
const IDENTIFIER = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?$/;

function nameOf(value: string, label: string): string {
  if (!IDENTIFIER.test(value) || ['__proto__', 'constructor', 'prototype'].includes(value)) {
    throw new BunelixError(`Invalid ${label}: ${value}`, 'INVALID_NAME');
  }
  return value;
}

function versionOf(value: string): [number, number, number] {
  const match = VERSION.exec(value);
  if (!match) throw new BunelixError(`Invalid bundle version: ${value}`, 'INVALID_VERSION');
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Small, synchronous, lazy singleton DI container with cycle detection. */
export class ServiceContainer {
  private readonly factories = new Map<string, ServiceFactory>();
  private readonly instances = new Map<string, unknown>();
  private readonly resolving = new Set<string>();

  register<T>(id: string, factory: ServiceFactory<T>): void {
    nameOf(id, 'service identifier');
    if (this.factories.has(id)) throw new BunelixError(`Service already registered: ${id}`, 'DUPLICATE_SERVICE');
    this.factories.set(id, factory as ServiceFactory);
  }

  get<T>(id: string): T {
    if (this.instances.has(id)) return this.instances.get(id) as T;
    const factory = this.factories.get(id);
    if (!factory) throw new BunelixError(`Unknown service: ${id}`, 'UNKNOWN_SERVICE');
    if (this.resolving.has(id)) throw new BunelixError(`Circular service dependency: ${id}`, 'SERVICE_CYCLE');
    this.resolving.add(id);
    try {
      const result = factory(this);
      if (result instanceof Promise) throw new BunelixError(`Services must be synchronous: ${id}`, 'ASYNC_SERVICE');
      this.instances.set(id, result);
      return result as T;
    } finally {
      this.resolving.delete(id);
    }
  }

  has(id: string): boolean { return this.factories.has(id); }
  clear(): void { this.instances.clear(); this.factories.clear(); }
}

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;
export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  on<T>(event: string, handler: EventHandler<T>): () => void {
    nameOf(event, 'event');
    const set = this.handlers.get(event) ?? new Set<EventHandler>();
    set.add(handler as EventHandler);
    this.handlers.set(event, set);
    return () => { set.delete(handler as EventHandler); if (!set.size) this.handlers.delete(event); };
  }
  async emit<T>(event: string, payload: T): Promise<void> {
    await Promise.all([...this.handlers.get(event) ?? []].map(handler => handler(payload)));
  }
  clear(): void { this.handlers.clear(); }
}

export interface ScreenDefinition {
  readonly path: `/${string}`;
  readonly title: string;
  readonly mount: (root: HTMLElement) => void | (() => void) | Promise<void | (() => void)>;
}
export class ScreenRegistry {
  private readonly entries = new Map<string, ScreenDefinition>();
  add(screen: ScreenDefinition): void {
    if (!/^\/[a-z0-9/_-]*$/.test(screen.path) || screen.path.includes('//') || screen.path.includes('..')) {
      throw new BunelixError(`Invalid screen path: ${screen.path}`, 'INVALID_ROUTE');
    }
    if (this.entries.has(screen.path)) throw new BunelixError(`Duplicate screen: ${screen.path}`, 'DUPLICATE_ROUTE');
    this.entries.set(screen.path, screen);
  }
  get(path: string): ScreenDefinition | undefined { return this.entries.get(path); }
  list(): readonly ScreenDefinition[] { return [...this.entries.values()]; }
  clear(): void { this.entries.clear(); }
}

export interface BundleDependency { readonly id: string; readonly minVersion?: string; }
export interface BundleContext {
  readonly bundleId: string;
  readonly environment: Environment;
  readonly services: ServiceContainer;
  readonly events: EventBus;
  readonly screens: ScreenRegistry;
  readonly settings: Readonly<Record<string, unknown>>;
  /** Policy check only; this is NOT a JS sandbox or a native OS permission grant. */
  readonly capabilities: { require(capability: Capability): void; can(capability: Capability): boolean };
}
export interface BunelixBundle {
  readonly id: string;
  readonly version: string;
  readonly apiVersion: typeof BUNELIX_API_VERSION;
  readonly requires?: readonly BundleDependency[];
  readonly permissions?: readonly Capability[];
  register(context: BundleContext): void | Promise<void>;
  boot?(context: BundleContext): void | Promise<void>;
  shutdown?(context: BundleContext): void | Promise<void>;
}
export interface KernelOptions {
  readonly environment?: Environment;
  readonly allowedCapabilities?: readonly Capability[];
  readonly settings?: Readonly<Record<string, unknown>>;
}

function dependencySort(bundles: readonly BunelixBundle[]): BunelixBundle[] {
  const all = new Map<string, BunelixBundle>();
  for (const bundle of bundles) {
    nameOf(bundle.id, 'bundle identifier');
    versionOf(bundle.version);
    if (bundle.apiVersion !== BUNELIX_API_VERSION) {
      throw new BunelixError(`Unsupported API version in ${bundle.id}`, 'API_MISMATCH');
    }
    if (all.has(bundle.id)) throw new BunelixError(`Duplicate bundle: ${bundle.id}`, 'DUPLICATE_BUNDLE');
    all.set(bundle.id, bundle);
  }
  const visited = new Set<string>();
  const active = new Set<string>();
  const order: BunelixBundle[] = [];
  function visit(bundle: BunelixBundle): void {
    if (active.has(bundle.id)) throw new BunelixError(`Circular dependency: ${bundle.id}`, 'BUNDLE_CYCLE');
    if (visited.has(bundle.id)) return;
    active.add(bundle.id);
    for (const dep of bundle.requires ?? []) {
      const required = all.get(nameOf(dep.id, 'dependency identifier'));
      if (!required) throw new BunelixError(`Missing ${dep.id}, required by ${bundle.id}`, 'MISSING_DEPENDENCY');
      if (dep.minVersion) {
        const found = versionOf(required.version);
        const minimum = versionOf(dep.minVersion);
        if (found[0] !== minimum[0] ||
          (found[1] < minimum[1]) ||
          (found[1] === minimum[1] && found[2] < minimum[2])) {
          throw new BunelixError(`${bundle.id} needs ${dep.id} >= ${dep.minVersion} in the same major`, 'DEPENDENCY_VERSION');
        }
      }
      visit(required);
    }
    active.delete(bundle.id);
    visited.add(bundle.id);
    order.push(bundle);
  }
  for (const bundle of bundles) visit(bundle);
  return order;
}

export class BunelixKernel {
  readonly services = new ServiceContainer();
  readonly events = new EventBus();
  readonly screens = new ScreenRegistry();
  private readonly bundles: BunelixBundle[];
  private readonly contexts = new Map<string, BundleContext>();
  private booted: BunelixBundle[] = [];
  private stateValue: KernelState = 'created';
  readonly environment: Environment;

  constructor(bundles: readonly BunelixBundle[], options: KernelOptions = {}) {
    this.bundles = dependencySort(bundles);
    this.environment = options.environment ?? 'production';
    const allowed = new Set(options.allowedCapabilities ?? []);
    const settings = Object.freeze(Object.assign(Object.create(null) as Record<string, unknown>, options.settings ?? {}));
    for (const bundle of this.bundles) {
      const declared = new Set(bundle.permissions ?? []);
      const can = (capability: Capability) => declared.has(capability) && allowed.has(capability);
      this.contexts.set(bundle.id, Object.freeze({
        bundleId: bundle.id, environment: this.environment,
        services: this.services, events: this.events, screens: this.screens, settings,
        capabilities: Object.freeze({can, require(capability: Capability) {
          if (!can(capability)) throw new BunelixError(`${bundle.id} cannot use ${capability}`, 'CAPABILITY_DENIED');
        }})
      }));
    }
  }
  get state(): KernelState { return this.stateValue; }
  listBundles(): readonly { id: string; version: string }[] {
    return this.bundles.map(({id, version}) => ({id, version}));
  }
  async start(): Promise<void> {
    if (this.stateValue !== 'created') throw new BunelixError('Kernel can only start once', 'INVALID_STATE');
    this.stateValue = 'starting';
    try {
      for (const bundle of this.bundles) await bundle.register(this.contexts.get(bundle.id)!);
      for (const bundle of this.bundles) {
        // Include failing boot in rollback, since it may have acquired resources.
        this.booted.push(bundle);
        await bundle.boot?.(this.contexts.get(bundle.id)!);
      }
      this.stateValue = 'running';
    } catch (error) {
      await this.stop().catch(() => undefined);
      throw error;
    }
  }
  async stop(): Promise<void> {
    if (this.stateValue === 'stopped') return;
    if (this.stateValue === 'created') { this.stateValue = 'stopped'; return; }
    if (this.stateValue === 'stopping') return;
    this.stateValue = 'stopping';
    const errors: unknown[] = [];
    for (const bundle of [...this.booted].reverse()) {
      try { await bundle.shutdown?.(this.contexts.get(bundle.id)!); } catch (error) { errors.push(error); }
    }
    this.booted = [];
    this.events.clear(); this.screens.clear(); this.services.clear();
    this.stateValue = 'stopped';
    if (errors.length) throw new AggregateError(errors, 'One or more bundles failed to shut down');
  }
}

export function defineBundle<T extends BunelixBundle>(bundle: T): T { return bundle; }
