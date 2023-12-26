/* node:coverage disable */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { SquareSide } from '../constants/image-options/square-side.const.js';
import { FlasksMargin } from '../constants/image-options/flasks-margin.const.js';
import { FlaskBorderWidth } from '../constants/image-options/flask-border-width.const.js';
import { BackgroundColor } from '../constants/image-options/background-color.const.js';
import { FlaskBorderColor } from '../constants/image-options/flask-border-color.const.js';
import { FlaskCapacity } from '../constants/flask-capacity.const.js';
import { fullfillImage, prepareImage, visualizeSolution } from '../visualizer.js';
import { getRandomIntInclusive } from '../utils.js';

describe('visualizer', () => {
  describe('prepareImage', () => {
    it('should create canvas', () => {
      const [ canvas ] = prepareImage(1, [ 0 ]);
      assert(canvas);
    });

    it('should return context', () => {
      const [ _, ctx ] = prepareImage(1, [ 0 ]);
      assert(ctx);
    });

    it('should return canvas\' 2d context', () => {
      const [ canvas, ctx ] = prepareImage(1, [ 0 ]);
      assert.equal(ctx, canvas.getContext('2d'));
    });

    it('should create canvas with correct width', () => {
      const [ canvas ] = prepareImage(2, [ 1, 2 ]);
      const expectedWidth = 2 * SquareSide + (2 + 1) * FlasksMargin + 2 * 2 * FlaskBorderWidth;
      assert.equal(canvas.width, expectedWidth);
    });

    it('should create canvas with correct height', () => {
      const [ canvas ] = prepareImage(2, [ 1, 2 ]);
      const expectedHeight =
        2 * FlaskCapacity * SquareSide + (2 + 1) * FlasksMargin + 2 * FlaskBorderWidth;
      assert.equal(canvas.height, expectedHeight);
    });

    it('should fill canvas with correct backgound', () => {
      const [ canvas, ctx ] = prepareImage(1, [ 0 ]);
      const left = getRandomIntInclusive(0, canvas.width - 1);
      const top = getRandomIntInclusive(0, canvas.height - 1);
      assert.equal(
        ctx.getImageData(left, top, 1, 1).data.slice(0, 3).join(', '),
        BackgroundColor,
      );
    });

    it('should add flask to canvas', () => {
      const [ canvas, ctx ] = prepareImage(1, [ 1 ]);

      let isFlaskOnCanvas = true;
      for (let x = FlasksMargin; x < canvas.width - FlasksMargin; ++x) {
        for (let y = FlasksMargin; y < canvas.height - FlasksMargin; ++y) {

          if (
            x >= FlasksMargin + FlaskBorderWidth &&
            x < canvas.width - FlasksMargin - FlaskBorderWidth &&
            y < canvas.height - FlasksMargin - FlaskBorderWidth
          ) {
            continue;
          }

          const pixel = ctx.getImageData(x, y, 1, 1).data.slice(0, 3).join(', ');

          if (pixel !== FlaskBorderColor) {
            isFlaskOnCanvas = false;
            break;
          }

        }

        if (!isFlaskOnCanvas) {
          break;
        }
      }

      assert.equal(isFlaskOnCanvas, true);
    });
  });

  describe('fullfillImage', () => {
    it('should fill prepared flask', () => {
      const fillColor = '255,209,220';
      const [ canvas, ctx ] = prepareImage(1, [ 1 ]);
      fullfillImage(1, [ 1 ], [ [ 0, 0, 0, 0 ] ], [ fillColor ], ctx);

      let isFlaskFilled = true;
      for (
        let x = FlasksMargin + FlaskBorderWidth;
        x < canvas.width - FlasksMargin - FlaskBorderWidth;
        ++x
      ) {
        for (let y = FlasksMargin; y < canvas.height - FlasksMargin - FlaskBorderWidth; ++y) {

          const pixel = ctx.getImageData(x, y, 1, 1).data.slice(0, 3).join(',');

          if (pixel !== fillColor) {
            isFlaskFilled = false;
            break;
          }

        }

        if (!isFlaskFilled) {
          break;
        }
      }

      assert.equal(isFlaskFilled, true);
    });
  });

  describe('visualizeSolution', () => {
    it('should visualize solution', () => {
      const fillColor = '255,209,220';

      const actualImages = visualizeSolution(
        [ [ 0, 1 ] ],
        [ [ 0, 0, 0, 0 ], [] ],
        [ fillColor ],
        { rowsNumber: 1, flasksInRows: [ 1 ] },
        1,
      );

      const expectedImages = [];
      let [ canvas, ctx ] = prepareImage(1, [ 2 ]);
      fullfillImage(1, [ 2 ], [ [ 0, 0, 0, 0 ], [] ], [ fillColor ], ctx);
      expectedImages.push(canvas.toBuffer());
      [ canvas, ctx ] = prepareImage(1, [ 2 ]);
      fullfillImage(1, [ 2 ], [ [], [ 0, 0, 0, 0 ] ], [ fillColor ], ctx);
      expectedImages.push(canvas.toBuffer());

      assert.deepEqual(actualImages, expectedImages);
    });
  });
});
/* node:coverage enable */
