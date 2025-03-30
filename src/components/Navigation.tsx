"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
}

export const Navigation = () => {
  const pathname = usePathname();
  
  const navItems: NavItem[] = [
    { label: 'Grind Calculator', href: '/' },
    { label: 'V60 Brewing Guide', href: '/v60' },
  ];
  
  return (
    <nav className="bg-gray-100 dark:bg-gray-800 py-4 mb-6">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="font-bold text-lg">Coffee Tools</div>
          
          <div className="flex gap-6">
            {navItems.map((item) => {
              const isActive = 
                (item.href === '/' && pathname === '/') || 
                (item.href !== '/' && pathname.startsWith(item.href));
                
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`${
                    isActive 
                      ? 'font-bold text-primary' 
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}; 