import { extractSecrets, mappers } from './secrets';

describe('secrets', () => {
  it('has a prefix based mapper', () => {
    expect(extractSecrets(mappers.prefix('PREFIX_'), { PREFIX_ONE: 'a', TWO: 'b' })).toEqual({
      ONE: 'a',
    });
  });
});
