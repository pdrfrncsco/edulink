'use client';

import React from 'react';
import { Mail, Search } from 'lucide-react';
import { Button, Input } from '@/components/ui';

interface DirectoryToolbarProps {
  schoolId: string;
  userCount: number;
  searchQuery: string;
  loading: boolean;
  onChangeSearchQuery: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onSendBulkInvites: () => void;
}

/** Header toolbar with bulk `.edu.ao` activation invites and search filter for the directory table. */
export default function DirectoryToolbar({
  schoolId,
  userCount,
  searchQuery,
  loading,
  onChangeSearchQuery,
  onSearchSubmit,
  onSendBulkInvites,
}: DirectoryToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h3 id="directory-table-caption" className="text-base font-bold text-stone-900">
          Directório Académico &amp; Controlo de Matrículas ({userCount})
        </h3>
        <p className="text-xs text-stone-500">
          Suspender uma matrícula revoga automaticamente o acesso Google/Microsoft e invalida o
          Cartão Digital.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!schoolId || loading}
          onClick={onSendBulkInvites}
          leftIcon={<Mail className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Enviar Convites (.edu.ao)
        </Button>
        <search>
          <form onSubmit={onSearchSubmit} className="flex gap-2">
            <label htmlFor="directory-search" className="sr-only">
              Pesquisar utilizador
            </label>
            <Input
              id="directory-search"
              name="search"
              type="search"
              placeholder="Nome, e-mail ou BI..."
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              className="py-1.5"
            />
            <Button
              type="submit"
              variant="outline"
              size="md"
              leftIcon={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Filtrar
            </Button>
          </form>
        </search>
      </div>
    </div>
  );
}
