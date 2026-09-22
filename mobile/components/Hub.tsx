import { useEffect, useState, type ReactNode } from 'react'
import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { Segmented } from '~/components/ui'
import { NoorHeaderButton } from '~/components/NavBar'
import { HUB_TABS, type Hub as HubName, type HubTab } from '~/lib/nav'
import { NOOR_PLACEMENT } from '~/lib/noorPlacement'

// A domain hub: a title, an optional trailing element, a segmented control
// and the selected section. Sections are the feature components under
// ~/features, which render their own content and decide their own scrolling.
//
// `?tab=` selects a section from a deep link (see ~/lib/nav.ts); tapping the
// tab bar keeps whatever section was last open.

export function Hub<H extends HubName>({
  name,
  title,
  right,
  labels,
  render,
}: {
  name: H
  title: string
  right?: ReactNode
  labels: Record<HubTab<H>, string>
  render: (tab: HubTab<H>) => ReactNode
}) {
  const tabs = HUB_TABS[name] as readonly HubTab<H>[]
  const params = useLocalSearchParams<{ tab?: string; k?: string }>()
  const [tab, setTab] = useState<HubTab<H>>(tabs[0])

  useEffect(() => {
    const wanted = params.tab as HubTab<H> | undefined
    if (wanted && tabs.includes(wanted)) setTab(wanted)
    // `k` is the nonce that makes a repeated deep link re-apply.
  }, [params.tab, params.k, tabs])

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="gap-3 px-4 pb-3 pt-2">
        <View className="flex-row items-end justify-between gap-3">
          <Text className="text-[28px] font-bold tracking-tight text-foreground">{title}</Text>
          <View className="flex-row items-center gap-2">
            {right}
            {NOOR_PLACEMENT === 'header' ? <NoorHeaderButton /> : null}
          </View>
        </View>
        <Segmented
          options={tabs.map((t) => ({ value: t, label: labels[t] }))}
          value={tab}
          onChange={setTab}
        />
      </View>
      <View className="flex-1" key={tab}>
        {render(tab)}
      </View>
    </SafeAreaView>
  )
}
