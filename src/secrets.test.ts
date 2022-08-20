import { rm, writeFile } from 'fs/promises';
import { extractSecrets, getFilesAsSecrets, mappers } from './secrets';

describe('secrets', () => {
  it('has a prefix based mapper', () => {
    expect(extractSecrets(mappers.prefix('PREFIX_'), { PREFIX_ONE: 'a', TWO: 'b' })).toEqual({
      ONE: 'a',
    });
  });

  describe('file secrets', () => {
    beforeEach(async () => {
      await writeFile('file1.txt', Buffer.from('file1.txt content'));
      await writeFile('file2.txt', Buffer.from('file2.txt content'));
    });

    afterEach(async () => {
      await rm('file1.txt');
      await rm('file2.txt');
    });

    it('handles file secrets as environment variables', async () => {
      expect(
        await getFilesAsSecrets(
          [
            { type: 'variable', name: 'MY_VAR', variable: undefined },
            { type: 'variable', name: 'MY_VAR_2', variable: 'NEW_VAR_2' },
          ],
          { MY_VAR: 'file1.txt', MY_VAR_2: 'file2.txt' }
        )
      ).toEqual({
        MY_VAR: Buffer.from('file1.txt content').toString('base64'),
        NEW_VAR_2: Buffer.from('file2.txt content').toString('base64'),
      });
    });

    it('handles file secrets as file paths', async () => {
      expect(
        await getFilesAsSecrets([{ type: 'file', path: 'file1.txt', variable: 'MY_VAR' }], {})
      ).toEqual({
        MY_VAR: Buffer.from('file1.txt content').toString('base64'),
      });
    });
  });
});
