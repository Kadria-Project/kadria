import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

const MAX_FILES = 5
const MAX_FILE_SIZE = 8 * 1024 * 1024
const MAX_TOTAL_SIZE = 25 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files').filter((file): file is File => file instanceof File)

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      )
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, error: 'Too many files' },
        { status: 400 }
      )
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Upload too large' },
        { status: 400 }
      )
    }

    const invalidFile = files.find((file) => !ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE)
    if (invalidFile) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type or size' },
        { status: 400 }
      )
    }

    const uploadPromises = files.map(async (file) => {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64 = buffer.toString('base64')
      const dataURI = `data:${file.type};base64,${base64}`

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'kadria/projets',
        resource_type: 'auto',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1200, crop: 'limit' }
        ]
      })

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      }
    })

    const uploaded = await Promise.all(uploadPromises)

    return NextResponse.json({ success: true, files: uploaded })
  } catch (error) {
    console.error('[UPLOAD] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: 'Erreur upload' },
      { status: 500 }
    )
  }
}
