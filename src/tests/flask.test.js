import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { FlaskCapacity } from '../constants/flask-capacity.const.js';
import { Flask } from '../flask.js';

describe('Flask', () => {
  it('should be created', () => {
    assert(new Flask());
  });

  it('should not accept layers over limit', () => {
    assert.throws(() => new Flask(new Array(FlaskCapacity + 1).fill(0)));
  });

  it('should copy flask', () => {
    const flask = new Flask([ 0, 1, 0, 1 ]);
    assert.notEqual(flask, flask.copy());
  });

  it('should copy flask correctly', () => {
    const flask = new Flask([ 0, 1, 0, 1 ]);
    assert.deepEqual(flask.layers, flask.copy().layers);
  });

  it('should provide access to layers', () => {
    const layers = [ 0, 1, 0, 1 ];
    const flask = new Flask(layers);
    assert.deepEqual(flask.layers, layers);
  });

  it('should not allow to modify layers', () => {
    const layers = [ 0, 1, 0, 1 ];
    const flask = new Flask(layers);
    flask.layers[1] = 0;
    assert.deepEqual(flask.layers, layers);
  });

  describe('isEmpty', () => {
    it('should return true', () => {
      const flask = new Flask([]);
      assert.equal(flask.isEmpty, true);
    });

    it('should return false', () => {
      const flask = new Flask([ 0, 1, 0, 1 ]);
      assert.equal(flask.isEmpty, false);
    });
  });

  describe('isFull', () => {
    it('should return true', () => {
      const flask = new Flask([ 0, 1, 0, 1 ]);
      assert.equal(flask.isFull, true);
    });

    it('should return false', () => {
      const flask = new Flask([]);
      assert.equal(flask.isFull, false);
    });
  });

  describe('isInFinalState', () => {
    it('should return true if empty', () => {
      const flask = new Flask([]);
      assert.equal(flask.isInFinalState, true);
    });

    it('should return true if full and equal', () => {
      const flask = new Flask([ 0, 0, 0, 0 ]);
      assert.equal(flask.isInFinalState, true);
    });

    it('should return false if not full', () => {
      const flask = new Flask([ 0, 0 ]);
      assert.equal(flask.isInFinalState, false);
    });

    it('should return false if full and not equal', () => {
      const flask = new Flask([ 0, 1, 0, 1 ]);
      assert.equal(flask.isInFinalState, false);
    });
  });

  it('should convert to string', () => {
    const layers = [ 0, 1, 0, 1 ];
    const flask = new Flask(layers);
    assert.equal(flask.toString(), layers.join(','));
  });

  describe('isTransfusionValid', () => {
    it('should return false if source is empty', () => {
      const sourceFlask = new Flask([]);
      const destinationFlask = new Flask([]);
      assert.equal(Flask.isTransfusionValid(sourceFlask, destinationFlask), false);
    });

    it('should return false if destination is full', () => {
      const sourceFlask = new Flask([ 0, 0, 0, 0 ]);
      const destinationFlask = new Flask([ 0, 0, 0, 0 ]);
      assert.equal(Flask.isTransfusionValid(sourceFlask, destinationFlask), false);
    });

    it('should return false if top layers are not the same', () => {
      const sourceFlask = new Flask([ 0, 1 ]);
      const destinationFlask = new Flask([ 1, 0 ]);
      assert.equal(Flask.isTransfusionValid(sourceFlask, destinationFlask), false);
    });

    it('should return true if destination is empty', () => {
      const sourceFlask = new Flask([ 0, 1, 0, 1 ]);
      const destinationFlask = new Flask([]);
      assert.equal(Flask.isTransfusionValid(sourceFlask, destinationFlask), true);
    });

    it('should return true if top layers are the same', () => {
      const sourceFlask = new Flask([ 0, 1 ]);
      const destinationFlask = new Flask([ 0, 1 ]);
      assert.equal(Flask.isTransfusionValid(sourceFlask, destinationFlask), true);
    });
  });

  describe('transfuse', () => {
    it('should throw error if transfusion is invalid', () => {
      const sourceFlask = new Flask([ 0, 1, 1 ]);
      const destinationFlask = new Flask([ 2 ]);
      assert.throws(() => Flask.transfuse(sourceFlask, destinationFlask));
    });

    it('should pop layers from source', () => {
      const sourceFlask = new Flask([ 0, 1, 1 ]);
      const expectedSourceLayers = [ 0 ];
      const destinationFlask = new Flask([ 1 ]);
      Flask.transfuse(sourceFlask, destinationFlask);
      assert.deepEqual(sourceFlask.layers, expectedSourceLayers);
    });

    it('should push layers to destination', () => {
      const sourceFlask = new Flask([ 0, 1, 1 ]);
      const destinationFlask = new Flask([ 1 ]);
      const expectedDestinationLayers = [ 1, 1, 1 ];
      Flask.transfuse(sourceFlask, destinationFlask);
      assert.deepEqual(destinationFlask.layers, expectedDestinationLayers);
    });

    it('should pop layers from source if avaliable capacity is limited', () => {
      const sourceFlask = new Flask([ 0, 1, 1 ]);
      const expectedSourceLayers = [ 0, 1 ];
      const destinationFlask = new Flask([ 1, 1, 1 ]);
      Flask.transfuse(sourceFlask, destinationFlask);
      assert.deepEqual(sourceFlask.layers, expectedSourceLayers);
    });

    it('should push layers to destination if avaliable capacity is limited', () => {
      const sourceFlask = new Flask([ 0, 1, 1 ]);
      const destinationFlask = new Flask([ 1, 1, 1 ]);
      const expectedDestinationLayers = [ 1, 1, 1, 1 ];
      Flask.transfuse(sourceFlask, destinationFlask);
      assert.deepEqual(destinationFlask.layers, expectedDestinationLayers);
    });
  });
});
