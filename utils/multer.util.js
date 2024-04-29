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
    const { name, ext } = path.parse(file.originalname)
    const filename = `${uuidv4()}-${name.replaceAll('.', '_')}${ext}`
    cb(null, filename)
  },
})

const fileFilter = (req, file, cb) => {
  cb(null, true) // allowing all files
}

exports.upload = multer({
  storage: multerStorage,
  limits: { fileSize: 5 * 1000000 }, // 5mb limit per image
  fileFilter,
})
