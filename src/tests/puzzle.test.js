import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { FlaskCapacity } from '../constants/flask-capacity.const.js';
import { Flask } from '../flask.js';
import { Puzzle } from '../puzzle.js';

describe('Puzzle', () => {
  it('should be created', () => {
    assert(new Puzzle());
  });

  it('should not accept layers over limit', () => {
    assert.throws(() => new Puzzle([ new Array(FlaskCapacity + 1).fill(0) ]));
  });

  it('should copy puzzle', () => {
    const puzzle = new Puzzle([
      [ 0, 1, 0, 1 ],
      [ 1, 0, 1, 0 ],
    ]);
    assert.notEqual(puzzle, puzzle.copy());
  });

  it('should copy puzzle correctly', () => {
    const puzzle = new Puzzle([
      [ 0, 1, 0, 1 ],
      [ 1, 0, 1, 0 ],
    ]);
    assert.deepEqual(puzzle.layersMatrix, puzzle.copy().layersMatrix);
  });

  it('should provide access to flasks', () => {
    const layersMatrix = [
      [ 0, 1, 0, 1 ],
      [ 1, 0, 1, 0 ],
    ];
    const puzzle = new Puzzle(layersMatrix);
    assert.deepEqual(puzzle.flasks, layersMatrix.map((layers) => new Flask(layers)));
  });

  it('should not allow to modify flasks', () => {
    const layersMatrix = [
      [ 0, 1, 0, 1 ],
      [ 1, 0, 1, 0 ],
    ];
    const puzzle = new Puzzle(layersMatrix);
    puzzle.flasks[1] = new Flask([]);
    assert.deepEqual(puzzle.flasks, layersMatrix.map((layers) => new Flask(layers)));
  });

  it('should provide access to layers matrix', () => {
    const layersMatrix = [
      [ 0, 1, 0, 1 ],
      [ 1, 0, 1, 0 ],
    ];
    const puzzle = new Puzzle(layersMatrix);
    assert.deepEqual(puzzle.layersMatrix, layersMatrix);
  });

  it('should not allow to modify layers matrix', () => {
    const layersMatrix = [
      [ 0, 1, 0, 1 ],
      [ 1, 0, 1, 0 ],
    ];
    const puzzle = new Puzzle(layersMatrix);
    puzzle.layersMatrix[0][1] = 0;
    assert.deepEqual(puzzle.layersMatrix, layersMatrix);
  });

  describe('isSolved', () => {
    it('should return true if every flask is in final state', () => {
      const puzzle = new Puzzle([
        [ 0, 0, 0, 0 ],
        [],
      ]);
      assert.equal(puzzle.isSolved, true);
    });

    it('should return false if any flask is not in final state', () => {
      const puzzle = new Puzzle([
        [ 0, 0, 0, 0 ],
        [],
        [ 0, 0, 0, 1 ],
      ]);
      assert.equal(puzzle.isSolved, false);
    });
  });

  describe('isTransfusionValid', () => {
    describe('errors', () => {
      it('should throw error if source flask index is less than 0', () => {
        const puzzle = new Puzzle([ [], [] ]);
        assert.throws(() => puzzle.isTransfusionValid(-1, 0));
      });

      it('should throw error if source flask index is greater than flasks number', () => {
        const puzzle = new Puzzle([ [], [] ]);
        assert.throws(() => puzzle.isTransfusionValid(2, 0));
      });

      it('should throw error if destination flask index is less than 0', () => {
        const puzzle = new Puzzle([ [], [] ]);
        assert.throws(() => puzzle.isTransfusionValid(0, -1));
      });

      it('should throw error if destination flask index is greater than flasks number', () => {
        const puzzle = new Puzzle([ [], [] ]);
        assert.throws(() => puzzle.isTransfusionValid(0, 2));
      });
    });

    it('should return false if source and destination are the same', () => {
      const puzzle = new Puzzle([ [], [] ]);
      assert.equal(puzzle.isTransfusionValid(0, 0), false);
    });

    it('should return false if source is empty', () => {
      const puzzle = new Puzzle([ [], [] ]);
      assert.equal(puzzle.isTransfusionValid(0, 1), false);
    });

    it('should return false if destination is full', () => {
      const puzzle = new Puzzle([
        [ 0, 0, 0, 0 ],
        [ 0, 0, 0, 0 ],
      ]);
      assert.equal(puzzle.isTransfusionValid(0, 1), false);
    });

    it('should return false if top layers are not the same', () => {
      const puzzle = new Puzzle([
        [ 0, 1 ],
        [ 1, 0 ],
      ]);
      assert.equal(puzzle.isTransfusionValid(0, 1), false);
    });

    it('should return true if destination is empty', () => {
      const puzzle = new Puzzle([
        [ 0, 1, 0, 1 ],
        [],
      ]);
      assert.equal(puzzle.isTransfusionValid(0, 1), true);
    });

    it('should return true if top layers are the same', () => {
      const puzzle = new Puzzle([
        [ 0, 1 ],
        [ 0, 1 ],
      ]);
      assert.equal(puzzle.isTransfusionValid(0, 1), true);
    });
  });

  describe('transfuse', () => {
    describe('errors', () => {
      it('should throw error if source index is less than 0', () => {
        const puzzle = new Puzzle([ [], [] ]);
        assert.throws(() => puzzle.transfuse(-1, 1));
      });

      it('should throw error if source index is greater than flasks number', () => {
        const puzzle = new Puzzle([ [], [] ]);
        assert.throws(() => puzzle.transfuse(2, 1));
      });

      it('should throw error if destination index is less than 0', () => {
        const puzzle = new Puzzle([ [], [] ]);
        assert.throws(() => puzzle.transfuse(0, -1));
      });

      it('should throw error if source index is greater than flasks number', () => {
        const puzzle = new Puzzle([ [], [] ]);
        assert.throws(() => puzzle.transfuse(0, 2));
      });
    });

    it('should pop layers from source', () => {
      const puzzle = new Puzzle([
        [ 0, 1, 1 ],
        [ 1 ],
      ]);
      const expectedSourceLayers = [ 0 ];
      puzzle.transfuse(0, 1);
      assert.deepEqual(puzzle.layersMatrix[0], expectedSourceLayers);
    });

    it('should push layers to destination', () => {
      const puzzle = new Puzzle([
        [ 0, 1, 1 ],
        [ 1 ],
      ]);
      const expectedDestinationLayers = [ 1, 1, 1 ];
      puzzle.transfuse(0, 1);
      assert.deepEqual(puzzle.layersMatrix[1], expectedDestinationLayers);
    });

    it('should pop layers from source if avaliable capacity is limited', () => {
      const puzzle = new Puzzle([
        [ 0, 1, 1 ],
        [ 1, 1, 1 ],
      ]);
      const expectedSourceLayers = [ 0, 1 ];
      puzzle.transfuse(0, 1);
      assert.deepEqual(puzzle.layersMatrix[0], expectedSourceLayers);
    });

    it('should push layers to destination if avaliable capacity is limited', () => {
      const puzzle = new Puzzle([
        [ 0, 1, 1 ],
        [ 1, 1, 1 ],
      ]);
      const expectedDestinationLayers = [ 1, 1, 1, 1 ];
      puzzle.transfuse(0, 1);
      assert.deepEqual(puzzle.layersMatrix[1], expectedDestinationLayers);
    });
  });

  describe('toStringWithSort', () => {
    it('should convert to string', () => {
      const layersMatrix = [
        [ 0, 1, 0, 1 ],
        [ 1, 0, 1, 0 ],
      ];
      const puzzle = new Puzzle(layersMatrix);
      assert.equal(
        puzzle.toStringWithSort(),
        layersMatrix.map((layers) => layers.join(',')).join('\n')
      );
    });

    it('should sort when converting to string', () => {
      const puzzle1 = new Puzzle([
        [ 0, 1, 0, 1 ],
        [ 1, 0, 1, 0 ],
      ]);
      const puzzle2 = new Puzzle([
        [ 1, 0, 1, 0 ],
        [ 0, 1, 0, 1 ],
      ]);
      assert.equal(puzzle1.toStringWithSort(), puzzle2.toStringWithSort());
    });
  });
});
