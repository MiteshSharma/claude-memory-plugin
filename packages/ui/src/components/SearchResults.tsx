import { List, Tag, Typography, Empty } from 'antd'
import type { SearchResult } from '../api/client'

const { Text } = Typography

const TYPE_COLORS: Record<string, string> = {
  activity: 'blue',
  summary: 'green',
  prompt: 'orange',
  feature: 'blue',
  bugfix: 'red',
  decision: 'purple',
  refactor: 'orange',
  discovery: 'green',
  change: 'default',
}

export function SearchResults({ results, query }: { results: SearchResult[]; query: string }) {
  if (results.length === 0) {
    return <Empty description={`No results for "${query}"`} />
  }

  return (
    <List
      size="small"
      dataSource={results}
      renderItem={(item) => (
        <List.Item>
          <List.Item.Meta
            title={
              <>
                <Tag color={TYPE_COLORS[item.type] ?? 'default'}>{item.type}</Tag>
                <Text>{item.title ?? 'Untitled'}</Text>
              </>
            }
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.project} · {new Date(item.createdAt).toLocaleDateString()}
                {item.score ? ` · score: ${item.score.toFixed(2)}` : ''}
              </Text>
            }
          />
        </List.Item>
      )}
    />
  )
}
