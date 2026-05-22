import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { api } from '../api'
import { fallbackProducts } from '../fallbackProducts'
import { useTrackPageView } from '../hooks'
import { ProductCard } from '../components/ProductCard'

const TIP_TEXT = '\u8be5\u7f51\u9875\u4ec5\u5c55\u793a\u7269\u54c1\u4fe1\u606f\u4ee5\u53ca\u5e93\u5b58\u591a\u5c11\uff0c\u5177\u4f53\u8d2d\u4e70\u8bf7\u8054\u7cfbQQ\uff1a225494936\uff0c\u6682\u65f6\u53ea\u652f\u6301\u4e00\u56ed\u533a\u81ea\u63d0'

export function StorefrontPage() {
  const [products, setProducts] = useState([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)

  useTrackPageView('/')

  useEffect(() => {
    document.title = '\u7269\u54c1\u5c55\u793a'
    api.get('/public/products')
      .then((response) => {
        setProducts(response.data)
      })
      .catch(() => {
        setProducts(fallbackProducts)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const value = `${product.name}${product.description}`.toLowerCase()
        return !keyword || value.includes(keyword.toLowerCase())
      }),
    [products, keyword],
  )

  return (
    <main className="page-shell storefront-shell">
      <section className="store-notice">
        {TIP_TEXT}
      </section>

      <section className="toolbar storefront-toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={'\u641c\u7d22\u5546\u54c1\u540d\u79f0\u6216\u63cf\u8ff0'}
          />
        </label>
      </section>

      <section className="product-grid">
        {loading ? <div className="empty-state">{'\u6b63\u5728\u52a0\u8f7d\u5546\u54c1\u6570\u636e...'}</div> : null}
        {!loading && filteredProducts.length === 0 ? <div className="empty-state">{'\u6ca1\u6709\u627e\u5230\u76f8\u5173\u5546\u54c1'}</div> : null}
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
    </main>
  )
}
