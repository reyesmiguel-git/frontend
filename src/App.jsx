import { useEffect, useMemo, useState } from 'react'
import {
  apiRequest,
  clearSession,
  currentUser,
  hasSession,
  login,
  logout,
  saveSession,
} from './api'

const emptyProduct = {
  product_name: '',
  description: '',
  price: '',
  quantity: '',
}

function App() {
  const [authenticated, setAuthenticated] = useState(hasSession())
  const [user, setUser] = useState(currentUser())
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyProduct)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const totalItems = useMemo(
    () => products.reduce((sum, product) => sum + Number(product.quantity || 0), 0),
    [products],
  )

  useEffect(() => {
    if (authenticated) {
      loadProducts()
    }
  }, [authenticated])

  async function loadProducts() {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest('/products')
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err.status === 401) {
        clearSession()
        setAuthenticated(false)
        setUser(null)
        setError('Your session expired. Please log in again.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const formData = new FormData(event.currentTarget)
    const username = formData.get('username')
    const password = formData.get('password')

    try {
      const data = await login(username, password)
      saveSession(data)
      setUser(data.user)
      setAuthenticated(true)
      setMessage('Login successful.')
      event.currentTarget.reset()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function startEdit(product) {
    setEditingId(product.id)
    setForm({
      product_name: product.product_name || '',
      description: product.description || '',
      price: product.price ?? '',
      quantity: product.quantity ?? '',
    })
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyProduct)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const payload = {
      product_name: form.product_name,
      description: form.description,
      price: Number(form.price),
      quantity: Number(form.quantity),
    }

    try {
      if (editingId) {
        await apiRequest(`/products/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        setMessage('Product updated successfully.')
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setMessage('Product added successfully.')
      }

      cancelEdit()
      await loadProducts()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.product_name}"?`)) return

    setLoading(true)
    setMessage('')
    setError('')

    try {
      await apiRequest(`/products/${product.id}`, { method: 'DELETE' })
      setMessage('Product deleted successfully.')
      if (editingId === product.id) cancelEdit()
      await loadProducts()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    setAuthenticated(false)
    setUser(null)
    setProducts([])
    setForm(emptyProduct)
    setEditingId(null)
    setMessage('You have logged out.')
    setError('')
  }

  if (!authenticated) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="eyebrow">Laboratory Exercise No. 6</div>
          <h1>Product Management System</h1>
          <p className="subtext">Sign in to manage the product records.</p>

          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <label>
              Username
              <input name="username" type="text" autoComplete="username" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <p className="demo-note">
            For a fresh database, the migration seeds the demo account configured in the backend environment variables.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">React + LavaLust API</div>
          <h1>Product Management</h1>
        </div>
        <div className="user-actions">
          <span>{user?.username || 'User'}</span>
          <button className="secondary" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <section className="stats">
        <article>
          <span>Products</span>
          <strong>{products.length}</strong>
        </article>
        <article>
          <span>Total Quantity</span>
          <strong>{totalItems}</strong>
        </article>
      </section>

      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <h2>{editingId ? 'Edit Product' : 'Add Product'}</h2>
            <p>{editingId ? 'Update the selected record.' : 'Create a new product record.'}</p>
          </div>
          {editingId && (
            <button className="secondary" type="button" onClick={cancelEdit}>Cancel Edit</button>
          )}
        </div>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        <form className="product-form" onSubmit={handleSubmit}>
          <label>
            Product Name
            <input
              name="product_name"
              value={form.product_name}
              onChange={handleChange}
              maxLength="100"
              required
            />
          </label>

          <label className="wide">
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="3"
            />
          </label>

          <label>
            Price
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Quantity
            <input
              name="quantity"
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={handleChange}
              required
            />
          </label>

          <div className="form-actions wide">
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Product List</h2>
            <p>All CRUD actions below use the protected LavaLust API.</p>
          </div>
          <button className="secondary" onClick={loadProducts} disabled={loading}>Refresh</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Product Name</th>
                <th>Description</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row">
                    {loading ? 'Loading products...' : 'No products found.'}
                  </td>
                </tr>
              ) : products.map((product) => (
                <tr key={product.id}>
                  <td>{product.id}</td>
                  <td>{product.product_name}</td>
                  <td>{product.description || '—'}</td>
                  <td>₱{Number(product.price || 0).toFixed(2)}</td>
                  <td>{product.quantity}</td>
                  <td>{product.created_at || '—'}</td>
                  <td className="actions">
                    <button className="secondary small" onClick={() => startEdit(product)}>Edit</button>
                    <button className="danger small" onClick={() => handleDelete(product)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default App
