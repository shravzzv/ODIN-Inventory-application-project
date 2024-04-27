const cloudinary = require('cloudinary').v2

// cloudinary setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

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

exports.deleteUploadedFile = async (publicId) => {
  // publicId is the filename without .ext of the uploaded file

  const options = {
    invalidate: true, // removes cached copies from the CDN
  }
  try {
    await cloudinary.uploader.destroy(publicId, options)
  } catch (error) {
    console.error(error)
  }
}
