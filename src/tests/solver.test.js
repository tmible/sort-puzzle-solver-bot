/* node:coverage disable */
import { readFile } from 'fs/promises';
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { Worker } from 'worker_threads';
import { DefaultEmptyFlasksNumber } from '../constants/default-empty-flasks-number.const.js';
import { MaxEmptyFlasksNumber } from '../constants/max-empty-flasks-number.const.js';
import { SolvingMethod } from '../constants/solving-method.const.js';
import { assertSnapshotMatch } from './helpers/assert-snapshot-match.js';
import { generatePuzzle } from './helpers/puzzle-generator.js';
import { Puzzle } from '../puzzle.js';
import { getRandomIntInclusive } from '../utils.js';

describe('solver', async () => {
  for (let i = 0; i < 9; ++i) {
    const testCase = JSON.parse(await readFile(`./src/tests/inputs/solver/${i}.json`));
    it(
      `should pass test case "${testCase.name}" using ${testCase.solvingMethod} solving method`,
       async () => {
        const solution = await new Promise((resolve, reject) => {
          const worker = new Worker(
            './src/solver.js',
            { workerData: testCase.args },
          );
          worker.on('message', resolve);
          worker.on('error', reject);
        });
        await assertSnapshotMatch(solution, `solver/${i}.snapshot.json`);
      },
    );
  }

  describe('random tests', () => {
    for (let i = 0; i < 10; ++i) {
      const flasksNumber = getRandomIntInclusive(2, 13);
      const emptyFlasksNumber = getRandomIntInclusive(
        DefaultEmptyFlasksNumber,
        MaxEmptyFlasksNumber,
      );
      const layersMatrix = generatePuzzle(flasksNumber, emptyFlasksNumber);

      for (const solvingMethod of Object.values(SolvingMethod)) {
        it(
          `should pass random test ${i} using ${solvingMethod} solving method`,
          async () => {
            const solution = await new Promise((resolve, reject) => {
              const worker = new Worker(
                './src/solver.js',
                { workerData: [ layersMatrix, solvingMethod ] },
              );
              worker.on('message', resolve);
              worker.on('error', reject);
            });
            assert.equal(
              solution?.[0].reduce(
                (puzzle, transfusion) => {
                  puzzle.transfuse(...transfusion);
                  return puzzle;
                },
                new Puzzle([
                  ...layersMatrix,
                  ...new Array(solution[1]).fill(null).map(() => []),
                ])
              ).isSolved,
              true,
            );
          },
        );
      }
    }
  });
});
/* node:coverage enable */
