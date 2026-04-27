import logoDark from '../assets/anchored-dark-icon.svg';
import logoLight from '../assets/anchored-light-icon.svg';

export default function BrandLogo({ className = 'logo-icon', alt = 'Anchored logo' }) {
  return (
    <span className={className} aria-label={alt}>
      <img className="logo-img logo-img-dark" src={logoDark} alt={alt} />
      <img className="logo-img logo-img-light" src={logoLight} alt={alt} />
    </span>
  );
}
