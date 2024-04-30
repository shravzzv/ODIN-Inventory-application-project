const Item = require('../models/item')
const Category = require('../models/category')
const multerUtils = require('../utils/multer.util')
const asyncHandler = require('express-async-handler')
const cloudinaryUtils = require('../utils/cloudinary.util')
const { body, validationResult } = require('express-validator')
const fs = require('fs')

// Display list of all Items.
exports.itemList = asyncHandler(async (req, res) => {
  const items = await Item.find({}, 'name titleImgUrl').sort({ name: 1 }).exec()

  res.render('itemList', {
    title: 'Items List',
    items,
  })
})

// Display detail page for a specific Item.
exports.itemDetail = asyncHandler(async (req, res, next) => {
  const item = await Item.findById(req.params.id)
    .populate('category', 'name')
    .exec()

  if (item === null) {
    const error = new Error('Item not found!')
    error.status = 404
    return next(error)
  }

  res.render('itemDetail', {
    title: item.name,
    item,
  })
})

// Display Item create form on GET.
exports.itemCreateGet = asyncHandler(async (req, res) => {
  // display categories for selection
  const categories = await Category.find({}, 'name').sort({ name: 1 }).exec()

  res.render('itemForm', {
    title: 'Create Item',
    categories,
  })
})

// Handle Item create on POST.
exports.itemCreatePost = [
  // upload the images using multer
  multerUtils.upload.fields([
    {
      name: 'titleImg',
      maxCount: 1,
    },
    {
      name: 'heroImg',
      maxCount: 1,
    },
  ]),

  // Convert the categories into an array.
  (req, res, next) => {
    if (!Array.isArray(req.body.category)) {
      req.body.category =
        typeof req.body.category === 'undefined' ? [] : [req.body.category]
    }
    next()
  },

  // Validate and sanitize fields.
  body('name')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Name must be atleast 3 characters long.')
    .isLength({ max: 32 })
    .withMessage('Name must be a maximum of 32 characters long.')
    .escape(),

  body('description')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Description must be atleast 3 characters long.')
    .isLength({ max: 500 })
    .withMessage('Description must be a maxmimum of 500 characters long.')
    .escape(),

  body('price')
    .toInt()
    .isLength({ min: 1 })
    .withMessage('The minimum price should be 1.')
    .escape(),

  body('numInStock')
    .toInt()
    .isLength({ min: 0 })
    .withMessage('The minimum number of stock should be 0.')
    .escape(),

  body('category')
    .isArray({ min: 1 })
    .withMessage('You should select at least one category')
    .escape(),

  body('publisher')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Publisher name must be atleast 3 characters long.')
    .isLength({ max: 32 })
    .withMessage('Publisher name must be a maximum of 32 characters long.')
    .escape(),

  body('rating')
    .toFloat()
    .isLength({ min: 0 })
    .withMessage('The minimum rating should be 0.')
    .isLength({ max: 5 })
    .withMessage('The maximum rating should be 5.')
    .escape(),

  body('releaseDate', 'Invalid date').isISO8601().toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res) => {
    const errors = validationResult(req)
    const imageErrors = []

    // create Item object with sanitized data
    const item = new Item({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      numInStock: req.body.numInStock,
      category: req.body.category,
      publisher: req.body.publisher,
      releaseDate: req.body.releaseDate,
      rating: req.body.rating,
      heroImgUrl: req.body.heroImgUrl || '',
      titleImgUrl: req.body.titleImgUrl || '',
    })

    const handleImage = async (image) => {
      if (!image.mimetype.startsWith('image/')) {
        imageErrors.push(
          new Error(`Please upload an image for the ${image.fieldname}.`)
        )
      } else {
        item[`${image.fieldname}Url`] = await cloudinaryUtils.getUploadedUrl(
          image.path
        )
      }
      fs.unlink(image.path, (err) => err && console.log(err))
    }
    for (const key in req.files) {
      await handleImage(req.files[key][0])
    }

    if (!errors.isEmpty() || imageErrors.length) {
      // mark selected categories as checked
      const categories = await Category.find({}, 'name')
        .sort({ name: 1 })
        .exec()
      categories.forEach(
        (category) =>
          item.category.includes(category._id) && (category.checked = true)
      )

      res.render('itemForm', {
        title: 'Create Item',
        item,
        categories,
        errors: [...errors.array(), ...imageErrors],
      })
    } else {
      await item.save()
      res.redirect(item.url)
    }
  }),
]

