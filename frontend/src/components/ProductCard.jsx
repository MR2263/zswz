import { Link } from 'react-router-dom'

export function ProductCard({ product }) {
  return (
    <article className="product-card">
      <div className="product-media">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
        />
        <span className={`stock-badge ${product.stock <= 3 ? 'is-warning' : ''}`}>
          {`\u5e93\u5b58 ${product.stock}`}
        </span>
      </div>
      <div className="product-card-body">
        <div className="product-row">
          <h3>{product.name}</h3>
          <span className="condition-tag">{product.condition}</span>
        </div>
        <p className="product-desc">{product.description}</p>
        <div className="product-row">
          <strong className="price">{`\u00a5${product.price}`}</strong>
          <Link className="link-button" to={`/products/${product.id}`}>
            {'\u67e5\u770b\u8be6\u60c5'}
          </Link>
        </div>
      </div>
    </article>
  )
}
