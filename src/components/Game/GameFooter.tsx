import { SiLinkedin, SiGithub } from 'react-icons/si';

export function GameFooter() {
  return (
    <footer className="p-4 text-center text-xs text-text-muted space-y-2">
      <p>Delve deeper, think smarter</p>
      <div className="flex items-center justify-center gap-4">
        <a href="https://www.linkedin.com/in/ozgur-baserdem/" target="_blank" rel="noopener noreferrer" className="hover:text-[#ffd700] transition-colors">
          <SiLinkedin size={16} />
        </a>
        <a href="https://github.com/ozgurbaserdem/gunud" target="_blank" rel="noopener noreferrer" className="hover:text-[#ffd700] transition-colors">
          <SiGithub size={16} />
        </a>
      </div>
    </footer>
  );
}
