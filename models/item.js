const mongoose = require('mongoose')

const Schema = mongoose.Schema

const ItemSchema = new Schema({
  name: { type: String, required: true, minLength: 3, maxLength: 32 },

  description: { type: String, required: true, minLength: 3, maxLength: 500 },

  price: { type: Number, min: 1, required: true },

  numInStock: { type: Number, min: 0, required: true },

  category: [{ type: Schema.Types.ObjectId, ref: 'Category' }],

  titleImgUrl: { type: String },

  heroImgUrl: { type: String },

  publisher: { type: String, minLength: 3, maxLength: 32 },

  releaseDate: { type: Date },

  rating: { type: Number, min: 0, max: 5, default: 1 },

  isFeatured: { type: Boolean, default: false },
})

ItemSchema.virtual('url').get(function () {
  return `/inventory/item/${this._id}`
})

ItemSchema.virtual('releaseDateFormatted').get(function () {
  return this.releaseDate.toDateString() // format as: Mon 3 April 2000
})

ItemSchema.virtual('releaseDateForDateInput').get(function () {
  const month =
    this.releaseDate.getMonth() + 1 < 10
      ? `0${this.releaseDate.getMonth() + 1}`
      : this.releaseDate.getMonth() + 1

  const date =
    this.releaseDate.getDate() < 10
      ? `0${this.releaseDate.getDate()}`
      : this.releaseDate.getDate()

  const dateString = `${this.releaseDate.getFullYear()}-${month}-${date}`

  return dateString
  // format as: 'YYYY-MM-DD' => 2000-04-03
})

module.exports = mongoose.model('Item', ItemSchema)
