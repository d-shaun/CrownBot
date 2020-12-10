export interface CacheComponent {
  init: () => Promise<boolean>;
  check: () => Promise<boolean>;
  get: (...args: string[]) => string;
  set: (...args: string[]) => boolean;
}