// Display Item delete form on GET.
exports.itemDeleteGet = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id)

  if (item === null) {
    res.redirect('/inventory/items')
  }

  res.render('itemDelete', {
    title: 'Delete Item',
    item,
  })
})

// Handle Item delete on POST.
exports.itemDeletePost = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id, 'titleImgUrl heroImgUrl')

  await Promise.all([
    cloudinaryUtils.deleteUploadedFile(item.titleImgUrl),
    cloudinaryUtils.deleteUploadedFile(item.heroImgUrl),
    await Item.findByIdAndDelete(req.body.itemId),
  ])
  res.redirect('/inventory/items')
})

// Display Item update form on GET.
exports.itemUpdateGet = asyncHandler(async (req, res, next) => {
  const [item, categories] = await Promise.all([
    await Item.findById(req.params.id).exec(),
    await Category.find({}, 'name').sort({ name: 1 }).exec(),
  ])

  if (item === null) {
    const err = new Error('Item not found!')
    err.status = 404
    return next(err)
  }

  // mark selected categories as checked
  categories.forEach(
    (category) =>
      item.category.includes(category._id) && (category.checked = true)
  )

  res.render('itemForm', {
    title: 'Update Item',
    categories,
    item,
  })
})

// Handle Item update on POST.
exports.itemUpdatePost = [
  // upload the images using multer
  multerUtils.upload.fields([
    {
      name: 'titleImg',
      maxCount: 1,
    },
    {
      name: 'heroImg',
      maxCount: 1,
    },
  ]),

  // Convert the categories into an array.
  (req, res, next) => {
    if (!Array.isArray(req.body.category)) {
      req.body.category =
        typeof req.body.category === 'undefined' ? [] : [req.body.category]
    }
    next()
  },

  // Validate and sanitize fields.
  body('name')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Name must be atleast 3 characters long.')
    .isLength({ max: 32 })
    .withMessage('Name must be a maximum of 32 characters long.')
    .escape(),

  body('description')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Description must be atleast 3 characters long.')
    .isLength({ max: 500 })
    .withMessage('Description must be a maxmimum of 500 characters long.')
    .escape(),

  body('price')
    .toInt()
    .isLength({ min: 1 })
    .withMessage('The minimum price should be 1.')
    .escape(),

  body('numInStock')
    .toInt()
    .isLength({ min: 0 })
    .withMessage('The minimum number of stock should be 0.')
    .escape(),

  body('category')
    .isArray({ min: 1 })
    .withMessage('You should select at least one category')
    .escape(),

  body('publisher')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Publisher name must be atleast 3 characters long.')
    .isLength({ max: 32 })
    .withMessage('Publisher name must be a maximum of 32 characters long.')
    .escape(),

  body('rating')
    .toFloat()
    .isLength({ min: 0 })
    .withMessage('The minimum rating should be 0.')
    .isLength({ max: 5 })
    .withMessage('The maximum rating should be 5.')
    .escape(),

  body('releaseDate', 'Invalid date').isISO8601().toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res) => {
    const errors = validationResult(req)
    const imageErrors = []

    const item = new Item({
      _id: req.params.id,
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      numInStock: req.body.numInStock,
      category: req.body.category,
      publisher: req.body.publisher,
      releaseDate: req.body.releaseDate,
      rating: req.body.rating,
      heroImgUrl: req.body.heroImgUrl || '',
      titleImgUrl: req.body.titleImgUrl || '',
    })

    const handleImage = async (image) => {
      if (!image.mimetype.startsWith('image/')) {
        imageErrors.push(
          new Error(
            `Please upload a valid image to update the ${image.fieldname}.`
          )
        )
      } else {
        const [newImgUrl] = await Promise.all([
          cloudinaryUtils.getUploadedUrl(image.path),
          cloudinaryUtils.deleteUploadedFile(item[`${image.fieldname}Url`]),
        ])
        item[`${image.fieldname}Url`] = newImgUrl
      }
      fs.unlink(image.path, (err) => err && console.log(err))
    }
    for (const key in req.files) {
      await handleImage(req.files[key][0])
    }

    if (!errors.isEmpty() || imageErrors.length) {
      const categories = await Category.find({}, 'name')
        .sort({ name: 1 })
        .exec()
      categories.forEach(
        (category) =>
          item.category.includes(category._id) && (category.checked = true)
      )

      res.render('itemForm', {
        title: 'Update Item',
        item,
        categories,
        errors: [...errors.array(), ...imageErrors],
      })
    } else {
      const updatedItem = await Item.findByIdAndUpdate(req.params.id, item, {})
      res.redirect(updatedItem.url)
    }
  }),
]
