import { useState } from 'react'
import {
  Modal, Form, Input, Select, Slider, Tag, Space, Typography, Alert,
} from 'antd'
import { useCreateLearning } from '../hooks/useApi'

const { Text } = Typography
const { TextArea } = Input

const CATEGORIES = [
  { value: 'coding', label: 'Coding' },
  { value: 'tooling', label: 'Tooling' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'debugging', label: 'Debugging' },
  { value: 'review', label: 'Review' },
  { value: 'workflow', label: 'Workflow' },
]

const KEY_EXAMPLES: Record<string, string> = {
  coding: 'go/table-driven-tests',
  tooling: 'node/pnpm-workspaces',
  architecture: 'backend/repository-pattern',
  debugging: 'debugging/logs-before-breakpoints',
  review: 'review/check-race-conditions',
  workflow: 'workflow/single-bundled-pr',
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateLearningModal({ open, onClose }: Props) {
  const [form] = Form.useForm()
  const createMutation = useCreateLearning()
  const [topicInput, setTopicInput] = useState('')
  const [topics, setTopics] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const category = Form.useWatch('category', form)

  const handleAddTopic = () => {
    const tag = topicInput.trim().toLowerCase()
    if (tag && !topics.includes(tag) && topics.length < 5) {
      setTopics([...topics, tag])
      setTopicInput('')
    }
  }

  const handleRemoveTopic = (tag: string) => {
    setTopics(topics.filter((t) => t !== tag))
  }

  const handleSubmit = async () => {
    try {
      setError(null)
      const values = await form.validateFields()
      if (topics.length === 0) {
        setError('Add at least one topic tag')
        return
      }
      await createMutation.mutateAsync({
        canonicalKey: values.canonicalKey,
        category: values.category,
        pattern: values.pattern,
        topics,
        confidence: values.confidence ?? 3.0,
      })
      form.resetFields()
      setTopics([])
      setError(null)
      onClose()
    } catch (err) {
      if (err instanceof Error && err.message.includes('409')) {
        setError('A learning with this canonical key already exists')
      } else if (err instanceof Error) {
        setError(err.message)
      }
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setTopics([])
    setError(null)
    onClose()
  }

  return (
    <Modal
      title="Add Global Learning"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="Create Learning"
      confirmLoading={createMutation.isPending}
      width={560}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Add a coding practice, preference, or pattern that should be remembered across all your projects.
      </Text>

      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} style={{ marginBottom: 12 }} />}

      <Form form={form} layout="vertical" initialValues={{ confidence: 3.0, category: 'coding' }}>
        <Form.Item
          name="pattern"
          label="Practice / Pattern"
          rules={[{ required: true, min: 5, message: 'Describe the practice (at least 5 chars)' }]}
        >
          <TextArea
            rows={2}
            placeholder="e.g., Prefers table-driven tests with descriptive subtest names in Go"
          />
        </Form.Item>

        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true }]}
        >
          <Select options={CATEGORIES} />
        </Form.Item>

        <Form.Item
          name="canonicalKey"
          label="Canonical Key"
          rules={[
            { required: true, message: 'Enter a canonical key' },
            { pattern: /^[a-z][a-z0-9/-]*$/, message: 'Lowercase letters, numbers, hyphens, and slashes only' },
            { max: 40, message: 'Max 40 characters' },
          ]}
          help={
            <Text type="secondary" style={{ fontSize: 11 }}>
              Format: topic/short-slug &middot; Example: {KEY_EXAMPLES[category] ?? KEY_EXAMPLES.coding}
            </Text>
          }
        >
          <Input placeholder={KEY_EXAMPLES[category] ?? KEY_EXAMPLES.coding} />
        </Form.Item>

        <Form.Item label="Topics (1-5 tags for relevance matching)">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space wrap>
              {topics.map((t) => (
                <Tag key={t} closable onClose={() => handleRemoveTopic(t)} color="blue">{t}</Tag>
              ))}
            </Space>
            <Input
              placeholder="Type a topic and press Enter (e.g., go, testing, react)"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onPressEnter={(e) => { e.preventDefault(); handleAddTopic() }}
              disabled={topics.length >= 5}
              suffix={<Text type="secondary" style={{ fontSize: 11 }}>{topics.length}/5</Text>}
            />
          </Space>
        </Form.Item>

        <Form.Item
          name="confidence"
          label="Initial Confidence"
          help={
            <Text type="secondary" style={{ fontSize: 11 }}>
              Higher confidence = injected into more sessions. Manual learnings start at 3.0 by default.
              Learnings below 1.5 are not injected into context.
            </Text>
          }
        >
          <Slider min={1} max={5} step={0.5} marks={{ 1: '1.0', 1.5: '1.5', 3: '3.0', 5: '5.0' }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
