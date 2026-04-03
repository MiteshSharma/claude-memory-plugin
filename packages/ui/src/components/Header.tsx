import { Select, Space, Tag, Typography, Input } from 'antd'
import {
  CheckCircleFilled,
  CloseCircleFilled,
  LoadingOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useStats, useProcessingStatus, useProjects } from '../hooks/useApi'

const { Title } = Typography

interface HeaderProps {
  project: string | undefined
  onProjectChange: (project: string | undefined) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  connected: boolean
  onNavigate: (tab: string) => void
}

export function Header({
  project,
  onProjectChange,
  searchQuery,
  onSearchChange,
  connected,
  onNavigate,
}: HeaderProps) {
  const { data: stats } = useStats()
  const { data: processing } = useProcessingStatus()
  const { data: projectsData } = useProjects()

  const projects = projectsData?.projects ?? []

  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size="middle">
          <Title level={4} style={{ margin: 0 }}>
            Claude Plugin Kit
          </Title>
          <Select
            allowClear
            placeholder="All projects"
            style={{ width: 200 }}
            value={project}
            onChange={(val) => onProjectChange(val)}
            options={projects.map((p) => ({ label: p, value: p }))}
          />
        </Space>

        <Space size="middle">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />

          {stats && (
            <Space size="small">
              <Tag
                style={{ cursor: 'pointer' }}
                onClick={() => onNavigate('sessions')}
              >
                {stats.sessions} sessions
              </Tag>
              <Tag
                style={{ cursor: 'pointer' }}
                onClick={() => onNavigate('feed')}
              >
                {stats.activities} activities
              </Tag>
            </Space>
          )}

          {processing?.isProcessing && (
            <Tag icon={<LoadingOutlined spin />} color="processing">
              Processing
            </Tag>
          )}

          {connected ? (
            <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
          ) : (
            <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 16 }} />
          )}
        </Space>
      </div>
    </div>
  )
}
