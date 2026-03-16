
import React from 'react';

interface TopicNavigatorProps {
  groups: string[];
  activeGroupId: string | null;
}

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const shortenTitle = (title: string): string => {
    const match = title.match(/^(\d[\d.]*)\s*-\s*([^\s]+)/);
    if (match) {
        let word = match[2].replace(/[.,]$/, '');
        return `${match[1]}. ${word}`;
    }
    if (title.length > 20) {
        return title.substring(0, 18) + '...';
    }
    return title;
};


const TopicNavigator: React.FC<TopicNavigatorProps> = ({ groups, activeGroupId }) => {
    
    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
        e.preventDefault();
        const element = document.getElementById(slug);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <aside className="hidden lg:block absolute top-0 right-0 w-52 h-full">
            <nav className="sticky top-24 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-sm mb-3 text-gray-800 dark:text-gray-200">Navegação Rápida</h4>
                <ul className="space-y-2">
                    {groups.map((title) => {
                        const slug = slugify(title);
                        const isActive = activeGroupId === slug;
                        return (
                            <li key={slug}>
                                <a 
                                    href={`#${slug}`} 
                                    onClick={(e) => handleLinkClick(e, slug)}
                                    className={`block text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                                        isActive 
                                        ? 'bg-indigo-600 text-white shadow-sm' 
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {shortenTitle(title)}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
};

export default TopicNavigator;
