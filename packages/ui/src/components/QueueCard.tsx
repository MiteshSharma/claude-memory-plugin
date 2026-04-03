import { Card, Tag, Typography, Space, Descriptions } from 'antd'
import {
  ClockCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import type { QueueItem } from '../api/client'

const { Text } = Typography

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: { color: 'default', icon: <ClockCircleOutlined /> },
  processing: { color: 'processing', icon: <SyncOutlined spin /> },
  failed: { color: 'error', icon: <CloseCircleOutlined /> },
}

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function QueueCard({ item }: { item: QueueItem }) {
  const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending

  return (
    <Card
      size="small"
      style={{ marginBottom: 8 }}
      title={
        <Space>
          <Tag icon={config.icon} color={config.color}>
            {item.status}
          </Tag>
          <Text strong>{item.toolName ?? item.messageType}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>#{item.id}</Text>
        </Space>
      }
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatTime(item.createdAt)}
        </Text>
      }
    >
      <Descriptions size="small" column={2}>
        <Descriptions.Item label="Session">{item.sessionId.slice(0, 16)}...</Descriptions.Item>
        <Descriptions.Item label="Type">{item.messageType}</Descriptions.Item>
        <Descriptions.Item label="Retries">{item.retryCount}</Descriptions.Item>
        {item.claimedAt && (
          <Descriptions.Item label="Claimed">{formatTime(item.claimedAt)}</Descriptions.Item>
        )}
      </Descriptions>
      {item.errorMessage && (
        <div style={{ marginTop: 8 }}>
          <Text type="danger" style={{ fontSize: 12 }}>{item.errorMessage}</Text>
        </div>
      )}
    </Card>
  )
}
