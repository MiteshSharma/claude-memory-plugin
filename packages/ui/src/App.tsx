import { useState, useMemo, useEffect } from 'react'
import { Layout, Tabs, Spin, Empty, Space, Tag, Select, Typography } from 'antd'
import { Header } from './components/Header'
import { SessionCard } from './components/SessionCard'
import { ActivityCard } from './components/ActivityCard'
import { PromptCard } from './components/PromptCard'
import { SessionTimeline } from './components/SessionTimeline'
import { PatternsView } from './components/PatternsView'
import { SearchResults } from './components/SearchResults'
import { ContextPreview } from './components/ContextPreview'
import { LearningsView } from './components/LearningsView'
import { RetentionView } from './components/RetentionView'
import {
  useSessions,
  useSearch,
  usePrompts,
  useTimeline,
  usePatterns,
  useProjects,
} from './hooks/useApi'
import { useSSE } from './hooks/useSSE'
import { api } from './api/client'
import { useQuery } from '@tanstack/react-query'

const { Content } = Layout
const { Text } = Typography

export function App() {
  const [project, setProject] = useState<string | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined)
  const [activeTab, setActiveTab] = useState('timeline')
  const { connected } = useSSE()

  // Auto-select first project on load
  const { data: projectsData } = useProjects()
  useEffect(() => {
    if (!project && projectsData?.projects?.length) {
      setProject(projectsData.projects[0])
    }
  }, [projectsData, project])

  const { data: sessionsData, isLoading: sessionsLoading } = useSessions(project)

  // Auto-select latest session when sessions load and none is selected
  useEffect(() => {
    if (!selectedSessionId && sessionsData?.sessions?.length) {
      setSelectedSessionId(sessionsData.sessions[0].sessionId)
    }
  }, [sessionsData, selectedSessionId])
  const { data: searchData, isLoading: searchLoading } = useSearch(searchQuery, project)
  const { data: promptsData, isLoading: promptsLoading } = usePrompts(project, selectedSessionId)
  const { data: timelineData, isLoading: timelineLoading } = useTimeline(selectedSessionId)
  const { data: patternsData, isLoading: patternsLoading } = usePatterns(project)

  const { data: activitiesData } = useQuery({
    queryKey: ['activities-feed', project],
    queryFn: () => api.search.unified('', project, 'activities', 50),
  })

  const sessions = sessionsData?.sessions ?? []
  const searchResults = searchData?.results ?? []
  const prompts = promptsData?.prompts ?? []
  const feedActivities = useMemo(() => activitiesData?.results ?? [], [activitiesData])

  const activityIds = useMemo(() => feedActivities.map((r) => r.id), [feedActivities])
  const { data: detailsData } = useQuery({
    queryKey: ['activity-details', activityIds],
    queryFn: () => api.search.details(activityIds),
    enabled: activityIds.length > 0,
  })
  const activities = detailsData?.activities ?? []

  const isSearching = searchQuery.length > 0

  // Session dropdown options shared across tabs
  const sessionOptions = [
    { value: undefined, label: <Text type="secondary">All sessions</Text> },
    ...sessions.map((s) => ({
      value: s.sessionId,
      label: (
        <Space size={6}>
          <Tag color={s.status === 'active' ? 'processing' : 'default'} style={{ marginRight: 0 }}>
            {s.status}
          </Tag>
          <span style={{ fontWeight: 500 }}>{s.project}</span>
          <span style={{ color: '#8c8c8c', fontSize: 11 }}>
            {s.sessionId.slice(0, 8)}… · {new Date(s.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </Space>
      ),
    })),
  ]

  const SessionFilter = (
    <Select
      allowClear
      placeholder="All sessions"
      style={{ width: '100%', marginBottom: 12 }}
      value={selectedSessionId}
      onChange={(val) => setSelectedSessionId(val)}
      options={sessionOptions}
    />
  )

  const tabItems = [
    {
      key: 'timeline',
      label: 'Timeline',
      children: (
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 16 }}>
            {SessionFilter}
            {!selectedSessionId && (
              <Empty
                description="Select a session above to view its timeline — prompts and activities interleaved chronologically"
                style={{ marginTop: 40 }}
              />
            )}
          </div>
          {selectedSessionId && (
            <SessionTimeline
              items={timelineData?.items ?? []}
              loading={timelineLoading}
              promptCount={timelineData?.promptCount ?? 0}
              activityCount={timelineData?.activityCount ?? 0}
            />
          )}
        </div>
      ),
    },
    {
      key: 'feed',
      label: `Activities (${activities.length})`,
      children: (
        <div style={{ padding: '16px 0' }}>
          {activities.length === 0 ? (
            <Empty description="No activities yet. Start using Claude Code to see activities here." />
          ) : (
            activities.map((a) => <ActivityCard key={a.id} activity={a} />)
          )}
        </div>
      ),
    },
    {
      key: 'patterns',
      label: 'Patterns',
      children: (
        <div style={{ padding: '16px 0' }}>
          <PatternsView
            topFiles={patternsData?.topFiles ?? []}
            topConcepts={patternsData?.topConcepts ?? []}
            loading={patternsLoading}
            project={project}
          />
        </div>
      ),
    },
    {
      key: 'prompts',
      label: `Prompts (${promptsData?.total ?? 0})`,
      children: (
        <div style={{ padding: '16px 0' }}>
          {SessionFilter}
          {promptsLoading ? (
            <Spin />
          ) : prompts.length === 0 ? (
            <Empty description="No user prompts captured yet" />
          ) : (
            prompts.map((p) => <PromptCard key={p.id} prompt={p} hideSession={!!selectedSessionId} />)
          )}
        </div>
      ),
    },
    {
      key: 'sessions',
      label: `Sessions (${sessions.length})`,
      children: (
        <div style={{ padding: '16px 0' }}>
          {sessionsLoading ? (
            <Spin />
          ) : sessions.length === 0 ? (
            <Empty description="No sessions yet" />
          ) : (
            sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onSelect={(id) => { setSelectedSessionId(id); setActiveTab('timeline') }}
                selected={selectedSessionId === s.sessionId}
              />
            ))
          )}
        </div>
      ),
    },
    {
      key: 'context',
      label: 'Context',
      children: (
        <div style={{ padding: '16px 0' }}>
          <ContextPreview project={project} />
        </div>
      ),
    },
    {
      key: 'learnings',
      label: 'Learnings',
      children: (
        <div style={{ padding: '16px 0' }}>
          <LearningsView />
        </div>
      ),
    },
    {
      key: 'retention',
      label: 'Retention',
      children: (
        <div style={{ padding: '16px 0' }}>
          <RetentionView />
        </div>
      ),
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header
        project={project}
        onProjectChange={(p) => { setProject(p); setSelectedSessionId(undefined) }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        connected={connected}
        onNavigate={setActiveTab}
      />
      <Content style={{ padding: '16px 24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {isSearching ? (
          <div>
            {searchLoading ? (
              <Spin style={{ display: 'block', margin: '40px auto' }} />
            ) : (
              <SearchResults results={searchResults} query={searchQuery} />
            )}
          </div>
        ) : (
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        )}
      </Content>
    </Layout>
  )
}
