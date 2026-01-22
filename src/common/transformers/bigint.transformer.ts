import { ValueTransformer } from 'typeorm';

export const BigIntTransformer: ValueTransformer = {
  to: (value: bigint | number) => (value ? value.toString() : value),
  from: (value: string) => (value ? BigInt(value) : value),
};
