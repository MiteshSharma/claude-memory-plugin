import { useState } from 'react'
import {
  Card, Tag, Typography, Space, Empty, Spin, Progress, Button,
  Row, Col, Statistic, Popconfirm, Select, Tooltip,
} from 'antd'
import {
  DeleteOutlined, InboxOutlined, ExperimentOutlined,
  BulbOutlined, TrophyOutlined, FieldTimeOutlined, PlusOutlined,
} from '@ant-design/icons'
import {
  useLearnings, useLearningStats, useArchiveLearning,
  useDeleteLearning, useDecayLearnings,
} from '../hooks/useApi'
import { CreateLearningModal } from './CreateLearningModal'
import type { Learning } from '../api/client'

const { Text, Title } = Typography

const CATEGORY_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  coding:       { color: '#1677ff', icon: <ExperimentOutlined /> },
  tooling:      { color: '#52c41a', icon: <ExperimentOutlined /> },
  architecture: { color: '#722ed1', icon: <BulbOutlined /> },
  debugging:    { color: '#fa541c', icon: <ExperimentOutlined /> },
  review:       { color: '#eb2f96', icon: <ExperimentOutlined /> },
  workflow:     { color: '#faad14', icon: <FieldTimeOutlined /> },
}

function ConfidenceBar({ value }: { value: number }) {
  const percent = Math.min(100, Math.round((value / 5) * 100))
  const color = value >= 3 ? '#52c41a' : value >= 1.5 ? '#1677ff' : '#d9d9d9'
  return (
    <Tooltip title={`Confidence: ${value.toFixed(1)} — observed ${Math.ceil(value / 0.8)} times`}>
      <Progress percent={percent} showInfo={false} strokeColor={color} size="small" style={{ width: 80 }} />
    </Tooltip>
  )
}

function LearningCard({ learning, onArchive, onDelete }: {
  learning: Learning
  onArchive: (id: number) => void
  onDelete: (id: number) => void
}) {
  const cfg = CATEGORY_CONFIG[learning.category] ?? CATEGORY_CONFIG.coding
  const lastSeen = new Date(learning.lastSeenAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const firstSeen = new Date(learning.firstSeenAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <Card
      size="small"
      style={{ marginBottom: 8, opacity: learning.archived ? 0.5 : 1 }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Space size={6} style={{ marginBottom: 6 }}>
            <Tag color={cfg.color} style={{ fontSize: 11 }}>{learning.category}</Tag>
            <ConfidenceBar value={learning.confidence} />
            <Text type="secondary" style={{ fontSize: 11 }}>{learning.evidenceCount} sessions</Text>
            {learning.archived && <Tag color="default">archived</Tag>}
          </Space>
          <div style={{ marginBottom: 6 }}>
            <Text strong>{learning.pattern}</Text>
          </div>
          <Space size={4} wrap>
            {learning.topics.map((t) => (
              <Tag key={t} style={{ fontSize: 11, margin: 0 }}>{t}</Tag>
            ))}
          </Space>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Key: <code style={{ fontSize: 10 }}>{learning.canonicalKey}</code> &middot; First: {firstSeen} &middot; Last: {lastSeen}
            </Text>
          </div>
        </div>
        <Space direction="vertical" size={4}>
          {!learning.archived && (
            <Tooltip title="Archive">
              <Button size="small" icon={<InboxOutlined />} onClick={() => onArchive(learning.id)} />
            </Tooltip>
          )}
          <Popconfirm title="Delete this learning permanently?" onConfirm={() => onDelete(learning.id)} okText="Delete" okType="danger">
            <Tooltip title="Delete">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      </div>
    </Card>
  )
}

export function LearningsView() {
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined)
  const [showArchived, setShowArchived] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const { data, isLoading } = useLearnings({ category: categoryFilter, includeArchived: showArchived })
  const { data: stats } = useLearningStats()
  const archiveMutation = useArchiveLearning()
  const deleteMutation = useDeleteLearning()
  const decayMutation = useDecayLearnings()

  const learnings = data?.learnings ?? []

  // Group by category
  const grouped = new Map<string, Learning[]>()
  for (const l of learnings) {
    const group = grouped.get(l.category) ?? []
    group.push(l)
    grouped.set(l.category, group)
  }

  if (isLoading) return <Spin style={{ display: 'block', margin: '40px auto' }} />

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Learnings" value={stats?.total ?? 0} prefix={<TrophyOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Avg Confidence" value={stats?.avgConfidence ?? 0} precision={1} prefix={<BulbOutlined />} />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="By Category" styles={{ body: { padding: '8px 12px' } }}>
            <Space wrap>
              {Object.entries(stats?.byCategory ?? {}).map(([cat, count]) => {
                const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.coding
                return <Tag key={cat} color={cfg.color}>{cat}: {count}</Tag>
              })}
              {Object.keys(stats?.byCategory ?? {}).length === 0 && <Text type="secondary">No learnings yet</Text>}
            </Space>
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
          Add Learning
        </Button>
        <Select
          allowClear
          placeholder="All categories"
          style={{ width: 180 }}
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={['coding', 'tooling', 'architecture', 'debugging', 'review', 'workflow'].map((c) => ({
            value: c, label: <Space>{CATEGORY_CONFIG[c]?.icon}<span>{c}</span></Space>,
          }))}
        />
        <Button
          size="small"
          type={showArchived ? 'primary' : 'default'}
          ghost={showArchived}
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? 'Hide Archived' : 'Show Archived'}
        </Button>
        <Popconfirm
          title="Run confidence decay on stale learnings (>6 months unseen)?"
          onConfirm={() => decayMutation.mutate()}
          okText="Run Decay"
        >
          <Button size="small" loading={decayMutation.isPending}>Decay Stale</Button>
        </Popconfirm>
      </Space>

      {learnings.length === 0 ? (
        <Empty
          description={
            <span>
              No learnings yet. Click <strong>Add Learning</strong> to create one manually,
              or use Claude Code for a few sessions — learnings are extracted automatically from session summaries.
            </span>
          }
        />
      ) : categoryFilter ? (
        // Flat list when filtered
        learnings.map((l) => (
          <LearningCard
            key={l.id}
            learning={l}
            onArchive={(id) => archiveMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))
      ) : (
        // Grouped by category
        Array.from(grouped.entries()).map(([category, items]) => {
          const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.coding
          return (
            <div key={category} style={{ marginBottom: 20 }}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                <Space>{cfg.icon}<span style={{ color: cfg.color }}>{category}</span></Space>
                <Tag style={{ marginLeft: 8 }}>{items.length}</Tag>
              </Title>
              {items.map((l) => (
                <LearningCard
                  key={l.id}
                  learning={l}
                  onArchive={(id) => archiveMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          )
        })
      )}

      <CreateLearningModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </div>
  )
}
