import { Card, Statistic, Row, Col, Typography, Empty } from 'antd'
import { useContext, useTokenEconomics } from '../hooks/useApi'

const { Paragraph } = Typography

export function ContextPreview({ project }: { project: string | undefined }) {
  const { data: context } = useContext(project)
  const { data: economics } = useTokenEconomics(project)

  if (!project) {
    return <Empty description="Select a project to preview context" />
  }

  return (
    <div>
      {economics && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Activities" value={economics.activityCount} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Tokens Used" value={economics.tokensUsed} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Read Tokens" value={economics.readTokens} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="ROI" value={economics.roi} suffix="x" />
            </Card>
          </Col>
        </Row>
      )}

      {context && (
        <Card size="small" title="Context Preview">
          <Paragraph>
            <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
              {context.context}
            </pre>
          </Paragraph>
        </Card>
      )}
    </div>
  )
}
