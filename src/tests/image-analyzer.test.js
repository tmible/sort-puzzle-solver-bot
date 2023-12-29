/* node:coverage disable */
import { readFile } from 'fs/promises';
import { strict as assert } from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import getPixels from 'get-pixels';
import { FlasksMargin } from '../constants/image-options/flasks-margin.const.js';
import { FlaskBorderWidth } from '../constants/image-options/flask-border-width.const.js';
import { SquareSide } from '../constants/image-options/square-side.const.js';
import { assertSnapshotMatch } from './helpers/assert-snapshot-match.js';
import { analyzeImage, detectSpots, markSpots, forTesting } from '../image-analyzer.js';
import { fullfillImage, prepareImage } from '../visualizer.js';

const {
  traversePixels,
  constructSpots,
  clusterizeSpots,
  fullfillPuzzle,
  scanSpotsAlongMiddle,
  extractFlaskFromLayers,
  detectColorsInFlasks,
  detectFlasks,
} = forTesting;

const preparePixels = (rowsNumber, flasksInRows, layersMatrix, colors) => {
  const [ canvas, ctx ] = prepareImage(rowsNumber, flasksInRows);
  fullfillImage(rowsNumber, flasksInRows, layersMatrix, colors, ctx);

  const shape = [ canvas.width, canvas.height ];

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const pixels = new Array(canvas.height).fill(null).map(() =>
    new Array(canvas.width).fill(null).map(() => new Array(3))
  );

  for (let i = 0; i < canvas.height; ++i) {
    for (let j = 0; j < canvas.width; ++j) {
      for (let k = 0; k < 3; ++k) {
        pixels[i][j][k] = imageData[(i * canvas.width + j) * 4 + k];
      }
    }
  }

  return [ shape, pixels ];
};

const calcPixelsDiffPercent = async (actualSource, expectedSource) => {
  const actual = await new Promise(async (resolve, reject) => {
    getPixels(
      actualSource,
      'image/png',
      (err, imageData) => {
        if (err) {
          reject(err);
        }
        resolve(imageData.data);
      },
    );
  });

  const expected = await new Promise((resolve, reject) => {
    getPixels(
      expectedSource,
      'image/png',
      (err, imageData) => {
        if (err) {
          reject(err);
        }
        resolve(imageData.data);
      },
    );
  });

  let diff = 0;
  for (let i = 0; i < Math.max(actual.length, expected.length); ++i) {
    diff += actual[i] !== expected[i] ? 1 : 0;
  }

  return Math.round(diff / actual.length * 100);
};

