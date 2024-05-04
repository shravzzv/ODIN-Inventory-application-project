const mongoose = require('mongoose')

const Schema = mongoose.Schema

const CategorySchema = new Schema({
  name: { type: String, required: true, minLength: 3, maxLength: 32 },
  description: { type: String, required: true, minLength: 3, maxLength: 500 },
  imgUrl: { type: String },
  isFeatured: { type: Boolean, default: false },
})

CategorySchema.virtual('url').get(function () {
  return `/inventory/category/${this._id}`
})

module.exports = mongoose.model('Category', CategorySchema)
