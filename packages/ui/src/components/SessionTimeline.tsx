import { Timeline, Tag, Typography, Space, Spin, Empty, Collapse } from 'antd'
import {
  MessageOutlined,
  CodeOutlined,
  BugOutlined,
  BulbOutlined,
  ToolOutlined,
  ExperimentOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import type { TimelineItem } from '../api/client'

const { Text, Paragraph } = Typography

const ACTIVITY_TYPE_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  feature:   { color: '#1677ff', icon: <CodeOutlined /> },
  bugfix:    { color: '#f5222d', icon: <BugOutlined /> },
  decision:  { color: '#722ed1', icon: <BulbOutlined /> },
  refactor:  { color: '#fa8c16', icon: <ToolOutlined /> },
  discovery: { color: '#52c41a', icon: <ExperimentOutlined /> },
  change:    { color: '#8c8c8c', icon: <SwapOutlined /> },
}

function parseJsonArray(val: string): string[] {
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function formatTime(val: string | number): string {
  const d = typeof val === 'number' ? new Date(val) : new Date(val)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function PromptNode({ item }: { item: Extract<TimelineItem, { kind: 'prompt' }> }) {
  return (
    <div>
      <Space style={{ marginBottom: 4 }}>
        <Tag icon={<MessageOutlined />} color="blue">Prompt #{item.promptNumber}</Tag>
        <Text type="secondary" style={{ fontSize: 11 }}>{formatTime(item.createdAt)}</Text>
      </Space>
      <Paragraph
        style={{ marginBottom: 0, fontSize: 13, background: '#e6f4ff', padding: '8px 12px', borderRadius: 6 }}
        ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
      >
        {item.promptText}
      </Paragraph>
    </div>
  )
}

function ActivityNode({ item }: { item: Extract<TimelineItem, { kind: 'activity' }> }) {
  const cfg = ACTIVITY_TYPE_CONFIG[item.type] ?? ACTIVITY_TYPE_CONFIG.change
  const facts = parseJsonArray(item.facts)
  const filesRead = parseJsonArray(item.filesRead)
  const filesModified = parseJsonArray(item.filesModified)
  const allFiles = [...new Set([...filesRead, ...filesModified])]

  return (
    <div>
      <Space style={{ marginBottom: 4 }}>
        <Tag color={item.type} style={{ color: cfg.color, borderColor: cfg.color, background: `${cfg.color}15` }}>
          {cfg.icon} {item.type}
        </Tag>
        <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
        <Text type="secondary" style={{ fontSize: 11 }}>{formatTime(item.createdAt)}</Text>
      </Space>
      <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>
        {item.narrative}
      </Paragraph>
      {(facts.length > 0 || allFiles.length > 0) && (
        <Collapse ghost size="small" style={{ marginTop: 4 }} items={[{
          key: 'd',
          label: <Text type="secondary" style={{ fontSize: 11 }}>Details</Text>,
          children: (
            <>
              {facts.length > 0 && (
                <ul style={{ paddingLeft: 16, margin: '4px 0' }}>
                  {facts.map((f, i) => <li key={i}><Text style={{ fontSize: 12 }}>{f}</Text></li>)}
                </ul>
              )}
              {allFiles.length > 0 && (
                <Space wrap style={{ marginTop: 4 }}>
                  {allFiles.map((f, i) => (
                    <Tag key={i} style={{ fontSize: 11 }} color={filesModified.includes(f) ? 'orange' : 'default'}>
                      {f.split('/').slice(-2).join('/')}
                    </Tag>
                  ))}
                </Space>
              )}
            </>
          ),
        }]} />
      )}
    </div>
  )
}

interface Props {
  items: TimelineItem[]
  loading: boolean
  promptCount: number
  activityCount: number
}

export function SessionTimeline({ items, loading, promptCount, activityCount }: Props) {
  if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />
  if (items.length === 0) return <Empty description="No timeline data for this session yet" />

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Tag color="blue">{promptCount} prompts</Tag>
        <Tag color="green">{activityCount} activities</Tag>
      </Space>
      <Timeline
        items={items.map((item) => ({
          color: item.kind === 'prompt' ? '#1677ff' : (ACTIVITY_TYPE_CONFIG[item.type as string]?.color ?? '#8c8c8c'),
          dot: item.kind === 'prompt' ? <MessageOutlined style={{ fontSize: 14 }} /> : undefined,
          children: item.kind === 'prompt'
            ? <PromptNode item={item} />
            : <ActivityNode item={item as Extract<TimelineItem, { kind: 'activity' }>} />,
        }))}
      />
    </div>
  )
}
