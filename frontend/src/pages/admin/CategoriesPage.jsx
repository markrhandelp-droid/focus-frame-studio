import { useState } from 'react'
import { Button, Card, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import CategoryFormModal from '../../components/CategoryFormModal.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { EmptyState, PageHeader } from '../../components/ui.jsx'
import { useAdminData } from '../../context/AdminDataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { money, number } from '../../utils/format'

export default function CategoriesPage() {
  const { categories, saveCategory, deleteCategory } = useAdminData()
  const notify = useToast()
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function handleSave(data) {
    const saved = await saveCategory(editing.id, data)
    notify(editing.id ? `Category renamed to ${saved.name}.` : `Category ${saved.name} created.`)
    setEditing(null)
  }

  async function handleDelete() {
    try {
      await deleteCategory(deleting.id)
      notify(`Category ${deleting.name} deleted.`)
    } catch (error) {
      notify(error.message, 'danger')
    }
    setDeleting(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Categories"
        subtitle="Every product belongs to exactly one category."
        actions={
          <Button onClick={() => setEditing({})} className="d-inline-flex align-items-center gap-2">
            <Icon name="plus" size={16} /> New category
          </Button>
        }
      />

      {categories.length === 0 ? (
        <Card><EmptyState icon="tag" title="No categories yet">Create one before adding equipment.</EmptyState></Card>
      ) : (
        <Row xs={1} sm={2} xl={3} className="g-3">
          {categories.map((category) => (
            <Col key={category.id}>
              <Card className="h-100 category-card">
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <h2 className="h6 mb-1">{category.name}</h2>
                      <p className="small text-body-secondary mb-3">{category.description || 'No description'}</p>
                    </div>
                    <span className="stat-icon"><Icon name="tag" size={16} /></span>
                  </div>
                  <Row className="g-2 text-center small mt-auto">
                    <Col><div className="mini-stat"><b>{category.productCount}</b><span>items</span></div></Col>
                    <Col><div className="mini-stat"><b>{number.format(category.units)}</b><span>units</span></div></Col>
                    <Col><div className="mini-stat"><b>{money.format(category.value)}</b><span>value</span></div></Col>
                  </Row>
                </Card.Body>
                <Card.Footer className="d-flex gap-2 bg-transparent">
                  <Button as={Link} to={`/admin/inventory?category=${category.id}`} size="sm" variant="link" className="me-auto px-0">View items</Button>
                  <Button size="sm" variant="outline-primary" onClick={() => setEditing(category)}>Edit</Button>
                  <Button size="sm" variant="outline-danger" onClick={() => setDeleting(category)}
                    disabled={category.productCount > 0} title={category.productCount > 0 ? 'Move or delete its products first' : undefined}>
                    Delete
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {editing && <CategoryFormModal category={editing} onSave={handleSave} onClose={() => setEditing(null)} />}
      <ConfirmDialog show={Boolean(deleting)} title="Delete category?" confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleting(null)}>
        <p className="mb-0">Delete <strong>{deleting?.name}</strong>? This cannot be undone.</p>
      </ConfirmDialog>
    </>
  )
}
