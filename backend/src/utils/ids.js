const mongoose = require('mongoose');

const isValidObjectId = (id) => Boolean(id) && mongoose.Types.ObjectId.isValid(id);

const assertObjectId = (id, fieldName = 'id') => {
  if (!isValidObjectId(id)) {
    const err = new Error(`Invalid ${fieldName}`);
    err.statusCode = 400;
    throw err;
  }
};

module.exports = { isValidObjectId, assertObjectId };
