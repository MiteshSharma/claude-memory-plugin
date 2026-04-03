import { Card, Tag, Typography, Space, Collapse } from 'antd'
import {
  CodeOutlined,
  BugOutlined,
  BulbOutlined,
  ToolOutlined,
  ExperimentOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import type { Activity } from '../api/client'

const { Text, Paragraph } = Typography

const TYPE_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  feature: { color: 'blue', icon: <CodeOutlined /> },
  bugfix: { color: 'red', icon: <BugOutlined /> },
  decision: { color: 'purple', icon: <BulbOutlined /> },
  refactor: { color: 'orange', icon: <ToolOutlined /> },
  discovery: { color: 'green', icon: <ExperimentOutlined /> },
  change: { color: 'default', icon: <SwapOutlined /> },
}

function parseJsonArray(val: string): string[] {
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ActivityCard({ activity }: { activity: Activity }) {
  const config = TYPE_CONFIG[activity.type] ?? TYPE_CONFIG.change
  const facts = parseJsonArray(activity.facts)
  const files = [
    ...parseJsonArray(activity.filesRead),
    ...parseJsonArray(activity.filesModified),
  ]

  return (
    <Card
      size="small"
      style={{ marginBottom: 8 }}
      title={
        <Space>
          <Tag icon={config.icon} color={config.color}>
            {activity.type}
          </Tag>
          <Text strong>{activity.title}</Text>
        </Space>
      }
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatTime(activity.createdAt)}
        </Text>
      }
    >
      <Paragraph style={{ marginBottom: facts.length > 0 || files.length > 0 ? 8 : 0 }}>
        {activity.narrative}
      </Paragraph>

      {(facts.length > 0 || files.length > 0) && (
        <Collapse
          ghost
          size="small"
          items={[
            {
              key: 'details',
              label: <Text type="secondary">Details</Text>,
              children: (
                <>
                  {facts.length > 0 && (
                    <ul style={{ paddingLeft: 20, margin: '4px 0' }}>
                      {facts.map((f, i) => (
                        <li key={i}>
                          <Text style={{ fontSize: 13 }}>{f}</Text>
                        </li>
                      ))}
                    </ul>
                  )}
                  {files.length > 0 && (
                    <Space wrap style={{ marginTop: 4 }}>
                      {files.map((f, i) => (
                        <Tag key={i} style={{ fontSize: 11 }}>
                          {f}
                        </Tag>
                      ))}
                    </Space>
                  )}
                </>
              ),
            },
          ]}
        />
      )}
    </Card>
  )
}
