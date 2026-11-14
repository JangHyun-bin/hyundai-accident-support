import { publicAsset } from '@/lib/utils'
import './brand.css'

export function BrandLockup() {
  return <span className="brand-lockup" role="img" aria-label="차분">
    <img className="brand-lockup-on-dark" src={publicAsset('brand/lockup-horizontal-inverse.svg')} alt="" width={96} height={32} />
    <img className="brand-lockup-on-light" src={publicAsset('brand/lockup-horizontal-color.svg')} alt="" width={96} height={32} />
  </span>
}
