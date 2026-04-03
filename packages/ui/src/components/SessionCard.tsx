import { Card, Tag, Typography, Descriptions, Space, Collapse, Badge } from 'antd'
import {
  CheckCircleFilled,
  SyncOutlined,
  WarningFilled,
  FileTextOutlined,
  BulbOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import type { Session } from '../api/client'

const { Text, Paragraph } = Typography

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  active: { color: 'processing', icon: <SyncOutlined spin /> },
  completed: { color: 'success', icon: <CheckCircleFilled /> },
  failed: { color: 'error', icon: <WarningFilled /> },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function SummarySection({ summary }: { summary: NonNullable<Session['summary']> }) {
  const sections = [
    { icon: <FileTextOutlined />, label: 'Request', text: summary.request, color: '#1677ff' },
    { icon: <BulbOutlined />, label: 'Insights', text: summary.insights, color: '#722ed1' },
    { icon: <CheckSquareOutlined />, label: 'Completed', text: summary.completed, color: '#52c41a' },
    ...(summary.pendingWork ? [{ icon: <ClockCircleOutlined />, label: 'Pending', text: summary.pendingWork, color: '#fa8c16' }] : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sections.map(({ icon, label, text, color }) => (
        <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ color, marginTop: 2, flexShrink: 0 }}>{icon}</span>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{label}</Text>
            <Paragraph style={{ marginBottom: 0, fontSize: 13 }} ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>
              {text}
            </Paragraph>
          </div>
        </div>
      ))}
    </div>
  )
}

interface SessionCardProps {
  session: Session
  onSelect?: (sessionId: string) => void
  selected?: boolean
}

export function SessionCard({ session, onSelect, selected }: SessionCardProps) {
  const config = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.active

  return (
    <Card
      size="small"
      style={{
        marginBottom: 8,
        cursor: onSelect ? 'pointer' : undefined,
        border: selected ? '1px solid #1677ff' : undefined,
        background: selected ? '#e6f4ff' : undefined,
      }}
      onClick={() => onSelect?.(session.sessionId)}
      title={
        <Space>
          <Tag icon={config.icon} color={config.color}>{session.status}</Tag>
          <Text strong>{session.project}</Text>
          {session.promptCounter > 0 && (
            <Badge count={session.promptCounter} color="blue" title={`${session.promptCounter} prompts`} />
          )}
        </Space>
      }
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDate(session.createdAt)}
        </Text>
      }
    >
      <Descriptions size="small" column={2} style={{ marginBottom: session.summary ? 8 : 0 }}>
        <Descriptions.Item label="Session">{session.sessionId.slice(0, 12)}…</Descriptions.Item>
        <Descriptions.Item label="Dir" style={{ fontSize: 12 }}>{session.workDir.split('/').slice(-2).join('/')}</Descriptions.Item>
        {session.completedAt && (
          <Descriptions.Item label="Completed">{formatDate(session.completedAt)}</Descriptions.Item>
        )}
      </Descriptions>

      {session.summary && (
        <Collapse
          ghost
          size="small"
          items={[{
            key: 'summary',
            label: <Text type="secondary" style={{ fontSize: 12 }}>AI Summary</Text>,
            children: <SummarySection summary={session.summary} />,
          }]}
        />
      )}
    </Card>
  )
}
