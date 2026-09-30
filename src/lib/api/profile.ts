import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/database.types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function updateProfile(
  userId: string,
  updates: Partial<
    Pick<Profile, 'username' | 'display_name' | 'avatar_url' | 'timezone' | 'onboarded'>
  >,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('username', username)
  if (error) throw error
  return (count ?? 0) === 0
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

/**
 * Upload a profile photo from raw bytes (the phone app has no File object).
 *
 * Stored under avatars/<user>/, the folder the storage policy lets each user
 * write to. The policy allows insert and delete but not update, so a new photo
 * gets a new name instead of overwriting, and the previous ones are removed
 * afterwards. The new name also means no stale cached image.
 */
export async function uploadAvatarBytes(
  userId: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const name = `avatar-${Date.now()}.${ext}`
  const path = `${userId}/${name}`
  const { error } = await supabase.storage.from('avatars').upload(path, bytes, { contentType })
  if (error) throw error

  // Best effort: a leftover old photo is harmless.
  const { data: existing } = await supabase.storage.from('avatars').list(userId)
  const stale = (existing ?? []).filter((f) => f.name !== name).map((f) => `${userId}/${f.name}`)
  if (stale.length) await supabase.storage.from('avatars').remove(stale)

  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

/** Remove the profile photo files; the caller clears avatar_url. */
export async function removeAvatarFiles(userId: string): Promise<void> {
  const { data: existing } = await supabase.storage.from('avatars').list(userId)
  const paths = (existing ?? []).map((f) => `${userId}/${f.name}`)
  if (paths.length) await supabase.storage.from('avatars').remove(paths)
}

/**
 * Permanently delete the signed-in user's account and everything linked to it.
 *
 * Required by App Store Review Guideline 5.1.1(v) and the Play equivalent: an
 * app that offers account creation must offer deletion from inside the app.
 * Irreversible — callers must confirm first.
 */
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account')
  if (error) throw error
  // The session now points at a user that no longer exists.
  await supabase.auth.signOut()
}
