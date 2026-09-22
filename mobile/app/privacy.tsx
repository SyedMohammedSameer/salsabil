import { useMemo } from 'react'
import { View, Text } from 'react-native'
import { Screen, Muted, Card } from '~/components/ui'
import { PRIVACY_POLICY_MD } from '~/lib/privacyPolicy'

// The privacy policy, rendered in-app from the same markdown the store
// listings use. A tiny renderer: headings, paragraphs, bullets, bold.

type Block =
  | { kind: 'h1' | 'h2' | 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'li'; text: string }

function parse(md: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) {
      blocks.push({ kind: 'p', text: para.join(' ') })
      para = []
    }
  }
  for (const raw of md.split('\n')) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (line.startsWith('### ')) {
      flush()
      blocks.push({ kind: 'h3', text: line.slice(4) })
    } else if (line.startsWith('## ')) {
      flush()
      blocks.push({ kind: 'h2', text: line.slice(3) })
    } else if (line.startsWith('# ')) {
      flush()
      blocks.push({ kind: 'h1', text: line.slice(2) })
    } else if (/^[-*] /.test(line)) {
      flush()
      blocks.push({ kind: 'li', text: line.slice(2) })
    } else {
      para.push(line)
    }
  }
  flush()
  return blocks
}

/** Renders **bold** and _italic_ runs inside a line. */
function Inline({ text, className }: { text: string; className: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean)
  return (
    <Text className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('**')) {
          return (
            <Text key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </Text>
          )
        }
        if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
          return (
            <Text key={i} className="italic text-muted-foreground">
              {part.slice(1, -1)}
            </Text>
          )
        }
        return <Text key={i}>{part}</Text>
      })}
    </Text>
  )
}

export default function PrivacyScreen() {
  const blocks = useMemo(() => parse(PRIVACY_POLICY_MD), [])
  return (
    <Screen>
      <Card className="mb-6 mt-2 gap-2.5">
        {blocks.map((b, i) => {
          switch (b.kind) {
            case 'h1':
              return (
                <Text key={i} className="text-[20px] font-bold tracking-tight text-foreground">
                  {b.text.replace(/^Salsabil — /, '')}
                </Text>
              )
            case 'h2':
              return (
                <Text key={i} className="pt-3 text-[15px] font-semibold text-foreground">
                  {b.text}
                </Text>
              )
            case 'h3':
              return (
                <Text key={i} className="pt-2 text-[13px] font-semibold text-foreground">
                  {b.text}
                </Text>
              )
            case 'li':
              return (
                <View key={i} className="flex-row gap-2 pl-1">
                  <Muted className="text-[13px] leading-5">•</Muted>
                  <Inline text={b.text} className="flex-1 text-[13px] leading-5 text-foreground/85" />
                </View>
              )
            default:
              return <Inline key={i} text={b.text} className="text-[13px] leading-5 text-foreground/85" />
          }
        })}
      </Card>
    </Screen>
  )
}
