import ballIcon from '@/assets/bola_verde.svg';

interface BallLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  variant?: 'green' | 'white';
}

const BallLoader = ({ size = 'md', message, variant = 'green' }: BallLoaderProps) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  
  const variantClasses = {
    green: '',
    white: 'brightness-0 invert',
  };
  
  return (
    <div className="flex flex-col items-center justify-center">
      <img 
        src={ballIcon} 
        alt="" 
        className={`${sizeClasses[size]} ${variantClasses[variant]} animate-spin-ball`} 
      />
      {message && (
        <p className="text-muted-foreground mt-4">{message}</p>
      )}
    </div>
  );
};

export default BallLoader;
