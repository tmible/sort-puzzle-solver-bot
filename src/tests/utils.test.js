import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { getRandomIntInclusive, numbersAndRangesToNumbers, pluralPipe } from '../utils.js';

describe('pluralPipe', () => {
  const declensions = [ '0', '1', '2' ];
  const testCases = [
    [ 0, 2 ],  [ 1, 0 ],  [ 2, 1 ],  [ 5, 2 ],
    [ 11, 2 ], [ 21, 0 ], [ 22, 1 ], [ 25, 2 ],
    [ 31, 0 ], [ 32, 1 ], [ 35, 2 ], [ 41, 0 ],
    [ 42, 1 ], [ 45, 2 ], [ 51, 0 ], [ 52, 1 ],
    [ 55, 2 ], [ 61, 0 ], [ 62, 1 ], [ 65, 2 ],
    [ 71, 0 ], [ 72, 1 ], [ 75, 2 ], [ 81, 0 ],
    [ 82, 1 ], [ 85, 2 ], [ 91, 0 ], [ 92, 1 ],
    [ 95, 2 ],
  ];

  for (let i = 0; i < 100; ++i) {
    const [ arg, expectedResult ] = testCases.findLast(([ arg ]) => arg <= i);
    it(`should return ${expectedResult} declension for ${i}`, () => {
      assert.equal(pluralPipe(arg, declensions), declensions[expectedResult]);
    });
  }
});

describe('getRandomIntInclusive', () => {
  it('should return ints', () => {
    const randomInt = getRandomIntInclusive(Math.random() * 50, Math.random() * 50 + (100 - 50));
    assert.equal(randomInt, parseInt(randomInt));
  });

  it('should return number in bounds', () => {
    const min = Math.random() * 50;
    const max = Math.random() * (100 - 50) + 50;
    const randomInt = getRandomIntInclusive(min, max);
    assert.equal(randomInt >= min && randomInt <= max, true);
  });
});

describe('numbersAndRangesToNumbers', () => {
  it('should return undefined if argument is undefined', () => {
    assert.equal(numbersAndRangesToNumbers(), undefined);
  });

  it('should parse numbers ignoring all symbols except numbers and -', () => {
    assert.deepEqual(
      numbersAndRangesToNumbers('1 wkf wefk,,,,weq.qq \q 4-7....  \nekoer%%$;10 wibwevw - wwnevoiwvrv#&#^*#% 12'),
      [ 1, 4, 5, 6, 7, 10, 11, 12 ],
    );
  });

  it('should ignore - at the beginning', () => {
    assert.deepEqual(
      numbersAndRangesToNumbers('-4 7'),
      [ 7 ],
    );
  });

  it('should ignore - at the ending', () => {
    assert.deepEqual(
      numbersAndRangesToNumbers('1 4-'),
      [ 1 ],
    );
  });
});
