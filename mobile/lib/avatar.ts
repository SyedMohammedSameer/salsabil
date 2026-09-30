import { uploadAvatarBytes } from '@/lib/api/profile'

// Choosing a profile photo. expo-image-picker is a native module, so a build
// made before it was added does not contain it. It is loaded only when the
// user taps "Change photo", and a missing module becomes a clear message
// instead of a crash.

export class PickerUnavailableError extends Error {
  constructor() {
    super('Photos need the latest version of the app. Update Salsabil to add a profile picture.')
  }
}

type PickerModule = typeof import('expo-image-picker')

function loadPicker(): PickerModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-image-picker') as PickerModule
    if (typeof mod?.launchImageLibraryAsync !== 'function') throw new Error('missing')
    return mod
  } catch {
    throw new PickerUnavailableError()
  }
}

/** Let the user pick and crop a photo, upload it, and return its URL (null if cancelled). */
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const picker = loadPicker()
  const perm = await picker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) throw new Error('Allow access to your photos to choose a profile picture.')
  const result = await picker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  })
  if (result.canceled || !result.assets?.length) return null
  const asset = result.assets[0]
  const bytes = await (await fetch(asset.uri)).arrayBuffer()
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('That photo is too large. Choose one under 5 MB.')
  return uploadAvatarBytes(userId, bytes, asset.mimeType ?? 'image/jpeg')
}
