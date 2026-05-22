import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Copy, PackageOpen } from 'lucide-react'
import { api } from '../api'
import { fallbackProducts } from '../fallbackProducts'
import { useTrackPageView } from '../hooks'

const TIP_TEXT = '\u8be5\u7f51\u9875\u4ec5\u5c55\u793a\u7269\u54c1\u4fe1\u606f\u4ee5\u53ca\u5e93\u5b58\u591a\u5c11\uff0c\u5177\u4f53\u8d2d\u4e70\u8bf7\u8054\u7cfbQQ\uff1a225494936\uff0c\u6682\u65f6\u53ea\u652f\u6301\u4e00\u56ed\u533a\u81ea\u63d0'

export function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading')

  useTrackPageView(`/products/${id}`, id)

  useEffect(() => {
    api.get(`/public/products/${id}`)
      .then((response) => {
        setProduct(response.data)
        document.title = `${response.data.name} - \u95f2\u7f6e\u597d\u7269\u5c55\u793a\u7ad9`
        setStatus('ready')
      })
      .catch(() => {
        const fallbackProduct = fallbackProducts.find((item) => String(item.id) === String(id))
        if (fallbackProduct) {
          setProduct(fallbackProduct)
          document.title = `${fallbackProduct.name} - \u95f2\u7f6e\u597d\u7269\u5c55\u793a\u7ad9`
          setStatus('ready')
          return
        }
        setStatus('missing')
      })
  }, [id])

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({
        title: product.name,
        text: `${product.name} | \u4ef7\u683c ${product.price} | \u5e93\u5b58 ${product.stock}`,
        url,
      }).catch(() => {})
      return
    }

    await navigator.clipboard.writeText(url)
    window.alert('\u94fe\u63a5\u5df2\u590d\u5236')
  }

  if (status === 'loading') {
    return <div className="detail-shell"><div className="empty-state">{'\u6b63\u5728\u52a0\u8f7d\u5546\u54c1\u8be6\u60c5...'}</div></div>
  }

  if (status === 'missing') {
    return <div className="detail-shell"><div className="empty-state">{'\u672a\u627e\u5230\u8be5\u5546\u54c1'}</div></div>
  }

  return (
    <div className="detail-shell">
      <Link className="back-link" to="/">{'\u8fd4\u56de\u5546\u54c1\u5217\u8868'}</Link>
      <div className="detail-layout">
        <img src={product.imageUrl} alt={product.name} className="detail-image" />
        <div className="detail-panel">
          <span className="detail-category">{product.categoryName}</span>
          <h1>{product.name}</h1>
          <p className="detail-price">{`\u00a5${product.price}`}</p>
          <p className="detail-text">{product.description}</p>
          <div className="detail-meta">
            <span>{`\u6210\u8272\uff1a${product.condition}`}</span>
            <span className={product.stock <= 3 ? 'warning-text' : ''}>
              <PackageOpen size={16} />
              {`\u5e93\u5b58\uff1a${product.stock}`}
            </span>
          </div>
          <div className="tip-box">{TIP_TEXT}</div>
          <button type="button" className="primary-button" onClick={handleShare}>
            <Copy size={16} />
            {'\u5206\u4eab\u8be5\u5546\u54c1'}
          </button>
        </div>
      </div>
    </div>
  )
}
