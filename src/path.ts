import { resolve as defaultResolve } from 'path';

function inVendor(): boolean {
  return /node_modules[\\/]@briandlee[\\/]smuggler$/.test(defaultResolve());
}

export function resolve(...segments: string[]): string {
  return inVendor() ? defaultResolve('..', '..', '..', ...segments) : defaultResolve(...segments);
}

export function resolveResourceFile(...segments: string[]): string {
  return inVendor()
    ? defaultResolve(...segments)
    : defaultResolve('node_modules', '@briandlee', 'smuggler', ...segments);
}
