const Category = require('../models/category')
const Item = require('../models/item')
const asyncHandler = require('express-async-handler')
const { body, validationResult } = require('express-validator')

exports.index = asyncHandler(async (req, res) => {
  // Get total counts of categories and items in parallel
  const [categoriesCount, itemsCount] = await Promise.all([
    Category.countDocuments({}).exec(),
    Item.countDocuments({}).exec(),
  ])

  res.render('index', {
    title: 'Inventory Home',
    categoriesCount,
    itemsCount,
  })
})

// Display list of all the Categories.
exports.categoryList = asyncHandler(async (req, res) => {
  const categories = await Category.find({}, 'name').sort({ name: 1 }).exec()

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
    Item.find({ category: req.params.id }, 'name').sort({ name: 1 }).exec(),
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

    // create Category object with sanitized data
    const category = new Category({
      name: req.body.name,
      description: req.body.description,
    })

    if (!errors.isEmpty()) {
      // render form again with sanitized value/error messages
      res.render('categoryForm', {
        title: 'Create Category',
        category,
        errors: errors.array(),
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
    Item.find({ category: req.params.id }, 'name description').exec(),
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
    Item.find({ category: req.params.id }, 'name description').exec(),
  ])

  if (items.length > 0) {
    res.render('categoryDelete', {
      title: 'Delete Category',
      category,
      items,
    })
  } else {
    await Category.findByIdAndDelete(req.body.categoryId)
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

    // create new Category object with sanitized data
    const category = new Category({
      _id: req.params.id,
      name: req.body.name,
      description: req.body.description,
    })

    if (!errors.isEmpty()) {
      res.render('categoryForm', {
        title: 'Update Category',
        category,
        errors: errors.array(),
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

// * the id in the referencing field isn't the same as the _id of the reference field. They are different, but referencing still works.
// to reference, directly pasting the _id from a category into the document to the category field of an item wouldn't work.
/**
 * const category1 = new Category({})
 * const category2 = new Category({})
 *
 * const item = new Items({
 *  category: category1._id
 *  // or
 *  category: [category1._id, category2._id]
 * })
 *
 */
