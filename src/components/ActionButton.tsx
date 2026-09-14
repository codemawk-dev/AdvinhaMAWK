import type { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'success' | 'cyan' | 'outline';

interface ActionButtonProps {
  label: string;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  onClick?: () => void;
  className?: string;
}

const VARIANT_STYLES: Record<
  ButtonVariant,
  { className: string; style?: React.CSSProperties; iconColor: string }
> = {
  primary: {
    className:
      'shadow-[0_4px_16px_#FF385C66] text-white font-bold',
    style: {
      backgroundImage:
        'linear-gradient(135deg, #FF385C 0%, #D6294D 100%)',
    },
    iconColor: '#FFFFFF',
  },
  success: {
    className:
      'shadow-[0_4px_16px_#10B98166] text-white font-bold',
    style: {
      backgroundImage:
        'linear-gradient(135deg, #10B981 0%, #0D9668 100%)',
    },
    iconColor: '#FFFFFF',
  },
  cyan: {
    className:
      'shadow-[0_4px_16px_#00E5FF59] text-bg font-extrabold',
    style: {
      backgroundImage:
        'linear-gradient(135deg, #00E5FF 0%, #0080CC 100%)',
    },
    iconColor: '#0B0D12',
  },
  outline: {
    className:
      'bg-surface border border-solid border-border text-text-primary font-semibold',
    iconColor: '#F3F4F6',
  },
};

export function ActionButton({
  label,
  variant = 'primary',
  icon: Icon,
  iconPosition = 'right',
  onClick,
  className = '',
}: ActionButtonProps) {
  const { className: variantClass, style, iconColor } = VARIANT_STYLES[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center w-full py-3.5 px-5 rounded-md gap-2 cursor-pointer transition-all duration-200 hover:brightness-110 active:scale-[0.98] text-sm leading-4.5 ${variantClass} ${className}`}
      style={style}
    >
      {Icon && iconPosition === 'left' && (
        <Icon size={16} color={iconColor} strokeWidth={2.5} />
      )}
      <span>{label}</span>
      {Icon && iconPosition === 'right' && (
        <Icon size={16} color={iconColor} strokeWidth={2.5} />
      )}
    </button>
  );
}
