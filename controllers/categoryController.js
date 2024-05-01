const { body, validationResult } = require('express-validator')
const cloudinaryUtils = require('../utils/cloudinary.util')
const asyncHandler = require('express-async-handler')
const multerUtils = require('../utils/multer.util')
const Category = require('../models/category')
const Item = require('../models/item')
const fs = require('fs')

// Inventory Home page
exports.index = asyncHandler(async (req, res) => {
  const [featuredCategories, featuredItems] = await Promise.all([
    Category.find({}, 'name imgUrl').limit(4).exec(),
    Item.find({}, 'name heroImgUrl').sort({ name: 1 }).limit(2).exec(),
    // todo: make featured items more concrete
  ])

  res.render('index', {
    title: 'Video Games Inventory',
    featuredCategories,
    featuredItems,
  })
})

// Display list of all the Categories.
exports.categoryList = asyncHandler(async (req, res) => {
  const categories = await Category.find({}, 'name imgUrl')
    .sort({ name: 1 })
    .exec()

  res.render('categoryList', {
    title: 'Category List',
    categories,
  })
})

// Display detail page for a specific Category.
exports.categoryDetail = asyncHandler(async (req, res, next) => {
  // Get details of the category, and items of that category in parallel.
  const [category, items] = await Promise.all([
    Category.findById(req.params.id).sort({ name: 1 }).exec(),
    Item.find({ category: req.params.id }, 'name titleImgUrl')
      .sort({ name: 1 })
      .exec(),
  ])

  if (category === null) {
    const err = new Error('Category not found!')
    err.status = 404
    return next(err)
  }

  res.render('categoryDetail', {
    title: category.name,
    category,
    items,
  })
})

// Display Category create form on GET. Doesn't require asynchronosity.
exports.categoryCreateGet = (req, res) => {
  res.render('categoryForm', {
    title: 'Create Category',
  })
}

// Handle Category create on POST.
exports.categoryCreatePost = [
  // upload file using multer
  multerUtils.upload.single('file'),

  // validate and sanitize fields.
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

  // process request
  asyncHandler(async (req, res) => {
    // extract the validation errors
    const errors = validationResult(req)
    const imageError = []

    // create Category object with sanitized data
    const category = new Category({
      name: req.body.name,
      description: req.body.description,
      imgUrl: req.body.imgUrl || '',
    })

    if (req.file) {
      if (!req.file.mimetype.startsWith('image/')) {
        imageError.push(new Error('Please upload an image.'))
      } else {
        category.imgUrl = await cloudinaryUtils.getUploadedUrl(req.file.path)
      }
      fs.unlink(req.file.path, (err) => err && console.log(err))
    }

    if (!errors.isEmpty() || imageError.length) {
      res.render('categoryForm', {
        title: 'Create Category',
        category,
        errors: [...errors.array(), ...imageError],
      })
    } else {
      await category.save()
      res.redirect(category.url)
    }
  }),
]

// Display Category delete form on GET.
exports.categoryDeleteGet = asyncHandler(async (req, res) => {
  const [category, items] = await Promise.all([
    Category.findById(req.params.id).exec(),
    Item.find({ category: req.params.id }, 'name titleImgUrl').exec(),
  ])

  if (category === null) {
    res.redirect('/inventory/categories')
  }

  res.render('categoryDelete', {
    title: 'Delete Category',
    category,
    items,
  })
})

// Handle Category delete on POST.
exports.categoryDeletePost = asyncHandler(async (req, res) => {
  const [category, items] = await Promise.all([
    Category.findById(req.params.id).exec(),
    Item.find({ category: req.params.id }, 'name titleImgUrl').exec(),
  ])

  if (items.length > 0) {
    res.render('categoryDelete', {
      title: 'Delete Category',
      category,
      items,
    })
  } else {
    await Promise.all([
      cloudinaryUtils.deleteUploadedFile(category.imgUrl),
      Category.findByIdAndDelete(req.body.categoryId),
    ])
    res.redirect('/inventory/categories')
  }
})

// Display Category update form on GET.
exports.categoryUpdateGet = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id)

  if (category === null) {
    const err = new Error('Category not found')
    err.status = 404
    return next(err)
  }

  res.render('categoryForm', {
    title: 'Update Category',
    category,
  })
})

// Handle Category update on POST.
exports.categoryUpdatePost = [
  // upload file using multer
  multerUtils.upload.single('file'),

  // validate and sanitize the name and description fields
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

  // process request after validation and sanitization
  asyncHandler(async (req, res) => {
    const errors = validationResult(req)
    const imageError = []

    // create new Category object with sanitized data
    const category = new Category({
      _id: req.params.id,
      name: req.body.name,
      description: req.body.description,
      imgUrl: req.body.imgUrl,
    })

    if (req.file) {
      if (!req.file.mimetype.startsWith('image/')) {
        imageError.push(new Error('Please upload an image.'))
      } else {
        const [newImgUrl] = await Promise.all([
          cloudinaryUtils.getUploadedUrl(req.file.path),
          cloudinaryUtils.deleteUploadedFile(category.imgUrl),
        ])
        category.imgUrl = newImgUrl
      }
      fs.unlink(req.file.path, (err) => err && console.log(err))
    }

    if (!errors.isEmpty() || imageError.length) {
      res.render('categoryForm', {
        title: 'Update Category',
        category,
        errors: [...errors.array(), ...imageError],
      })
      return
    } else {
      const updatedCategory = await Category.findByIdAndUpdate(
        req.params.id,
        category,
        {}
      )
      res.redirect(updatedCategory.url)
    }
  }),
]
