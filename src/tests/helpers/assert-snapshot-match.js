/* node:coverage disable */
import { access, mkdir, open, readFile, writeFile } from 'fs/promises';
import { strict as assert } from 'node:assert';

/**
 * Проверка соответствия значения снапшоту
 * 1. Проверка существования файла со снапшотом
 * 2. Если файл не существует, он создаётся и заполняется значением
 * 3. Чтение снапшота из файла и сравнение значения со снапшотом
 * @param {unknown} actual проверяемое значение
 * @param {string} filename путь к файлу со снапшотом внутри папки снапшотов
 */
export const assertSnapshotMatch = async (actual, filename) => {
  const snapshotPath = `./src/tests/snapshots/${filename}`;

  let file;
  let isSnapshotExisting = true;
  try {
    file = await open(snapshotPath);
  } catch {
    isSnapshotExisting = false;
  }

  if (!isSnapshotExisting) {
    console.log('writing snapshot:', filename);

    const dirPath = snapshotPath.split('/').slice(0, -1).join('/');
    try {
      await access(dirPath);
    } catch {
      await mkdir(dirPath, { recursive: true });
    }

    await writeFile(
      snapshotPath,
      filename.endsWith('.json') ? JSON.stringify(actual) : actual
    );
  }

  const expected = await (file ? file.readFile() : readFile(snapshotPath));
  await file?.close();

  assert.deepEqual(
    actual,
    filename.endsWith('.json') ? JSON.parse(expected) : expected,
  );
};
/* node:coverage enable */
