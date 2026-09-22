import { Hub } from '~/components/Hub'
import { Muted } from '~/components/ui'
import { useDeviceLocation } from '~/lib/location'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import PrayersContent from '~/features/prayers'
import QuranContent from '~/features/quran'
import AdhkarContent from '~/features/adhkar'

// Deen: the worship hub. Prayers, Quran and Adhkar are sections of one
// place rather than three entries in a menu.

export default function DeenHub() {
  const { coords } = useDeviceLocation()
  const { data: times } = usePrayerTimes(coords)

  return (
    <Hub
      name="deen"
      title="Deen"
      right={
        times ? (
          <Muted className="pb-1.5 text-xs">
            {times.hijri.date} {times.hijri.month.en}
          </Muted>
        ) : undefined
      }
      labels={{ prayers: 'Prayers', quran: 'Quran', adhkar: 'Adhkar' }}
      render={(tab) =>
        tab === 'prayers' ? <PrayersContent /> : tab === 'quran' ? <QuranContent /> : <AdhkarContent />
      }
    />
  )
}
