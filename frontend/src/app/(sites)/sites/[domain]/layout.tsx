import React from 'react';

export default function SchoolSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {children}
    </div>
  );
}
