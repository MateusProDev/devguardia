import { SetMetadata } from '@nestjs/common';

export const QUEUE_TOKEN = (name: string) => `BullQueue_${name}`;

export const InjectQueue = (name: string) =>
  (target: any, key: string | symbol, index: number) => {
    const existing = Reflect.getMetadata('self:paramtypes', target) || [];
    existing[index] = QUEUE_TOKEN(name);
    Reflect.defineMetadata('self:paramtypes', existing, target);
  };
