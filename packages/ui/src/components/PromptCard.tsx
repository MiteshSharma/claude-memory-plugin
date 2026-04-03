import { Card, Tag, Typography } from 'antd'
import { MessageOutlined } from '@ant-design/icons'
import type { UserPrompt } from '../api/client'

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

export function PromptCard({ prompt, hideSession }: { prompt: UserPrompt; hideSession?: boolean }) {
  return (
    <Card
      size="small"
      style={{ marginBottom: 8 }}
      title={
        <span>
          <Tag icon={<MessageOutlined />} color="blue">Prompt #{prompt.promptNumber}</Tag>
          <Tag color="default">{prompt.project}</Tag>
        </span>
      }
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDate(prompt.createdAt)}
        </Text>
      }
    >
      {!hideSession && (
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
          Session: {prompt.contentSessionId.slice(0, 16)}…
        </Text>
      )}
      <Paragraph
        style={{ marginBottom: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}
        ellipsis={{ rows: 4, expandable: true, symbol: 'more' }}
      >
        {prompt.promptText}
      </Paragraph>
    </Card>
  )
}
