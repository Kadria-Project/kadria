import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { getSession } from '@/src/lib/auth-utils'

// Upload d'images de marque (logo entreprise, avatar assistant, logo marque
// blanche) pour /parametres. Reutilise exactement le meme pattern Cloudinary
// que app/api/upload/route.ts (photos de projet) et app/api/devis/[id]/finalize
// (PDF devis) : meme cloudinary.config(), memes variables d'env.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4 Mo

const ALLOWED_TARGETS = new Set(['company_logo', 'assistant_avatar', 'white_label_logo'])

const TARGET_FOLDER: Record<string, string> = {
  company_logo: 'company-logo',
  assistant_avatar: 'assistant-avatar',
  white_label_logo: 'white-label-logo',
}

// Verification du type MIME reel via les "magic bytes" du fichier, pas
// seulement le Content-Type declare par le navigateur (qui peut etre
// falsifie). On evite volontairement le SVG (risque XSS si mal sanitize).
const SIGNATURES: Array<{ mime: string; ext: string; check: (buf: Buffer) => boolean }> = [
  {
    mime: 'image/png',
    ext: 'png',
    check: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a,
  },
  {
    mime: 'image/jpeg',
    ext: 'jpg',
    check: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    check: (buf) =>
      buf.length >= 12 &&
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50,
  },
]

function detectImageType(buffer: Buffer): { mime: string; ext: string } | null {
  for (const sig of SIGNATURES) {
    if (sig.check(buffer)) return { mime: sig.mime, ext: sig.ext }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifie' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const target = formData.get('target')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    if (typeof target !== 'string' || !ALLOWED_TARGETS.has(target)) {
      return NextResponse.json(
        { success: false, error: 'Cible invalide' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Fichier trop lourd (4 Mo maximum)' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const detected = detectImageType(buffer)
    if (!detected) {
      return NextResponse.json(
        { success: false, error: 'Format de fichier non supporte. Utilisez PNG, JPG ou WEBP.' },
        { status: 400 }
      )
    }

    // Toujours base sur l'artisanId de la session, jamais sur le payload client.
    const artisanId = session.artisanId
    const folder = `artisans/${artisanId}/branding`
    const publicId = `${TARGET_FOLDER[target]}-${Date.now()}`

    const base64 = buffer.toString('base64')
    const dataURI = `data:${detected.mime};base64,${base64}`

    const result = await cloudinary.uploader.upload(dataURI, {
      folder,
      public_id: publicId,
      resource_type: 'image',
      overwrite: true,
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 800, crop: 'limit' },
      ],
    })

    return NextResponse.json({ success: true, url: result.secure_url })
  } catch (error) {
    console.error('[ARTISAN BRANDING UPLOAD] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: 'Erreur upload' },
      { status: 500 }
    )
  }
}
