const mongoose = require('mongoose')

const Schema = mongoose.Schema

const ItemSchema = new Schema({
  name: { type: String, required: true, minLength: 3, maxLength: 32 },
  description: { type: String, required: true, minLength: 3, maxLength: 500 },
  price: { type: Number, min: 1, required: true },
  number_in_stock: { type: Number, min: 0, required: true },
  category: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
})

ItemSchema.virtual('url').get(function () {
  return `/inventory/item/${this._id}`
})

module.exports = mongoose.model('Item', ItemSchema)
