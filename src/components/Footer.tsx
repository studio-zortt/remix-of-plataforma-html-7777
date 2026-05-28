import rodrigoPhoto from '@/assets/rodrigo-zortt.webp';

const Footer = () => {
  return (
    <footer className="w-full py-3 flex justify-center z-30 relative">
      <a
        href="https://rodrigozortt.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-2 pl-1 pr-4 py-1 rounded-full bg-background/40 backdrop-blur-sm border border-border/80 hover:border-primary transition-colors"
      >
        <span className="w-7 h-7 rounded-full overflow-hidden border border-border/80 group-hover:border-primary transition-colors shrink-0">
          <img
            src={rodrigoPhoto}
            alt="Rodrigo Zortt"
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </span>
        <span className="text-sm text-foreground">
          Desenvolvido por{' '}
          <span className="text-foreground group-hover:text-primary transition-colors">
            Rodrigo Zortt
          </span>
        </span>
      </a>
    </footer>
  );
};

export default Footer;
