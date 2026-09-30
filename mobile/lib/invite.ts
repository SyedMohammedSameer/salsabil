import * as Linking from 'expo-linking'
import { env } from '@/lib/platform/env'
import type { StudyRoom } from '@/lib/database.types'

// Study room invites. Two links go out with every invite:
//
//   * salsabil://join/<code>  opens the room in the app, if it is installed
//   * <site>/join/<room id>   the web app's own invite route, which works for
//                             anyone, and is tappable in every messenger
//                             (many do not linkify custom schemes)
//
// The code is included too, for typing into Rooms by hand.

export function inviteMessage(room: Pick<StudyRoom, 'id' | 'name' | 'code'>): string {
  const appLink = Linking.createURL(`/join/${room.code}`)
  const webLink = env.apiBaseUrl ? `${env.apiBaseUrl.replace(/\/$/, '')}/join/${room.id}` : null
  return [
    `Join my study room "${room.name}" on Salsabil.`,
    `Code: ${room.code}`,
    `Open in the app: ${appLink}`,
    webLink ? `Or on the web: ${webLink}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}
