import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { enforceRateLimit, enforceSameOrigin } from '@/lib/security/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_SVG_SIZE_BYTES = 512 * 1024;
const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']);
const extensionByMimeType: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp'
};

const toSetupMessage = (message: string) => {
  if (message.toLowerCase().includes('bucket')) {
    return 'Storage bucket "logos" is missing. Create it in Supabase Storage first.';
  }
  if (message.includes('logo_url')) {
    return 'Column users.logo_url is missing. Run: alter table users add column logo_url text;';
  }
  return 'Upload failed. Please try again.';
};

const hasPngSignature = (bytes: Uint8Array) =>
  bytes.length >= 8 &&
  bytes[0] === 0x89 &&
  bytes[1] === 0x50 &&
  bytes[2] === 0x4e &&
  bytes[3] === 0x47 &&
  bytes[4] === 0x0d &&
  bytes[5] === 0x0a &&
  bytes[6] === 0x1a &&
  bytes[7] === 0x0a;

const hasJpegSignature = (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

const hasWebpSignature = (bytes: Uint8Array) => {
  if (bytes.length < 12) return false;
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  return riff === 'RIFF' && webp === 'WEBP';
};

const hasSafeSvgContent = (bytes: Uint8Array) => {
  const sample = new TextDecoder().decode(bytes.slice(0, 8192)).toLowerCase();
  if (!sample.includes('<svg')) return false;
  if (sample.includes('<script')) return false;
  if (sample.includes('javascript:')) return false;
  if (sample.includes('onload=')) return false;
  return true;
};

const validateLogoFile = (file: File, bytes: Uint8Array) => {
  if (!allowedMimeTypes.has(file.type)) {
    return 'Please upload a PNG, JPG, SVG or WEBP';
  }

  if (file.size > MAX_SIZE_BYTES) {
    return 'Logo must be under 2MB';
  }

  if (file.type === 'image/svg+xml' && file.size > MAX_SVG_SIZE_BYTES) {
    return 'SVG logos must be under 512KB';
  }

  const validByType =
    (file.type === 'image/png' && hasPngSignature(bytes)) ||
    (file.type === 'image/jpeg' && hasJpegSignature(bytes)) ||
    (file.type === 'image/webp' && hasWebpSignature(bytes)) ||
    (file.type === 'image/svg+xml' && hasSafeSvgContent(bytes));

  if (!validByType) {
    return 'Uploaded file content does not match the selected image type';
  }

  return null;
};

export async function POST(request: Request) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const { userId, sessionId } = await auth();
    if (!userId || !sessionId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = enforceRateLimit({
      request,
      key: 'user-logo-post',
      maxRequests: 15,
      windowMs: 5 * 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const supabaseServer = createSupabaseServerClient();
    const formData = await request.formData();
    const file = formData.get('file');

    const isFileLike =
      !!file &&
      typeof file === 'object' &&
      'arrayBuffer' in file &&
      'type' in file &&
      'size' in file;

    if (!isFileLike) {
      return NextResponse.json({ message: 'Missing file' }, { status: 400 });
    }

    const uploadFile = file as File;

    const buffer = await uploadFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const validationError = validateLogoFile(uploadFile, bytes);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const extension = extensionByMimeType[uploadFile.type];
    const objectPath = `logos/${userId}/logo.${extension}`;

    const { data: existingFiles, error: listError } = await supabaseServer.storage.from('logos').list(`logos/${userId}`);
    if (listError && listError.message) {
      return NextResponse.json({ message: toSetupMessage(listError.message) }, { status: 500 });
    }

    if (existingFiles && existingFiles.length > 0) {
      const existingPaths = existingFiles.map((existingFile) => `logos/${userId}/${existingFile.name}`);
      await supabaseServer.storage.from('logos').remove(existingPaths);
    }

    const { error: uploadError } = await supabaseServer.storage.from('logos').upload(objectPath, buffer, {
      upsert: true,
      contentType: uploadFile.type,
      cacheControl: '3600'
    });

    if (uploadError) {
      return NextResponse.json({ message: toSetupMessage(uploadError.message) }, { status: 500 });
    }

    const {
      data: { publicUrl }
    } = supabaseServer.storage.from('logos').getPublicUrl(objectPath);

    const { error: userUpdateError } = await supabaseServer
      .from('users')
      .update({ logo_url: publicUrl })
      .eq('clerk_id', userId);

    if (userUpdateError) {
      return NextResponse.json({ message: toSetupMessage(userUpdateError.message) }, { status: 500 });
    }

    return NextResponse.json({ logo_url: publicUrl }, { status: 200 });
  } catch (error) {
    console.error('[POST /api/user/logo] unexpected error', error);
    return NextResponse.json({ message: 'Upload failed. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const { userId, sessionId } = await auth();
    if (!userId || !sessionId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitError = enforceRateLimit({
      request,
      key: 'user-logo-delete',
      maxRequests: 20,
      windowMs: 5 * 60 * 1000,
      subject: userId
    });
    if (rateLimitError) return rateLimitError;

    const supabaseServer = createSupabaseServerClient();

    const { data: files, error: listError } = await supabaseServer.storage.from('logos').list(`logos/${userId}`);

    if (listError) {
      return NextResponse.json({ message: toSetupMessage(listError.message) }, { status: 500 });
    }

    if (files && files.length > 0) {
      const objectPaths = files.map((file) => `logos/${userId}/${file.name}`);
      const { error: deleteError } = await supabaseServer.storage.from('logos').remove(objectPaths);

      if (deleteError) {
        return NextResponse.json({ message: toSetupMessage(deleteError.message) }, { status: 500 });
      }
    }

    const { error: userUpdateError } = await supabaseServer
      .from('users')
      .update({ logo_url: null })
      .eq('clerk_id', userId);

    if (userUpdateError) {
      return NextResponse.json({ message: toSetupMessage(userUpdateError.message) }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/user/logo] unexpected error', error);
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
