import { useState } from 'react'
import {
  Card, Typography, Space, Spin, Button, Tag, Popconfirm,
  Row, Col, Statistic, Descriptions, Alert,
} from 'antd'
import {
  ClockCircleOutlined, DeleteOutlined, DatabaseOutlined,
  CheckCircleOutlined, HourglassOutlined,
} from '@ant-design/icons'
import { useRetentionStats, useRetentionConfig, useTriggerCleanup } from '../hooks/useApi'
import type { CleanupReport } from '../api/client'

const { Text, Title } = Typography

const TABLE_LABELS: Record<string, string> = {
  raw_events: 'Raw Events',
  pending_messages: 'Queue Items',
  activities: 'Activities',
  user_prompts: 'User Prompts',
  sessions: 'Sessions',
  session_summaries: 'Summaries',
  global_learnings: 'Global Learnings',
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)}h ago`
  return `${Math.round(diff / 86400_000)}d ago`
}

export function RetentionView() {
  const { data: stats, isLoading: statsLoading } = useRetentionStats()
  const { data: config, isLoading: configLoading } = useRetentionConfig()
  const cleanupMutation = useTriggerCleanup()
  const [lastReport, setLastReport] = useState<CleanupReport | null>(null)

  if (statsLoading || configLoading) return <Spin style={{ display: 'block', margin: '40px auto' }} />

  const tables = stats?.tables ?? []
  const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0)

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Rows" value={totalRows} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Tables" value={tables.length} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Last Cleanup"
              value={formatRelativeTime(stats?.lastCleanupAt ?? null)}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Next Cleanup"
              value={formatRelativeTime(stats?.nextCleanupAt ?? null)}
              prefix={<HourglassOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<Space><DatabaseOutlined /><Text strong>Data by Table</Text></Space>}
        size="small"
        style={{ marginBottom: 16 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tables.map((t) => {
            const label = TABLE_LABELS[t.name] ?? t.name
            const isForever = t.ttlDays === null
            return (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Text style={{ width: 160, fontWeight: 500 }}>{label}</Text>
                <Tag style={{ minWidth: 60, textAlign: 'center' }}>{t.rowCount.toLocaleString()} rows</Tag>
                {isForever ? (
                  <Tag color="green" icon={<ClockCircleOutlined />}>Forever</Tag>
                ) : (
                  <Tag color="blue" icon={<ClockCircleOutlined />}>{t.ttlDays}d TTL</Tag>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {config && (
        <Card
          title={<Space><ClockCircleOutlined /><Text strong>Retention Configuration</Text></Space>}
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Raw Events">{config.rawEventsDays} days</Descriptions.Item>
            <Descriptions.Item label="Queue Items">{config.pendingMessagesDays} days</Descriptions.Item>
            <Descriptions.Item label="Activities">{config.activitiesDays} days</Descriptions.Item>
            <Descriptions.Item label="Prompts">{config.promptsDays} days</Descriptions.Item>
            <Descriptions.Item label="Sessions">{config.sessionsDays} days</Descriptions.Item>
            <Descriptions.Item label="Summaries">{config.summariesDays} days</Descriptions.Item>
            <Descriptions.Item label="Cleanup Interval">{config.cleanupIntervalHours} hours</Descriptions.Item>
            <Descriptions.Item label="Learning Decay">{config.learningDecayMonths} months</Descriptions.Item>
          </Descriptions>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            Configure via environment variables (PLUGIN_RETENTION_*). Restart server to apply changes.
          </Text>
        </Card>
      )}

      <Space direction="vertical" style={{ width: '100%' }}>
        <Popconfirm
          title="Run retention cleanup now? This will delete expired data and promote summaries to learnings."
          onConfirm={async () => {
            const report = await cleanupMutation.mutateAsync()
            setLastReport(report)
          }}
          okText="Run Cleanup"
        >
          <Button
            type="primary"
            icon={<DeleteOutlined />}
            loading={cleanupMutation.isPending}
          >
            Run Cleanup Now
          </Button>
        </Popconfirm>

        {lastReport && (
          <Alert
            type="success"
            showIcon
            closable
            onClose={() => setLastReport(null)}
            message="Cleanup completed"
            description={
              <div>
                <Text type="secondary">
                  {new Date(lastReport.startedAt).toLocaleTimeString()} &mdash; {new Date(lastReport.completedAt).toLocaleTimeString()}
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    {Object.entries(lastReport.deletions)
                      .filter(([, v]) => v > 0)
                      .map(([key, val]) => (
                        <Tag key={key} color="orange">{key}: {val} deleted</Tag>
                      ))}
                    {Object.values(lastReport.deletions).every((v) => v === 0) && (
                      <Text type="secondary">No data expired yet</Text>
                    )}
                  </Space>
                </div>
              </div>
            }
          />
        )}
      </Space>
    </div>
  )
}
