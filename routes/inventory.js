const express = require('express')
const router = express.Router()
const categoryController = require('../controllers/categoryController')
const itemController = require('../controllers/itemController')

// GET inventory home page.
router.get('/', categoryController.index)

// * CATEGORY ROUTES

// GET request for creating a Category. NOTE this must come before the route that displays a category using id.
router.get('/category/create', categoryController.categoryCreateGet)

// POST request for creating a Category.
router.post('/category/create', categoryController.categoryCreatePost)

// GET request to delete a Category.
router.get('/category/:id/delete', categoryController.categoryDeleteGet)

// POST request to delete a Category.
router.post('/category/:id/delete', categoryController.categoryDeletePost)

// GET request to update a Category.
router.get('/category/:id/update', categoryController.categoryUpdateGet)

// POST request to update a Category.
router.post('/category/:id/update', categoryController.categoryUpdatePost)

// GET request for a specific Category.
router.get('/category/:id', categoryController.categoryDetail)

// GET request for a list of all the Categories.
router.get('/categories', categoryController.categoryList)

// * ITEM ROUTES

// GET request for creating an Item. NOTE this must come before the route that displays an Item using id.
router.get('/item/create', itemController.itemCreateGet)

// POST request for creating a Category.
router.post('/item/create', itemController.itemCreatePost)

// GET request to delete a Category.
router.get('/item/:id/delete', itemController.itemDeleteGet)

// POST request to delete a Category.
router.post('/item/:id/delete', itemController.itemDeletePost)

// GET request to update a Category.
router.get('/item/:id/update', itemController.itemUpdateGet)

// POST request to update a Category.
router.post('/item/:id/update', itemController.itemUpdatePost)

// GET request for a specific Category.
router.get('/item/:id', itemController.itemDetail)

// GET request for a list of all the Categories.
router.get('/items', itemController.itemList)

module.exports = router
