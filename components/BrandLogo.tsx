import Image from 'next/image';

type BrandLogoProps = {
  withText?: boolean;
  className?: string;
  textClassName?: string;
  imageClassName?: string;
  size?: number;
};

export default function BrandLogo({
  withText = true,
  className = '',
  textClassName = '',
  imageClassName = '',
  size = 50
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/logo101.png"
        alt="InvoiceFlow logo"
        width={size}
        height={size}
        className={`rounded-md object-cover ${imageClassName}`}
        priority
      />
      {withText ? <span className={textClassName}>InvoiceFlow</span> : null}
    </span>
  );
}
