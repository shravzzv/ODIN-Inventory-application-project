const cloudinary = require('cloudinary').v2

// cloudinary setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

/**
 * Uploads a given image file to Cloudinary.
 * @param {String} imagePath - The complete local path to an image.
 * @returns {String} - The url of the uploaded image on cloudinary.
 */
exports.getUploadedUrl = async (imagePath) => {
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

/**
 * Deletes an uploaded image from cloudinary.
 * @param {string} url - A complete valid url of an image uploaded to cloudinary. Looks like https://res.cloudinary.com/dmt9s5xlh/image/upload/v1714380904/3e1a42fa2bb2-GTAIV_hero.jpg.
 */
exports.deleteUploadedFile = async (url) => {
  // publicId is the filename without .ext of the uploaded file
  const publicId = url.split('/').at(-1).split('.')[0]

  const options = {
    invalidate: true, // removes cached copies from the CDN
  }
  try {
    await cloudinary.uploader.destroy(publicId, options)
  } catch (error) {
    console.error(error)
  }
}
