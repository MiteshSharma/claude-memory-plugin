import { Row, Col, Card, Progress, Typography, Space, Empty, Spin, Tag } from 'antd'
import { FileOutlined, TagOutlined } from '@ant-design/icons'
import type { PatternItem } from '../api/client'

const { Text, Title } = Typography

function HeatList({ items, label, icon, color }: {
  items: PatternItem[]
  label: string
  icon: React.ReactNode
  color: string
}) {
  if (items.length === 0) return null
  const max = items[0].count

  return (
    <Card
      size="small"
      title={<Space>{icon}<Text strong>{label}</Text></Space>}
      style={{ height: '100%' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item) => (
          <div key={item.value}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 12, maxWidth: '80%' }} ellipsis title={item.value}>
                {item.value.split('/').slice(-2).join('/')}
              </Text>
              <Tag color={color} style={{ fontSize: 11 }}>{item.count}×</Tag>
            </div>
            <Progress
              percent={Math.round((item.count / max) * 100)}
              showInfo={false}
              strokeColor={color}
              size="small"
            />
          </div>
        ))}
      </div>
    </Card>
  )
}

interface Props {
  topFiles: PatternItem[]
  topConcepts: PatternItem[]
  loading: boolean
  project: string | undefined
}

export function PatternsView({ topFiles, topConcepts, loading, project }: Props) {
  if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />
  if (topFiles.length === 0 && topConcepts.length === 0) {
    return <Empty description="No pattern data yet — activities need to be processed first" />
  }

  return (
    <div>
      <Title level={5} style={{ marginTop: 0, marginBottom: 16, color: '#8c8c8c' }}>
        Recurring patterns {project ? `in ${project}` : 'across all projects'}
      </Title>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <HeatList
            items={topFiles}
            label="Hot Files (most modified)"
            icon={<FileOutlined style={{ color: '#fa8c16' }} />}
            color="#fa8c16"
          />
        </Col>
        <Col xs={24} md={12} style={{ marginTop: 16 }}>
          <HeatList
            items={topConcepts}
            label="Top Concepts"
            icon={<TagOutlined style={{ color: '#722ed1' }} />}
            color="#722ed1"
          />
        </Col>
      </Row>
    </div>
  )
}
