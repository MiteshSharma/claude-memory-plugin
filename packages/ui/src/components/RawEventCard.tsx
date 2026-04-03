import { Card, Tag, Typography, Collapse } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import type { RawEvent } from '../api/client'

const { Text, Paragraph } = Typography

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatPayload(payload: string): string {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2)
  } catch {
    return payload
  }
}

export function RawEventCard({ event }: { event: RawEvent }) {
  return (
    <Card
      size="small"
      style={{ marginBottom: 8 }}
      title={
        <span>
          <Tag icon={<ThunderboltOutlined />} color="volcano">{event.eventType}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>#{event.id}</Text>
        </span>
      }
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDate(event.createdAt)}
        </Text>
      }
    >
      <Text type="secondary" style={{ fontSize: 12 }}>
        Session: {event.sessionId.slice(0, 16)}...
      </Text>
      <Collapse
        ghost
        size="small"
        items={[
          {
            key: 'payload',
            label: <Text type="secondary">Payload</Text>,
            children: (
              <Paragraph>
                <pre style={{ fontSize: 11, maxHeight: 300, overflow: 'auto', background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                  {formatPayload(event.payload)}
                </pre>
              </Paragraph>
            ),
          },
        ]}
      />
    </Card>
  )
}
