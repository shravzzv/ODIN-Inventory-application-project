const { body, validationResult } = require('express-validator')
const asyncHandler = require('express-async-handler')
const Category = require('../models/category')
const cloudinary = require('cloudinary').v2
const Item = require('../models/item')
const { v4: uuidv4 } = require('uuid')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// create an uploads folder if not already present
if (!fs.existsSync('./public/uploads')) fs.mkdirSync('./public/uploads')

const multerStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'public/uploads')
  },
  filename(req, file, cb) {
    const { name } = path.parse(file.originalname)
    const filename = `${uuidv4()}-${name.replaceAll('.', '_')}`
    cb(null, filename)
  },
})

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 5 * 1000000 },
  // 5mb limit per image
})

// cloudinary setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

const getUploadedUrl = async (imagePath) => {
  const options = {
    use_filename: true,
    unique_filename: false,
    overwrite: true,
  }

  try {
    const result = await cloudinary.uploader.upload(imagePath, options)
    return result.secure_url
  } catch (error) {
    console.error(error)
  }
}

const deleteUploadedFile = async (publicId) => {
  // publicId is the filename without .ext of the uploaded file here

  const options = {
    invalidate: true, // removes cached copies from the CDN
  }
  try {
    await cloudinary.uploader.destroy(publicId, options)
  } catch (error) {
    console.error(error)
  }
}

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
  // upload file using multer
  upload.single('file'),

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
      imgUrl: req.body.imgUrl || '',
    })

    if (req.file) {
      // handle invalid image file
      if (!req.file.mimetype.startsWith('image/')) {
        fs.unlink(req.file.path, (err) => err && console.log(err))

        const err = [new Error('Please upload an image.')]
        if (!errors.isEmpty()) err.push(...errors.array())

        res.render('categoryForm', {
          title: 'Create Category',
          category,
          errors: err,
        })
        return
      }

      // handle valid image file
      category.imgUrl = await getUploadedUrl(req.file.path)
      fs.unlink(req.file.path, (err) => err && console.log(err))
    }

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
    if (category.imgUrl)
      await deleteUploadedFile(category.imgUrl.split('/').at(-1).split('.')[0])
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
  // upload file using multer
  upload.single('file'),

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
      imgUrl: req.body.imgUrl,
    })

    if (req.file) {
      // handle invalid image file
      if (!req.file.mimetype.startsWith('image/')) {
        fs.unlink(req.file.path, (err) => err && console.log(err))

        const err = [new Error('Please upload an image.')]
        if (!errors.isEmpty()) err.push(...errors.array())

        res.render('categoryForm', {
          title: 'Update Category',
          category,
          errors: err,
        })
        return
      }

      // handle valid image file
      const [newImgUrl] = await Promise.all([
        getUploadedUrl(req.file.path),
        deleteUploadedFile(category.imgUrl.split('/').at(-1).split('.')[0]),
      ])
      category.imgUrl = newImgUrl
      fs.unlink(req.file.path, (err) => err && console.log(err))
    }

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
