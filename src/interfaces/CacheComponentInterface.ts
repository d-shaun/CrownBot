export interface CacheComponent {
  init: () => Promise<boolean>;
  check: () => Promise<boolean>;
  get: (...args: string[]) => any | Promise<any>;
  set: (...args: any[]) => boolean | Promise<boolean>;
}
