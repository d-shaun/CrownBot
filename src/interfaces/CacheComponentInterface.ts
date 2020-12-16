export interface CacheComponent {
  init: () => Promise<boolean>;
  check: () => Promise<boolean>;
  get: (...args: string[]) => any;
  set: (...args: any[]) => boolean;
}