describe('image-analyser', () => {
  describe('detectSpots', () => {
    it('should reject if buffer is invalid', () => {
      assert.rejects(async () => await detectSpots(Buffer.from([])));
    });

    it('should return shape', async () => {
      const [ canvas ] = prepareImage(1, [ 0 ]);
      const shape = (await detectSpots(canvas.toBuffer(), 'image/png'))[0];
      assert.deepEqual(shape, [ canvas.width, canvas.height, 4 ]);
    });

    it('should return pixels', async () => {
      const [ canvas, ctx ] = prepareImage(1, [ 0 ]);
      const pixels = (await detectSpots(canvas.toBuffer(), 'image/png'))[1];
      assert.deepEqual(
        pixels.flat().flatMap((pixel) => [ ...pixel, 255 ]),
        [ ...ctx.getImageData(0, 0, canvas.width, canvas.height).data ],
      );
    });

    it('should return clusters', async () => {
      const [ canvas, ctx ] = prepareImage(1, [ 1 ]);
      fullfillImage(1, [ 1 ], [ [ 1, 1, 0, 0 ] ], [ '255,209,220', '255,209,221' ], ctx);
      const clusters = (await detectSpots(canvas.toBuffer(), 'image/png'))[2];
      await assertSnapshotMatch(clusters, 'detect-spots/clusters.snapshot.json');
    });

    it('should return mask', async () => {
      const [ canvas, ctx ] = prepareImage(1, [ 1 ]);
      fullfillImage(1, [ 1 ], [ [ 1, 1, 0, 0 ] ], [ '255,209,220', '255,209,221' ], ctx);
      const mask = (await detectSpots(canvas.toBuffer(), 'image/png'))[3];
      await assertSnapshotMatch(mask, 'detect-spots/mask.snapshot.json');
    });

    describe('real tests with compressed images', () => {
      for (let i = 0; i < 5; ++i) {
        it(`should pass real test ${i}`, async () => {
          await assertSnapshotMatch(
            await detectSpots(await readFile(`./src/tests/inputs/detect-spots/${i}.jpg`)),
            `detect-spots/${i}.snapshot.json`,
          );
        });
      }
    });
  });

  describe('markSpots', () => {
    it('should mark spots', async () => {
      const [ canvas, ctx ] = prepareImage(1, [ 3 ]);
      fullfillImage(
        1,
        [ 3 ],
        [ [ 0, 1, 2, 0 ], [ 1, 2, 0, 1 ], [ 2, 0, 1, 2 ] ],
        [ '255,209,220', '167,199,231', '195,177,225' ],
        ctx,
      );

      const diffPercent = await calcPixelsDiffPercent(
        await markSpots(...(await detectSpots(canvas.toBuffer(), 'image/png')), 1),
        './src/tests/snapshots/mark-spots/marked-spots.snapshot.png',
      );

      assert.equal(diffPercent <= 3, true);
    });
  });

  describe('analyzeImage', () => {
    it('should return layers matrix', async () => {
      const expectedLayersMatrix = [ [ 0, 1, 2, 0 ], [ 1, 2, 0, 1 ], [ 2, 0, 1, 2 ] ];
      const [ canvas, ctx ] = prepareImage(2, [ 2, 1 ]);
      fullfillImage(
        2,
        [ 2, 1 ],
        expectedLayersMatrix,
        [ '255,209,220', '167,199,231', '195,177,225' ],
        ctx,
      );
      const actualLayersMatrix = analyzeImage(
        ...(await detectSpots(canvas.toBuffer(), 'image/png')),
        [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ],
      )[0];
      assert.deepEqual(actualLayersMatrix, expectedLayersMatrix);
    });

    it('should return image', async () => {
      const [ canvas, ctx ] = prepareImage(2, [ 2, 1 ]);
      fullfillImage(
        2,
        [ 2, 1 ],
        [ [ 0, 1, 2, 0 ], [ 1, 2, 0, 1 ], [ 2, 0, 1, 2 ] ],
        [ '255,209,220', '167,199,231', '195,177,225' ],
        ctx,
      );
      const image = analyzeImage(
        ...(await detectSpots(canvas.toBuffer(), 'image/png')),
        [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ],
      )[1];
      assert.deepEqual(image, canvas.toBuffer());
    });

    it('should return colors', async () => {
      const expectedColors = [ '255,209,220', '167,199,231', '195,177,225' ];
      const [ canvas, ctx ] = prepareImage(2, [ 2, 1 ]);
      fullfillImage(
        2,
        [ 2, 1 ],
        [ [ 0, 1, 2, 0 ], [ 1, 2, 0, 1 ], [ 2, 0, 1, 2 ] ],
        expectedColors,
        ctx,
      );
      const actualColors = analyzeImage(
        ...(await detectSpots(canvas.toBuffer(), 'image/png')),
        [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ],
      )[2];
      assert.deepEqual(actualColors, expectedColors);
    });

    it('should return imageData', async () => {
      const expectedImageData = { rowsNumber: 2, flasksInRows: [ 2, 1 ] };
      const [ canvas, ctx ] = prepareImage(
        expectedImageData.rowsNumber,
        expectedImageData.flasksInRows,
      );
      fullfillImage(
        expectedImageData.rowsNumber,
        expectedImageData.flasksInRows,
        [ [ 0, 1, 2, 0 ], [ 1, 2, 0, 1 ], [ 2, 0, 1, 2 ] ],
        [ '255,209,220', '167,199,231', '195,177,225' ],
        ctx,
      );
      const actualImageData = analyzeImage(
        ...(await detectSpots(canvas.toBuffer(), 'image/png')),
        [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ],
      )[3];
      assert.deepEqual(actualImageData, expectedImageData);
    });

    describe('real tests with compressed images', () => {
      for (let i = 0; i < 5; ++i) {
        it(`should pass real test ${i}`, async () => {
          const actual = analyzeImage(
            ...(await detectSpots(await readFile(`./src/tests/inputs/detect-spots/${i}.jpg`))),
            new Set(JSON.parse(await readFile(`./src/tests/inputs/analyze-image/${i}.json`))),
          );

          assertSnapshotMatch(
            [ actual[0], ...actual.slice(2, 4) ],
            `analyze-image/${i}.snapshot.json`,
          );

          const diffPercent = await calcPixelsDiffPercent(
            actual[1],
            `./src/tests/snapshots/analyze-image/${i}.snapshot.png`,
          );

          assert.equal(diffPercent, 0);
        });
      }
    });
  });

  describe('traversePixels', () => {
    it('should fill visited', () => {
      const visited = [ [ false ] ];
      traversePixels([ 0, 0 ], visited, [ 1, 1 ], () => {}, () => true);
      assert.deepEqual(visited, [ [ true ] ]);
    });

    it('should call DFSBody', () => {
      let isDFSBodyCalled = false;
      traversePixels([ 0, 0 ], [ [ false ] ], [ 1, 1 ], () => isDFSBodyCalled = true, () => true);
      assert.equal(isDFSBodyCalled, true);
    });

    describe('stack filters', () => {
      let start;
      let visited
      let shape;

      beforeEach(() => {
        start = [ 1, 1 ];
        shape = [ 3, 3 ];
        visited = new Array(shape[1]).fill(null).map(() => new Array(shape[0]).fill(false));
      });

      it('should not push to stack if i is < 0', () => {
        let isOutOfBoundsPixelVisited = false;
        traversePixels(
          start,
          visited,
          shape,
          () => {},
          (next, [ i, j ]) => {
            isOutOfBoundsPixelVisited = next[0] < 0;
            return true;
          },
        );
        assert.equal(isOutOfBoundsPixelVisited, false);
      });

      it('should not push to stack if i is >= shape[1]', () => {
        let isOutOfBoundsPixelVisited = false;
        traversePixels(
          start,
          visited,
          shape,
          () => {},
          (next, [ i, j ]) => {
            isOutOfBoundsPixelVisited = next[0] >= shape[1];
            return true;
          },
        );
        assert.equal(isOutOfBoundsPixelVisited, false);
      });

      it('should not push to stack if j is < 0', () => {
        let isOutOfBoundsPixelVisited = false;
        traversePixels(
          start,
          visited,
          shape,
          () => {},
          (next, [ i, j ]) => {
            isOutOfBoundsPixelVisited = next[1] < 0;
            return true;
          },
        );
        assert.equal(isOutOfBoundsPixelVisited, false);
      });

      it('should not push to stack if j is >= shape[0]', () => {
        let isOutOfBoundsPixelVisited = false;
        traversePixels(
          start,
          visited,
          shape,
          () => {},
          (next, [ i, j ]) => {
            isOutOfBoundsPixelVisited = next[1] >= shape[0];
            return true;
          },
        );
        assert.equal(isOutOfBoundsPixelVisited, false);
      });

      it('should not push to stack visited pixels', () => {
        let isVisitedPixelPushedToStack = false;
        traversePixels(
          start,
          visited,
          shape,
          () => {},
          (next, [ i, j ]) => {
            isVisitedPixelPushedToStack = visited[next[0]][next[1]];
            return true;
          },
        );
        assert.equal(isVisitedPixelPushedToStack, false);
      });

      it('should not push to stack rejected by stackFilter pixels', () => {
        const rejected = [ 0, 2 ];
        traversePixels(
          start,
          visited,
          shape,
          () => {},
          (next, [ i, j ]) => !next.some((n, k) => n !== rejected[k]),
        );
        assert.equal(visited[rejected[0]][rejected[1]], false);
      });
    });
  });

  describe('constructSpots', () => {
    let shape;
    let pixels;

    beforeEach(() => {
      [ shape, pixels ] = preparePixels(
        1,
        [ 1 ],
        [ [ 1, 1, 0, 0 ] ],
        [ '255,209,220', '255,209,221' ],
      );
    });

    it('should return spots', async () => {
      const spots = constructSpots(shape, pixels)[0];
      await assertSnapshotMatch(spots, 'construct-spots/spots.snapshot.json');
    });

    it('should return mask', async () => {
      const mask = constructSpots(shape, pixels)[1];
      await assertSnapshotMatch(mask, 'construct-spots/mask.snapshot.json');
    });
  });

  describe('clusterizeSpots', () => {
    it('should return clusters', async () => {
      const [ shape, pixels ] = preparePixels(
        1,
        [ 1 ],
        [ [ 1, 1, 0, 0 ] ],
        [ '255,209,220', '255,209,221' ],
      );
      const clusters = clusterizeSpots(shape, pixels, ...constructSpots(shape, pixels));
      await assertSnapshotMatch(clusters, 'clusterize-spots/clusters.snapshot.json');
    });
  });

  describe('fullfillPuzzle', () => {
    it('should fullfill puzzle', async () => {
      await assertSnapshotMatch(
        fullfillPuzzle(
          3,
          new Map([[
            '255,209,220',
            [
              { flask: 0, index: 0 },
              { flask: 0, index: 3 },
              { flask: 1, index: 2 },
              { flask: 2, index: 1 },
            ],
          ], [
            '167,199,231',
            [
              { flask: 0, index: 1 },
              { flask: 1, index: 0 },
              { flask: 1, index: 3 },
              { flask: 2, index: 2 },
            ],
          ], [
            '195,177,225',
            [
              { flask: 0, index: 2 },
              { flask: 1, index: 1 },
              { flask: 2, index: 0 },
              { flask: 2, index: 3 },
            ],
          ]]),
        ),
        'fullfill-puzzle/puzzle.snapshot.json',
      );
    });
  });

  describe('scanSpotsAlongMiddle', () => {
    const colors = [ '255,209,220', '167,199,231', '195,177,225' ];
    let shape;
    let pixels;

    const testBody = async () => {
      const [ spots, mask ] = constructSpots(shape, pixels);
      await assertSnapshotMatch(
        scanSpotsAlongMiddle(
          shape,
          spots,
          mask,
          new Set(spots
            .filter(({ color }) => colors.includes(color.join(',')))
            .map(({ id }) => id)
          ),
          FlasksMargin + FlaskBorderWidth + SquareSide / 2,
        ),
        'scan-spots-along-middle/spots.snapshot.json',
      );
    };

    beforeEach(() => {
      [ shape, pixels ] = preparePixels(
        2,
        [ 2, 1 ],
        [ [ 0, 1, 2, 0 ], [ 1, 2, 0, 1 ], [ 2, 0, 1, 2 ] ],
        colors,
      );
    });

    it('should scan spots', testBody);

    it('should detect duplicates', async () => {
      const holeCenterCoordinate =
        FlasksMargin + FlaskBorderWidth + SquareSide / 2;
      const holeHalfSize = 10;
      for (
        let i = shape[1] - holeCenterCoordinate + holeHalfSize;
        i > shape[1] - holeCenterCoordinate - holeHalfSize;
        --i
      ) {
        for (
          let j = holeCenterCoordinate - holeHalfSize;
          j < holeCenterCoordinate + holeHalfSize;
          ++j
        ) {
          pixels[i][j] = [ 255, 0, 0 ];
        }
      }
      await testBody();
    });
  });

  describe('extractFlaskFromLayers', () => {
    it('should extract flasks', async () => {
      const colors = [ '255,209,220' ];
      const [ shape, pixels ] = preparePixels(1, [ 1 ], [ [ 0, 0, 0, 0 ] ], colors);
      const [ spots, mask ] = constructSpots(shape, pixels);
      const currentSpotId = spots.find(({ color }) => colors.includes(color.join(','))).id;
      const layers = scanSpotsAlongMiddle(
        shape,
        spots,
        mask,
        new Set(spots
          .filter(({ color }) => colors.includes(color.join(',')))
          .map(({ id }) => id)
        ),
        FlasksMargin + FlaskBorderWidth + SquareSide / 2,
      );
      await assertSnapshotMatch(
        extractFlaskFromLayers(spots, currentSpotId, layers),
        'extract-flask-from-layers/flask.snapshot.json',
      );
    });

    it('should ignore flasks not containing current spot', () => {
      const colors = [ '255,209,220', '167,199,231', '195,177,225' ];
      const [ shape, pixels ] = preparePixels(
        2,
        [ 2, 1 ],
        [ [ 0, 1, 2, 0 ], [ 1, 2, 0, 1 ], [ 2, 0, 1, 2 ] ],
        colors,
      );
      const [ spots, mask ] = constructSpots(shape, pixels);
      const currentSpotId = spots.find(({ color }) => colors.includes(color.join(','))).id;
      const layers = scanSpotsAlongMiddle(
        shape,
        spots,
        mask,
        new Set(spots
          .filter(({ color }) => colors.includes(color.join(',')))
          .map(({ id }) => id)
        ),
        FlasksMargin + FlaskBorderWidth + SquareSide / 2,
      );
      assert(extractFlaskFromLayers(spots, currentSpotId, layers).find(({ id }) => currentSpotId));
    });
  });

  describe('detectColorsInFlasks', () => {
    it('should detect colors', async () => {
      const colors = [ '255,209,220', '167,199,231', '195,177,225' ];
      const [ shape, pixels ] = preparePixels(
        1,
        [ 3 ],
        [ [ 0, 1, 2, 0 ], [ 1, 2, 0, 1 ], [ 2, 0, 1, 2 ] ],
        colors,
      );
      const [ spots, mask ] = constructSpots(shape, pixels);
      const flasks = [];
      for (const spot of spots.filter(({ color }) => colors.includes(color.join(',')))) {
        if (spot.isInFlask) {
          continue;
        }
        const layers = scanSpotsAlongMiddle(
          shape,
          spots,
          mask,
          new Set(spots
            .filter(({ color }) => colors.includes(color.join(',')))
            .map(({ id }) => id)
          ),
          Math.round((spot.left + spot.right) / 2),
        );
        flasks.push(extractFlaskFromLayers(spots, spot.id, layers));
      }
      await assertSnapshotMatch(
        [ ...detectColorsInFlasks(flasks).entries() ],
        'detect-colors-in-flasks/colors-map.snapshot.json',
      );
    });
  });

  describe('detectFlasks', () => {
    const colors = [ '255,209,220', '167,199,231', '195,177,225', '154,219,179' ];
    let flasks;
    let colorsMap;

    beforeEach(() => {
      const [ shape, pixels ] = preparePixels(
        2,
        [ 2, 2 ],
        [ [ 3, 3, 2, 1 ], [ 2, 0, 1, 2 ], [ 2, 3, 0, 0 ], [ 0, 1, 1, 3 ] ],
        colors,
      );
      const [ spots, mask ] = constructSpots(shape, pixels);
      [ flasks, colorsMap ] = detectFlasks(
        shape,
        pixels,
        spots,
        mask,
        new Set(spots
          .map((spot, index) => ({ ...spot, index }))
          .filter(({ color }) => colors.includes(color.join(',')))
          .map(({index}) => index)
        ),
      );
    });

    it('should detect flasks', async () => {
      await assertSnapshotMatch(
        [ flasks, [ ...colorsMap.entries() ] ],
        'detect-flasks/flasks&colors-map.snapshot.json',
      );
    });

    it('should only include selected spots', () => {
      assert.equal(
        !flasks.some((flask) => !!flask.some(({ color }) => !colors.includes(color.join(',')))),
        true,
      );
    });

    it('should sort flasks', () => {
      let isSorted = true;
      for (let i = 1; i < flasks.length; ++i) {
        if (flasks[i - 1].at(-1).top === flasks[i].at(-1).top) {
          isSorted = flasks[i].at(-1).left > flasks[i - 1].at(-1).left;
        } else {
          isSorted = flasks[i].at(-1).top > flasks[i - 1].at(-1).top;
        }
        if (!isSorted) {
          break;
        }
      }
      assert.equal(isSorted, true);
    });
  });
});
/* node:coverage enable */
